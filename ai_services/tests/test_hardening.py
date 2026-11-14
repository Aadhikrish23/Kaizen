"""Run from ai_services/: python -m unittest discover tests"""
import importlib
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pydantic import ValidationError  # noqa: E402

from app.schemas.coach import ChatMessage  # noqa: E402


class ChatMessageRoleTests(unittest.TestCase):
    def test_user_and_assistant_allowed(self):
        self.assertEqual(ChatMessage(role="user", content="x").role, "user")
        self.assertEqual(ChatMessage(role="assistant", content="x").role, "assistant")

    def test_system_rejected(self):
        with self.assertRaises(ValidationError):
            ChatMessage(role="system", content="x")


class CorsConfigTests(unittest.TestCase):
    def _load(self, value):
        old = os.environ.get("CORS_ORIGINS")
        if value is None:
            os.environ.pop("CORS_ORIGINS", None)
        else:
            os.environ["CORS_ORIGINS"] = value
        try:
            import app.config as config
            return importlib.reload(config).settings.CORS_ORIGINS
        finally:
            if old is None:
                os.environ.pop("CORS_ORIGINS", None)
            else:
                os.environ["CORS_ORIGINS"] = old

    def test_default_has_no_wildcard(self):
        origins = self._load(None)
        self.assertNotIn("*", origins)
        self.assertEqual(len(origins), 4)

    def test_env_override_and_wildcard_dropped(self):
        self.assertEqual(self._load("https://a.example, *,https://b.example"), ["https://a.example", "https://b.example"])


if __name__ == "__main__":
    unittest.main()
