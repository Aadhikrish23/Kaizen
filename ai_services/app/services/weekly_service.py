from typing import Dict, List, Optional

from ..schemas.coach import InsightResponse, UserProfileContext
from ..schemas.weekly import WeeklyMetricsContext


async def _chat(messages: List[Dict[str, str]], temperature: float) -> "tuple[Optional[str], str]":
    """Return (reply, model_name). Uses the provider abstraction when present, else the legacy Ollama client."""
    try:
        from .llm import get_provider  # provider-neutral layer
    except ImportError:
        from .ollama_client import ollama_client  # legacy path, removed once the provider layer lands
        from ..config import settings
        return await ollama_client.chat(messages, model=settings.OLLAMA_MODEL, temperature=temperature), settings.OLLAMA_MODEL
    provider = get_provider()
    return await provider.chat(messages, temperature=temperature), provider.model


def describe(metrics: WeeklyMetricsContext) -> str:
    """Only the facts we have; absent values are listed as missing, never filled in."""
    lines = [f"Window: {metrics.start_date} to {metrics.end_date}; days with any log: {metrics.days_with_data}."]
    facts = [
        ("Average calories", metrics.avg_calories, "kcal"),
        ("Average protein", metrics.avg_protein_g, "g"),
        ("Average water", metrics.avg_water_ml, "ml"),
        ("Average sleep", metrics.avg_sleep_hours, "h"),
        ("Total training volume", metrics.total_volume_kg, "kg"),
        ("Weight change", metrics.weight_change_kg, "kg"),
    ]
    for label, value, unit in facts:
        if value is not None:
            lines.append(f"{label}: {value} {unit}")
    lines.append(f"Workouts: {metrics.workout_count}")
    if metrics.missing:
        lines.append("Not logged (do not guess these): " + ", ".join(metrics.missing))
    return "\n".join(lines)


def heuristic(metrics: WeeklyMetricsContext) -> str:
    if metrics.days_with_data < 3:
        return "Not enough data for a weekly insight yet. Keep logging meals, water, sleep and workouts."
    if metrics.workout_count == 0:
        return "No workouts were logged this week: schedule one short session to restart the habit."
    return "Consistent logging and training this week: keep the routine steady and review protein and sleep."


async def get_weekly_insight(profile: Optional[UserProfileContext], metrics: WeeklyMetricsContext) -> InsightResponse:
    system = (
        "You are Kaizen AI Coach. Write a 2-3 sentence weekly review from the facts given. "
        "Use ONLY the numbers provided; never invent data for anything listed as not logged. "
        "End with one concrete suggestion for next week. No greeting, no medical advice."
    )
    user = describe(metrics)
    if profile and profile.goal:
        user += f"\nUser goal: {profile.goal}"
    reply, model = await _chat([{"role": "system", "content": system}, {"role": "user", "content": user}], temperature=0.5)
    if reply:
        return InsightResponse(insight=reply.strip('"'), category="weekly", model_used=model)
    return InsightResponse(insight=heuristic(metrics), category="weekly", model_used="heuristic-coach")
