"""Run from ai_services/: python -m unittest discover tests (no network; a fake provider is used)."""
import asyncio
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Settings  # noqa: E402
from app.schemas.coach import UserProfileContext  # noqa: E402
from app.services.coach_service import coach_service  # noqa: E402
from app.services.food_parser import ModelOutputError, ProviderUnavailable, parse_food_text, parse_model_output  # noqa: E402
from app.services.llm import (  # noqa: E402
    AnthropicProvider, FallbackProvider, LLMProvider, NvidiaNimProvider, OllamaProvider, OpenAICompatibleProvider,
    build_provider, set_provider,
)


class FakeProvider(LLMProvider):
    name = "fake"
    model = "fake-1"

    def __init__(self, reply=None, healthy=True):
        self.reply = reply
        self.healthy = healthy
        self.calls = []

    async def chat(self, messages, temperature=0.6, json_mode=False, timeout=None):
        self.calls.append({"messages": messages, "json_mode": json_mode, "temperature": temperature})
        return self.reply

    async def check_health(self):
        return {"reachable": self.healthy}


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


class ProviderSelectionTests(unittest.TestCase):
    def cfg(self, **kw):
        c = Settings()
        c.AI_FALLBACK_PROVIDERS = ""  # single provider unless a test asks for a chain
        for k, v in kw.items():
            setattr(c, k, v)
        return c

    def test_ollama_selected_when_asked(self):
        self.assertIsInstance(build_provider(self.cfg(AI_PROVIDER="ollama")), OllamaProvider)

    def test_default_is_nvidia_with_ollama_fallback(self):
        provider = build_provider(Settings())
        self.assertIsInstance(provider, FallbackProvider)
        self.assertIsInstance(provider.providers[0], NvidiaNimProvider)
        self.assertIsInstance(provider.providers[1], OllamaProvider)

    def test_openai_and_anthropic_selected_from_env_values(self):
        p = build_provider(self.cfg(AI_PROVIDER="openai", OPENAI_API_KEY="k", OPENAI_MODEL="m", OPENAI_BASE_URL="http://gw/v1/"))
        self.assertIsInstance(p, OpenAICompatibleProvider)
        self.assertEqual((p.model, p.base_url), ("m", "http://gw/v1"))
        a = build_provider(self.cfg(AI_PROVIDER="Anthropic", ANTHROPIC_API_KEY="k", ANTHROPIC_MODEL="claude-x"))
        self.assertIsInstance(a, AnthropicProvider)
        self.assertEqual(a.model, "claude-x")

    def test_unknown_provider_rejected(self):
        with self.assertRaises(ValueError):
            build_provider(self.cfg(AI_PROVIDER="nope"))

    def test_missing_keys_return_none_without_network(self):
        self.assertIsNone(run(OpenAICompatibleProvider("http://x/v1", "", "m").chat([{"role": "user", "content": "hi"}])))
        self.assertIsNone(run(AnthropicProvider("", "m").chat([{"role": "user", "content": "hi"}])))
        self.assertFalse(run(AnthropicProvider("", "m").check_health())["reachable"])

    def test_anthropic_message_split(self):
        system, turns = AnthropicProvider.split_messages(
            [{"role": "system", "content": "S"}, {"role": "user", "content": "u"}, {"role": "assistant", "content": "a"}], json_mode=True
        )
        self.assertTrue(system.startswith("S"))
        self.assertIn("JSON", system)
        self.assertEqual([t["role"] for t in turns], ["user", "assistant"])


class CoachUsesProviderTests(unittest.TestCase):
    def tearDown(self):
        set_provider(None)

    def test_chat_uses_provider_reply_and_name(self):
        fake = FakeProvider(reply="Eat protein")
        set_provider(fake)
        res = run(coach_service.chat("what should I eat?", profile=UserProfileContext(name="A")))
        self.assertEqual((res.reply, res.model_used, res.source), ("Eat protein", "fake-1", "fake"))
        self.assertEqual(fake.calls[0]["messages"][0]["role"], "system")

    def test_chat_falls_back_when_provider_down(self):
        set_provider(FakeProvider(reply=None))
        res = run(coach_service.chat("what should I eat?"))
        self.assertEqual(res.source, "fallback")


class ParseModelOutputTests(unittest.TestCase):
    GOOD = '{"items":[{"name":"roti","quantity":2,"unit":"piece","grams":null,"confidence":0.9},{"name":"dal","quantity":1,"unit":"cup","confidence":0.8}]}'

    def test_valid_output(self):
        items = parse_model_output(self.GOOD)
        self.assertEqual([i.name for i in items], ["roti", "dal"])
        self.assertIsNone(items[0].grams)

    def test_code_fences_and_bare_list_accepted(self):
        self.assertEqual(len(parse_model_output("```json\n" + self.GOOD + "\n```")), 2)
        self.assertEqual(len(parse_model_output('[{"name":"egg","quantity":2,"unit":"piece","confidence":1}]')), 1)

    def test_malformed_output_rejected(self):
        for bad in ["", "   ", "not json", "{}", '{"items": []}', '{"items": "x"}', '{"items":[{"name":"egg"}]}']:
            with self.assertRaises(ModelOutputError, msg=bad):
                parse_model_output(bad)

    def test_invented_nutrition_is_rejected(self):
        bad = '{"items":[{"name":"egg","quantity":1,"unit":"piece","confidence":1,"calories":70}]}'
        with self.assertRaises(ModelOutputError):
            parse_model_output(bad)

    def test_bounds(self):
        for item in [
            '{"name":"egg","quantity":0,"unit":"piece","confidence":1}',
            '{"name":"egg","quantity":-1,"unit":"piece","confidence":1}',
            '{"name":"egg","quantity":1,"unit":"piece","confidence":2}',
            '{"name":"","quantity":1,"unit":"piece","confidence":1}',
            '{"name":"egg","quantity":1,"unit":"piece","grams":-5,"confidence":1}',
        ]:
            with self.assertRaises(ModelOutputError, msg=item):
                parse_model_output('{"items":[' + item + ']}')
        too_many = '{"items":[' + ",".join(['{"name":"egg","quantity":1,"unit":"piece","confidence":1}'] * 21) + "]}"
        with self.assertRaises(ModelOutputError):
            parse_model_output(too_many)

    def test_parse_food_text_flow(self):
        fake = FakeProvider(reply=self.GOOD)
        items = run(parse_food_text(fake, "2 rotis and 1 cup dal"))
        self.assertEqual(len(items), 2)
        self.assertTrue(fake.calls[0]["json_mode"])
        with self.assertRaises(ProviderUnavailable):
            run(parse_food_text(FakeProvider(reply=None), "2 apples"))
        with self.assertRaises(ModelOutputError):
            run(parse_food_text(FakeProvider(reply="sure! here you go"), "2 apples"))


if __name__ == "__main__":
    unittest.main()
