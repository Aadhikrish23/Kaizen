"""Route tests with a fake provider (skipped when fastapi/httpx are not installed)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi.testclient import TestClient
    from app.main import app
    HAVE_FASTAPI = True
except Exception:  # noqa: BLE001
    HAVE_FASTAPI = False

from test_llm_and_parsing import FakeProvider  # noqa: E402
from app.services.llm import set_provider  # noqa: E402


@unittest.skipUnless(HAVE_FASTAPI, "fastapi not installed")
class RouteTests(unittest.TestCase):
    def tearDown(self):
        set_provider(None)

    def test_health_is_200_and_reports_provider_even_when_down(self):
        set_provider(FakeProvider(healthy=False))
        res = TestClient(app).get("/api/health")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual((body["status"], body["provider"], body["reachable"]), ("healthy", "fake", False))

    def test_parse_food_validation_and_errors(self):
        client = TestClient(app)
        set_provider(FakeProvider(reply='{"items":[{"name":"apple","quantity":2,"unit":"piece","confidence":0.9}]}'))
        ok = client.post("/api/parse-food", json={"text": "2 apples"})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["items"][0]["name"], "apple")
        self.assertEqual(client.post("/api/parse-food", json={"text": ""}).status_code, 422)
        self.assertEqual(client.post("/api/parse-food", json={"text": "x" * 501}).status_code, 422)
        set_provider(FakeProvider(reply="garbage"))
        self.assertEqual(client.post("/api/parse-food", json={"text": "2 apples"}).status_code, 502)
        set_provider(FakeProvider(reply=None))
        self.assertEqual(client.post("/api/parse-food", json={"text": "2 apples"}).status_code, 503)


if __name__ == "__main__":
    unittest.main()
