"""Plain commands and questions about the user's own data, handled without a model: fast, free, works with the AI provider down, and
the numbers are always right because they come from the data, not from generated text.

Deliberately strict: anything that does not fit exactly falls through to the planner."""
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from ..core.kaizen_api import ApiError
from ..services.food_match import regex_parse_food
from ..services.parse_pipeline import lookup_food
from .grounding import _CLOCK_IN_TEXT, water_amounts, weight_candidates
from .models import Intent
from .text import is_question_only, meal_type_from, parse_clock
from .tools import ToolContext, _num


@dataclass
class FastResult:
    intents: Optional[List[Intent]] = None
    answer: Optional[str] = None


_EAT_RE = re.compile(r"^\s*(?:(?:ok(?:ay)?|so|well)[,\s]+)?(?:i\s+)?(?:just\s+|also\s+|have\s+)?(?:ate|had|eaten|eat|log(?:ged)?|add(?:ed)?|record(?:ed)?)\b\s*(?:(?:for\s+)?(?:breakfast|lunch|dinner|supper|brunch|snack)s?\b[:,]?\s*)?(?:i\s+(?:had|ate)\s+)?(.+)$", re.I)
_FOR_MEAL_FIRST_RE = re.compile(r"^\s*for\s+(?:breakfast|lunch|dinner|supper|brunch|a snack|snack)\b[:,]?\s*(?:i\s+)?(?:had|ate|have)\s+(.+)$", re.I)
_TRAILING_RE = re.compile(r"\s+(?:for\s+(?:breakfast|lunch|dinner|supper|brunch|a snack|snack)|yesterday|today|this morning|last night|tonight|just now|earlier|please|pls)\s*$", re.I)
_WEIGH_CUE = re.compile(r"\b(?:weigh(?:ed|s)?|my weight|weight (?:is|was)|weight\s*[:-]?\s*\d+|body ?weight|scale (?:says|said|shows|showed))\b", re.I)
_IM_CUE = re.compile(r"\b(?:i'?m|i am)\s+\d", re.I)
_START_WORKOUT_RE = re.compile(r"^\s*(?:(?:ok(?:ay)?|so|hey)[,\s]+)?(?:please\s+)?(?:let'?s\s+)?(?:start|begin|kick off|activate)\s+(?:my\s+|the\s+)?(?:today'?s?\s+|planned\s+)?(?:workout|session|training)\s*(?:now|today|please)?\s*[.!]*\s*$", re.I)
_SLEEP_CUE = re.compile(r"\b(?:slept|sleep|went to (?:bed|sleep)|in bed|woke|wake|got up)\b", re.I)


async def fast_path(message: str, ctx: ToolContext, imperial: bool = False) -> Optional[FastResult]:
    if is_question_only(message):
        return await _data_question(message, ctx)

    if _START_WORKOUT_RE.match(message):
        return FastResult(intents=[Intent("StartPlannedWorkout", {})])

    water, weight, sleep = _water(message), _weight(message, imperial), _sleep(message)
    kinds = sum(bool(x) for x in (water, weight, sleep)) + (1 if water and re.search(r"\b(?:ate|eaten)\b", message, re.I) else 0)
    if kinds > 1:
        return None  # several actions in one message: only the planner can split them without dropping one
    intents = water or weight or sleep
    if isinstance(intents, FastResult):
        return intents
    if intents:
        return FastResult(intents=intents)
    return await _meal(message, ctx) or await _data_question(message, ctx)


def _water(message: str) -> Optional[List[Intent]]:
    if not re.search(r"\bwater\b", message, re.I):
        return None
    amounts = water_amounts(message)
    return [Intent("LogWater", {"amountMl": amounts[0]})] if len(set(amounts)) == 1 else None


def _weight(message: str, imperial: bool) -> Optional[List[Intent]]:
    explicit_unit = re.search(r"\d\s*(?:kg|kgs|kilos?|lb|lbs|pounds?)\b", message, re.I)
    if not (_WEIGH_CUE.search(message) or (_IM_CUE.search(message) and explicit_unit)):
        return None
    candidates = weight_candidates(message, imperial)
    return [Intent("LogWeight", {"weightKg": candidates[0]})] if len(set(candidates)) == 1 else None


def _sleep(message: str):
    if not _SLEEP_CUE.search(message):
        return None
    times = [(m.start(), parse_clock(m.group(1))) for m in _CLOCK_IN_TEXT.finditer(message)]
    times = [(pos, t) for pos, t in times if t]
    if len(times) != 2:
        if re.search(r"\b(?:slept|sleep)\b", message, re.I) and re.search(r"\d", message):
            return FastResult(answer="What time did you go to bed and what time did you wake up? For example: \"slept 11pm to 7am\".")
        return None
    woke_first = re.search(r"\b(?:woke|wake|got up)\b", message, re.I)
    bed_cue = re.search(r"\b(?:slept|sleep|bed)\b", message, re.I)
    first, second = times[0][1], times[1][1]
    if woke_first and bed_cue and woke_first.start() < bed_cue.start():
        first, second = second, first
    return [Intent("LogSleep", {"bedtime": first, "wakeTime": second})]


async def _meal(message: str, ctx: ToolContext) -> Optional[FastResult]:
    m = _FOR_MEAL_FIRST_RE.match(message) or _EAT_RE.match(message)
    if not m or re.search(r"\b\d+\s*(?:kcal|cals?|calories)\b", message, re.I):
        return None  # calories the user stated themselves are the model planner's job (the regex parser would read them as a food)
    food_text = _TRAILING_RE.sub("", m.group(m.lastindex).strip().rstrip(".!"))
    items = regex_parse_food(food_text)
    if not items:
        return None
    resolved = []
    missing = []
    for item in items:
        try:
            found = await lookup_food(ctx.api, item["name"])
        except ApiError as e:
            if e.status in (401, 403):
                raise
            found = None
        (resolved if found else missing).append(item)
    if not resolved:
        names = ", ".join(i["name"] for i in missing)
        return FastResult(answer=f"I couldn't find {names} in the food database, and I won't guess nutrition. Tell me the calories (for example \"{missing[0]['name']} 200 kcal\") or add it from the Meals page.")
    params: Dict[str, Any] = {"items": [{k: v for k, v in i.items() if k in ("name", "quantity", "unit", "grams") and v is not None} for i in resolved + missing]}
    typed = meal_type_from(message)
    if typed:
        params["mealType"] = typed
    return FastResult(intents=[Intent("LogMeal", params)])


# ---------------------------------------------------------------------------------------------------- data questions


async def _data_question(message: str, ctx: ToolContext) -> Optional[FastResult]:
    m = message.lower()
    asks_left = re.search(r"\b(?:left|remaining|remain|to go|more can i)\b", m)
    if re.search(r"\b(?:calories|kcal|cals)\b", m) and (asks_left or re.search(r"\b(?:have i|did i|so far|today|eaten|consumed)\b", m)):
        s = await _summary(ctx)
        if s:
            n = s["nutrition"]
            left = max(0, n["calorieGoal"] - n["totalCalories"])
            return FastResult(answer=f"{_when(ctx).capitalize()} you've logged {_num(n['totalCalories'])} of your {_num(n['calorieGoal'])} kcal target, so {_num(left)} kcal {'are' if left != 1 else 'is'} left.")
    if re.search(r"\bprotein\b", m) and (asks_left or re.search(r"\b(?:have i|did i|so far|today|eaten)\b", m)):
        s = await _summary(ctx)
        if s:
            n = s["nutrition"]
            left = max(0, n["proteinGoal"] - n["totalProtein"])
            return FastResult(answer=f"{_when(ctx).capitalize()} you've logged {_num(n['totalProtein'])} g of your {_num(n['proteinGoal'])} g protein target, so {_num(left)} g {'are' if left != 1 else 'is'} left.")
    if re.search(r"\bwater\b", m) and re.search(r"\b(?:how much|how many|did i|have i|left|remaining|so far)\b", m):
        s = await _summary(ctx)
        if s:
            h = s["hydration"]
            left = max(0, h["waterGoal"] - h["totalWater"])
            return FastResult(answer=f"{_when(ctx).capitalize()} you've had {_num(h['totalWater'])} ml of water against a {_num(h['waterGoal'])} ml target ({_num(left)} ml to go).")
    if re.search(r"\bwhat (?:did|have|had) i (?:eat|eaten|ate|have|had)\b|\bwhat (?:meals|food) (?:did|have) i\b|\bwhat i (?:ate|had|ve eaten)\b", m):
        s = await _summary(ctx)
        if s:
            meals = s["nutrition"]["meals"]
            if not meals:
                return FastResult(answer=f"You haven't logged any meals {ctx.day_label} yet.")
            lines = "; ".join(f"{x['name']} ({_num(x['calories'])} kcal)" for x in meals)
            return FastResult(answer=f"{_when(ctx).capitalize()} you logged: {lines}. Total {_num(s['nutrition']['totalCalories'])} kcal.")
    if re.search(r"\b(?:my weight|what do i weigh|current weight|how much do i weigh)\b", m):
        s = await _summary(ctx)
        weight = (s or {}).get("bodyMetrics", {}).get("weight") or ctx.user.get("currentWeightKg")
        if weight:
            return FastResult(answer=f"Your latest recorded weight is {_num(weight)} kg" + (f" (target {_num(ctx.user['targetWeightKg'])} kg)." if ctx.user.get("targetWeightKg") else "."))
        return FastResult(answer="You haven't recorded a weight yet. Tell me, for example, \"I weigh 71.2 kg\".")
    if re.search(r"\b(?:how (?:did|much did) i sleep|last night'?s? sleep|my sleep)\b", m):
        s = await _summary(ctx)
        sleep = (s or {}).get("sleep") or {}
        if sleep.get("logged"):
            mins = sleep["durationMinutes"]
            return FastResult(answer=f"You slept {int(mins // 60)} h {int(mins % 60)} min ({sleep.get('bedtime')} to {sleep.get('wakeTime')}) for {ctx.day_label}.")
        return FastResult(answer=f"No sleep is logged for {ctx.day_label}. Tell me, for example, \"slept 11pm to 7am\".")
    if re.search(r"\b(?:did i work ?out|workout today|today'?s workout|what'?s my workout|my workout today|what workout)\b", m):
        s = await _summary(ctx)
        strength = (s or {}).get("strength") or {}
        if strength.get("workoutCompleted"):
            return FastResult(answer=f"You logged a workout {ctx.day_label}: {strength.get('splitName') or 'workout'}, {_num(strength.get('totalVolumeKg', 0))} kg total volume.")
        try:
            plan_today = ((await ctx.api.get("/workouts/schedule")) or {}).get("today") or {}
        except ApiError as e:
            if e.status in (401, 403):
                raise
            plan_today = {}
        if plan_today and not plan_today.get("isRestDay"):
            return FastResult(answer=f"No workout logged {ctx.day_label} yet. Your plan has {plan_today.get('splitName')} ({plan_today.get('exercisesCount', 0)} exercises). Say \"start today's workout\" to begin.")
        return FastResult(answer=f"No workout logged {ctx.day_label}, and your plan has a rest day today.")
    return None


def _when(ctx: ToolContext) -> str:
    return ctx.day_label if ctx.days_ago else "today"


async def _summary(ctx: ToolContext) -> Optional[Dict[str, Any]]:
    try:
        return await ctx.api.get("/summary", params={"date": ctx.date})
    except ApiError as e:
        if e.status in (401, 403):
            raise
        return None
