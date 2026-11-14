"""Run from ai_services/: python -m unittest discover tests (no network: the chat call is patched)."""
import asyncio
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.weekly import WeeklyMetricsContext  # noqa: E402
from app.services import weekly_service  # noqa: E402


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


class WeeklyServiceTests(unittest.TestCase):
    def metrics(self, **kw):
        base = dict(start_date="2026-03-02", end_date="2026-03-08", days_with_data=5, avg_calories=2100, workout_count=3, missing=["sleep"])
        base.update(kw)
        return WeeklyMetricsContext(**base)

    def test_prompt_contains_only_known_facts(self):
        text = weekly_service.describe(self.metrics())
        self.assertIn("Average calories: 2100", text)
        self.assertIn("Not logged (do not guess these): sleep", text)
        self.assertNotIn("Average sleep", text)
        self.assertNotIn("Weight change", text)

    def test_uses_model_reply_when_available(self):
        async def fake_chat(messages, temperature):
            self.assertIn("2100", messages[1]["content"])
            return "Solid week. Add a protein snack.", "m1"
        with mock.patch.object(weekly_service, "_chat", fake_chat):
            res = run(weekly_service.get_weekly_insight(None, self.metrics()))
        self.assertEqual((res.category, res.model_used), ("weekly", "m1"))

    def test_heuristic_when_model_unavailable(self):
        async def down(messages, temperature):
            return None, "m1"
        with mock.patch.object(weekly_service, "_chat", down):
            res = run(weekly_service.get_weekly_insight(None, self.metrics()))
            self.assertEqual(res.model_used, "heuristic-coach")
            thin = run(weekly_service.get_weekly_insight(None, self.metrics(days_with_data=1)))
        self.assertIn("Not enough data", thin.insight)


if __name__ == "__main__":
    unittest.main()
