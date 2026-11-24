"""The signed-in-user endpoints and the Express client. No network: a fake Express and httpx MockTransport.
Run from ai_services/: python -m unittest discover tests"""
import asyncio
import os
import sys
import unittest

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.assistant.store import sessions  # noqa: E402
from app.core.auth import get_api  # noqa: E402
from app.core.kaizen_api import ApiError, KaizenApi  # noqa: E402
from app.main import app  # noqa: E402
from app.services.llm import set_provider  # noqa: E402
from fake_kaizen import FakeKaizen  # noqa: E402
from test_assistant import Scripted  # noqa: E402


class RouteTests(unittest.TestCase):
    def setUp(self):
        sessions._sessions.clear()
        self.api = FakeKaizen()
        set_provider(Scripted(available=False))  # no model: rules and heuristics only
        app.dependency_overrides[get_api] = lambda: self.api
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        set_provider(None)

    def test_requires_a_bearer_token(self):
        app.dependency_overrides.clear()
        self.assertEqual(self.client.post("/api/me/parse-food", json={"text": "2 eggs"}).status_code, 401)
        self.assertEqual(self.client.get("/api/me/recommendations", headers={"Authorization": "Basic x"}).status_code, 401)

    def test_parse_food_matches_the_database_and_never_invents(self):
        body = self.client.post("/api/me/parse-food", json={"text": "2 eggs and a purple widget"}).json()
        self.assertEqual(body["source"], "fallback")
        egg, widget = body["items"]
        self.assertEqual((egg["source"], egg["nutrition"]["calories"]), ("database", 140))
        self.assertEqual((widget["source"], widget["nutrition"], widget["needsConfirmation"]), ("estimate", None, True))

    def test_parse_food_validates_input(self):
        self.assertEqual(self.client.post("/api/me/parse-food", json={"text": ""}).status_code, 422)
        self.assertEqual(self.client.post("/api/me/parse-food", json={"text": "x" * 501}).status_code, 422)
        self.assertEqual(self.client.post("/api/me/parse-food", json={"text": "eggs", "extra": 1}).status_code, 422)

    def test_recommendations_rank_foods_that_fit_what_is_left(self):
        picks = self.client.get("/api/me/recommendations?limit=2").json()
        self.assertEqual(len(picks), 2)
        self.assertTrue(all(p["calories"] <= 2000 and p["reason"] for p in picks))
        self.assertEqual(self.client.get("/api/me/recommendations?limit=50").status_code, 422)
        self.assertEqual(self.client.get("/api/me/recommendations?date=today").status_code, 422)

    def test_daily_and_weekly_insight_fall_back_honestly(self):
        daily = self.client.get("/api/me/insight/daily").json()
        self.assertEqual((daily["category"], daily["modelUsed"]), ("daily", "heuristic-coach"))
        weekly = self.client.get("/api/me/insight/weekly").json()
        self.assertFalse(weekly["sufficient"])
        self.assertIn("Not enough data", weekly["insight"])
        self.assertEqual(weekly["modelUsed"], "heuristic-fallback")

    def test_assistant_chat_and_reset(self):
        r = self.client.post("/api/me/assistant/chat", json={"message": "drank 500 ml water", "history": [{"role": "user", "content": "hi"}]}).json()
        self.assertEqual((r["status"], r["changed"], r["undoAvailable"]), ("SUCCESS", ["summary", "water"], True))
        self.assertEqual(self.client.post("/api/me/assistant/reset").json(), {"reset": True})
        self.assertIn("nothing to undo", self.client.post("/api/me/assistant/chat", json={"message": "undo"}).json()["reply"])
        self.assertEqual(self.client.post("/api/me/assistant/chat", json={"message": ""}).status_code, 422)
        self.assertEqual(self.client.post("/api/me/assistant/chat", json={"message": "x" * 2001}).status_code, 422)

    def test_express_errors_pass_through_with_their_status(self):
        self.api.fail["GET /summary"] = ApiError(404, "NOT_FOUND", "nope")
        self.assertEqual(self.client.get("/api/me/insight/daily").status_code, 404)
        self.api.fail["GET /summary"] = ApiError(500, "INTERNAL", "stack trace here")
        res = self.client.get("/api/me/insight/daily")
        self.assertEqual(res.status_code, 502)
        self.assertNotIn("stack trace", res.text)  # upstream error text is never forwarded
        self.api.fail["GET /summary"] = ApiError(503, "UPSTREAM_UNAVAILABLE", "down")
        self.assertEqual(self.client.get("/api/me/insight/daily").status_code, 503)


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


class KaizenApiTests(unittest.TestCase):
    def api(self, handler, internal=""):
        return KaizenApi("tok", base_url="http://x.test/api/v1/", internal_token=internal, transport=httpx.MockTransport(handler))

    def test_unwraps_the_envelope_and_sends_the_users_token(self):
        seen = {}

        def handler(request):
            seen.update(url=str(request.url), auth=request.headers["authorization"], internal=request.headers.get("x-kaizen-internal"))
            return httpx.Response(200, json={"success": True, "data": {"a": 1}})

        self.assertEqual(run(self.api(handler).get("/summary", {"date": "2026-03-08"})), {"a": 1})
        self.assertEqual((seen["url"], seen["auth"], seen["internal"]), ("http://x.test/api/v1/summary?date=2026-03-08", "Bearer tok", None))

    def test_internal_secret_header_only_when_configured(self):
        seen = {}
        run(self.api(lambda r: (seen.update(h=r.headers.get("x-kaizen-internal")), httpx.Response(200, json={"success": True, "data": None}))[1], "s3cret-s3cret-s3cret").get("/x"))
        self.assertEqual(seen["h"], "s3cret-s3cret-s3cret")

    def test_error_envelopes_non_json_and_unreachable_hosts(self):
        err = lambda status, body: self.api(lambda r: httpx.Response(status, json=body))  # noqa: E731
        with self.assertRaises(ApiError) as e:
            run(err(400, {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "bad"}}).post("/meals", {}))
        self.assertEqual((e.exception.status, e.exception.code, e.exception.message), (400, "VALIDATION_ERROR", "bad"))
        with self.assertRaises(ApiError) as e:
            run(self.api(lambda r: httpx.Response(502, text="<html>bad gateway</html>")).get("/x"))
        self.assertEqual(e.exception.status, 502)
        with self.assertRaises(ApiError) as e:
            run(self.api(lambda r: httpx.Response(200, json={"success": False})).get("/x"))
        self.assertGreaterEqual(e.exception.status, 200)

        def boom(request):
            raise httpx.ConnectError("refused")

        with self.assertRaises(ApiError) as e:
            run(self.api(boom).get("/x"))
        self.assertEqual((e.exception.status, e.exception.code), (503, "UPSTREAM_UNAVAILABLE"))


if __name__ == "__main__":
    unittest.main()
