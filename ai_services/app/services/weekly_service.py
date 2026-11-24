from typing import Any, Dict, List, Optional

from ..core.kaizen_api import KaizenApi
from ..schemas.coach import InsightResponse, UserProfileContext
from ..schemas.weekly import WeeklyMetricsContext
from .llm import get_provider

MIN_DAYS_WITH_DATA = 3


async def _chat(messages: List[Dict[str, str]], temperature: float) -> "tuple[Optional[str], str]":
    """Return (reply, model_name) from the configured LLM provider chain."""
    provider = get_provider()
    result = await provider.chat_with_meta(messages, temperature=temperature, timeout=15.0)
    return (result.text, result.model) if result else (None, provider.model)


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


# --- the signed-in user's weekly insight, built from the Express weekly report ---------------------------------------


def heuristic_report_insight(report: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic weekly summary used when no model answers (ported from weeklyInsight.ts). States missing data instead of
    inventing it. Takes the Express `/reports?period=weekly` payload."""
    days_in_period = report["daysInPeriod"]
    days_with_data = report["daysWithData"]
    missing: List[str] = report.get("missing") or []

    if not report.get("sufficient"):
        return {
            "insight": f"Not enough data for a weekly insight yet: you logged on {days_with_data} of {days_in_period} days (at least {MIN_DAYS_WITH_DATA} needed). Keep logging meals, water, sleep and workouts.",
            "highlights": [f"Nothing logged for: {', '.join(missing)}."] if missing else [],
        }

    highlights: List[str] = []
    focus: Optional[str] = None

    calories, protein, water = report.get("calories"), report.get("protein"), report.get("water")
    workouts, sleep, weight = report.get("workouts"), report.get("sleep"), report.get("weight")

    if calories:
        pct = round_half_up(calories["average"] / calories["target"] * 100)
        highlights.append(f"Average intake {_n(calories['average'])} kcal on {calories['loggedDays']} logged days ({pct}% of your {_n(calories['target'])} kcal target).")
        if pct < 80 or pct > 115:
            focus = (
                "Your logged intake runs well under target: make sure you are logging every meal and eating enough."
                if pct < 80
                else "Your logged intake runs above target: review portions on your biggest meals."
            )
    if protein:
        pct = round_half_up(protein["average"] / protein["target"] * 100)
        highlights.append(f"Average protein {_n(protein['average'])} g ({pct}% of your {_n(protein['target'])} g target).")
        if not focus and pct < 85:
            focus = "Protein is the gap this week: add a protein source to your lightest meal."
    if water:
        pct = round_half_up(water["average"] / water["target"] * 100)
        highlights.append(f"Average water {_n(water['average'])} ml on {water['loggedDays']} logged days ({pct}% of target).")
        if not focus and pct < 75:
            focus = "Hydration is behind target: keep a bottle nearby."

    count = workouts["count"] if workouts else 0
    if count > 0:
        days = workouts["daysWithWorkout"]
        highlights.append(f"{count} workout{'' if count == 1 else 's'} on {days} day{'' if days == 1 else 's'}, {_n(workouts['totalVolumeKg'])} kg total volume.")
    else:
        highlights.append("No workouts logged this week.")
    if sleep:
        highlights.append(f"Average sleep {_n(sleep['averageHours'])} h on {sleep['loggedNights']} logged nights.")
        if not focus and sleep["averageHours"] < 7:
            focus = "Sleep averaged under 7 hours: an earlier bedtime is the easiest win."
    if weight:
        change = weight["changeKg"]
        highlights.append(f"Weight {'+' if change > 0 else ''}{_n(change)} kg between your first and last weigh-in.")
    if not focus and count == 0:
        focus = "No workouts this week: schedule one short session to restart the habit."

    missing_text = f" Not logged: {', '.join(missing)}." if missing else ""
    insight = (
        f"This week ({report['startDate']} to {report['endDate']}), based on {days_with_data} of {days_in_period} days with logs. "
        f"{focus or 'You are broadly on track: keep the consistency going.'}{missing_text}"
    )
    return {"insight": insight, "highlights": highlights}


def round_half_up(value: float) -> int:
    import math

    return int(math.floor(value + 0.5))


def _n(value: float) -> str:
    """Render numbers the way JavaScript does in a template string (150.0 -> 150)."""
    return str(int(value)) if float(value).is_integer() else str(value)


async def get_user_weekly_insight(api: KaizenApi, name: Optional[str], goal: Optional[str]) -> Dict[str, Any]:
    """The `/ai/insight/weekly` payload for the signed-in user. With too little data the answer is "not enough data": a model is
    never asked to say something anyway."""
    report = await api.get("/reports", params={"period": "weekly"})
    fallback = heuristic_report_insight(report)
    stats = {
        "startDate": report["startDate"],
        "endDate": report["endDate"],
        "daysWithData": report["daysWithData"],
        "avgCalories": (report.get("calories") or {}).get("average"),
        "avgProteinG": (report.get("protein") or {}).get("average"),
        "avgWaterMl": (report.get("water") or {}).get("average"),
        "avgSleepHours": (report.get("sleep") or {}).get("averageHours"),
        "workoutCount": (report.get("workouts") or {}).get("count", 0),
        "weightChangeKg": (report.get("weight") or {}).get("changeKg"),
        "missing": report.get("missing") or [],
    }
    sufficient = bool(report.get("sufficient"))

    if sufficient:
        metrics = WeeklyMetricsContext(
            start_date=report["startDate"],
            end_date=report["endDate"],
            days_with_data=report["daysWithData"],
            avg_calories=stats["avgCalories"],
            avg_protein_g=stats["avgProteinG"],
            avg_water_ml=stats["avgWaterMl"],
            avg_sleep_hours=stats["avgSleepHours"],
            workout_count=stats["workoutCount"],
            total_volume_kg=(report.get("workouts") or {}).get("totalVolumeKg"),
            weight_change_kg=stats["weightChangeKg"],
            missing=stats["missing"],
        )
        result = await get_weekly_insight(UserProfileContext(name=name, goal=goal), metrics)
        if result.model_used != "heuristic-coach" and result.insight.strip():
            return {"insight": result.insight, "highlights": fallback["highlights"], "category": "weekly", "modelUsed": result.model_used, "sufficient": True, "stats": stats}

    return {"insight": fallback["insight"], "highlights": fallback["highlights"], "category": "weekly", "modelUsed": "heuristic-fallback", "sufficient": sufficient, "stats": stats}
