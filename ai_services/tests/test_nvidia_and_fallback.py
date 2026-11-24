"""Run from ai_services/: python -m unittest discover tests (no network; httpx MockTransport and fake providers)."""
import asyncio
import json
import os
import sys
import unittest

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Settings  # noqa: E402
from app.services.llm import FallbackProvider, LLMProvider, NvidiaNimProvider, build_provider  # noqa: E402

MESSAGES = [{"role": "user", "content": "hi"}]


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def ok(text="hello", finish_reason="stop"):
    return httpx.Response(200, json={"choices": [{"message": {"content": text}, "finish_reason": finish_reason}]})


class Recorder:
    """A MockTransport handler that replays a response per model and records every request."""

    def __init__(self, by_model):
        self.by_model = by_model  # {model: Response | Exception}
        self.requests = []

    def __call__(self, request: httpx.Request):
        body = json.loads(request.content or b"{}")
        self.requests.append((request, body))
        outcome = self.by_model.get(body.get("model"), httpx.Response(500))
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def models_called(self):
        return [b["model"] for _, b in self.requests]


def provider(recorder, models=("primary", "backup"), key="k", **kw):
    return NvidiaNimProvider(key, models[0], list(models[1:]), "http://nim.test/v1",
                             transport=httpx.MockTransport(recorder), **kw)


class NvidiaProviderTests(unittest.TestCase):
    def test_success_sends_bearer_key_and_turns_thinking_off(self):
        rec = Recorder({"primary": ok("  hello  ")})
        result = run(provider(rec).chat_with_meta(MESSAGES, temperature=0.2))
        self.assertEqual((result.text, result.provider, result.model), ("hello", "nvidia", "primary"))
        request, body = rec.requests[0]
        self.assertEqual(str(request.url), "http://nim.test/v1/chat/completions")
        self.assertEqual(request.headers["authorization"], "Bearer k")
        self.assertEqual(body["chat_template_kwargs"], {"thinking": False})
        self.assertEqual((body["temperature"], body["stream"], body["messages"]), (0.2, False, MESSAGES))

    def test_no_key_returns_none_without_calling_the_network(self):
        rec = Recorder({})
        self.assertIsNone(run(provider(rec, key="").chat(MESSAGES)))
        self.assertEqual(rec.requests, [])

    def test_inline_reasoning_is_stripped(self):
        rec = Recorder({"primary": ok("<think>plan the answer</think>\nFinal answer")})
        self.assertEqual(run(provider(rec).chat(MESSAGES)), "Final answer")

    def test_falls_back_to_the_next_model_on_failure_and_reports_it(self):
        failures = {
            "http 500": httpx.Response(500),
            "http 404": httpx.Response(404),
            "empty reply": ok("   "),
            "content filter": ok("x", "content_filter"),
            "timeout": httpx.ConnectTimeout("slow"),
        }
        for label, failure in failures.items():
            with self.subTest(failure=label):
                rec = Recorder({"primary": failure, "backup": ok("from backup")})
                result = run(provider(rec).chat_with_meta(MESSAGES))
                self.assertEqual((result.text, result.model), ("from backup", "backup"))
                self.assertEqual(rec.models_called(), ["primary", "backup"])

    def test_failed_model_is_skipped_until_its_cooldown_ends(self):
        now = [1000.0]
        rec = Recorder({"primary": httpx.Response(404), "backup": ok("b")})
        p = provider(rec, clock=lambda: now[0])
        run(p.chat(MESSAGES))
        run(p.chat(MESSAGES))
        # The second call skipped the model that 404ed.
        self.assertEqual(rec.models_called(), ["primary", "backup", "backup"])
        now[0] += 3601  # a 404 is remembered for an hour
        run(p.chat(MESSAGES))
        self.assertEqual(rec.models_called()[-2:], ["primary", "backup"])

    def test_caller_can_ask_for_less_time_but_not_more_than_the_cap(self):
        seen = []

        def handler(request):
            seen.append(request.extensions["timeout"]["read"])
            return ok("fine")

        p = NvidiaNimProvider("k", "primary", [], "http://nim.test/v1", default_timeout=25.0,
                              transport=httpx.MockTransport(handler))
        run(p.chat(MESSAGES, timeout=12.0))
        run(p.chat(MESSAGES, timeout=300.0))
        self.assertEqual(seen, [12.0, 25.0])

    def test_bad_key_and_rate_limit_do_not_try_other_models(self):
        for status in (401, 403, 429):
            with self.subTest(status=status):
                rec = Recorder({"primary": httpx.Response(status), "backup": ok("never")})
                self.assertIsNone(run(provider(rec).chat(MESSAGES)))
                self.assertEqual(rec.models_called(), ["primary"])

    def test_all_models_failing_returns_none(self):
        rec = Recorder({"primary": httpx.Response(500), "backup": httpx.Response(502)})
        self.assertIsNone(run(provider(rec).chat(MESSAGES)))

    def test_when_every_model_is_in_cooldown_they_are_all_tried_again(self):
        rec = Recorder({"primary": httpx.Response(500), "backup": httpx.Response(500)})
        p = provider(rec)
        run(p.chat(MESSAGES))
        rec.by_model = {"primary": ok("recovered"), "backup": httpx.Response(500)}
        self.assertEqual(run(p.chat(MESSAGES)), "recovered")

    def test_health_reports_key_state_and_reachability(self):
        self.assertFalse(run(provider(Recorder({}), key="").check_health())["reachable"])

        def handler(request):
            return httpx.Response(200, json={"data": []}) if request.url.path.endswith("/models") else httpx.Response(404)

        p = NvidiaNimProvider("k", "primary", [], "http://nim.test/v1", transport=httpx.MockTransport(handler))
        self.assertTrue(run(p.check_health())["reachable"])

    def test_api_key_never_appears_in_health_output(self):
        details = run(provider(Recorder({}), key="super-secret-key").check_health())
        self.assertNotIn("super-secret-key", json.dumps(details))


class Fake(LLMProvider):
    def __init__(self, name, reply=None, boom=False, healthy=True):
        self.name, self.model, self.reply, self.boom, self.healthy, self.calls = name, name + "-model", reply, boom, healthy, 0

    async def chat(self, messages, temperature=0.6, json_mode=False, timeout=None):
        self.calls += 1
        if self.boom:
            raise RuntimeError("provider bug")
        return self.reply

    async def check_health(self):
        return {"reachable": self.healthy}


class FallbackProviderTests(unittest.TestCase):
    def test_first_answer_wins_and_later_providers_are_not_called(self):
        a, b = Fake("a", "from a"), Fake("b", "from b")
        result = run(FallbackProvider([a, b]).chat_with_meta(MESSAGES))
        self.assertEqual((result.text, result.provider, result.model), ("from a", "a", "a-model"))
        self.assertEqual(b.calls, 0)

    def test_falls_through_none_and_exceptions_and_names_the_provider_that_answered(self):
        chain = FallbackProvider([Fake("a", None), Fake("b", boom=True), Fake("c", "from c")])
        result = run(chain.chat_with_meta(MESSAGES))
        self.assertEqual((result.text, result.provider), ("from c", "c"))
        self.assertEqual(run(chain.chat(MESSAGES)), "from c")

    def test_nothing_answering_returns_none(self):
        self.assertIsNone(run(FallbackProvider([Fake("a"), Fake("b")]).chat(MESSAGES)))

    def test_health_is_reachable_if_any_provider_is(self):
        health = run(FallbackProvider([Fake("a", healthy=False), Fake("b", healthy=True)]).check_health())
        self.assertTrue(health["reachable"])
        self.assertEqual([c["provider"] for c in health["chain"]], ["a", "b"])
        self.assertFalse(run(FallbackProvider([Fake("a", healthy=False)]).check_health())["reachable"])

    def test_empty_chain_is_rejected(self):
        with self.assertRaises(ValueError):
            FallbackProvider([])

    def test_each_provider_gets_only_the_time_left_in_the_chain_budget(self):
        now = [0.0]

        class Slow(Fake):
            async def chat(self, messages, temperature=0.6, json_mode=False, timeout=None):
                self.timeouts = getattr(self, "timeouts", []) + [timeout]
                now[0] += 15.0  # this provider burns 15 s and gives no answer
                return None

        a, b = Slow("a"), Slow("b")
        chain = FallbackProvider([a, b], total_timeout=40.0, clock=lambda: now[0])
        self.assertIsNone(run(chain.chat(MESSAGES)))
        self.assertEqual((a.timeouts, b.timeouts), ([40.0], [25.0]))

    def test_providers_are_skipped_once_the_budget_is_spent(self):
        now = [0.0]

        class Burner(Fake):
            async def chat(self, messages, temperature=0.6, json_mode=False, timeout=None):
                now[0] += 41.0
                return None

        late = Fake("late", "too late")
        self.assertIsNone(run(FallbackProvider([Burner("a"), late], total_timeout=40.0, clock=lambda: now[0]).chat(MESSAGES)))
        self.assertEqual(late.calls, 0)

    def test_caller_timeout_overrides_the_chain_budget(self):
        seen = []

        class Spy(Fake):
            async def chat(self, messages, temperature=0.6, json_mode=False, timeout=None):
                seen.append(timeout)
                return "ok"

        run(FallbackProvider([Spy("a")], total_timeout=40.0).chat(MESSAGES, timeout=12.0))
        self.assertLessEqual(seen[0], 12.0)


class FactoryTests(unittest.TestCase):
    def cfg(self, **kw):
        c = Settings()
        for k, v in kw.items():
            setattr(c, k, v)
        return c

    def test_fallbacks_are_deduplicated_and_unknown_names_rejected(self):
        chain = build_provider(self.cfg(AI_PROVIDER="nvidia", AI_FALLBACK_PROVIDERS="ollama, nvidia ,ollama"))
        self.assertEqual([p.name for p in chain.providers], ["nvidia", "ollama"])
        with self.assertRaises(ValueError):
            build_provider(self.cfg(AI_PROVIDER="nvidia", AI_FALLBACK_PROVIDERS="nope"))

    def test_nvidia_settings_flow_into_the_provider(self):
        p = build_provider(self.cfg(AI_PROVIDER="nvidia", AI_FALLBACK_PROVIDERS="", NVIDIA_API_KEY="k", NVIDIA_MODEL="m1",
                                    NVIDIA_FALLBACK_MODELS="m2, m1, m3", NVIDIA_BASE_URL="http://gw/v1/"))
        self.assertIsInstance(p, NvidiaNimProvider)
        self.assertEqual((p.models, p.base_url), (["m1", "m2", "m3"], "http://gw/v1"))


if __name__ == "__main__":
    unittest.main()
