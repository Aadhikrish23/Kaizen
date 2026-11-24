"""Checking the model's plan against the user's own words. The model proposes; this decides what is actually allowed to run.

Rules: nothing changes data when the user only asked a question; every number must be one the user wrote (or a fixed conversion of
one); foods and exercises must be ones they named; relative dates and meal types come from their words, never from the model.
"""
import re
from typing import Dict, List, Optional, Set, Tuple

from .models import Intent
from .text import is_question_only, mentions_number, meal_type_from, parse_clock, words_present

LB_TO_KG = 0.45359237
GLASS_ML, CUP_ML, OZ_ML = 250.0, 240.0, 29.5735

_WATER_AMOUNT_RE = re.compile(
    r"(?<![\w.])(\d+(?:[.,]\d+)?|a|an|one|two|three|four|five|six|half)\s*(ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|glass(?:es)?|cups?|oz|ounces?)\b(?:\s+of\s+water)?",
    re.I,
)
_WORD_NUM = {"a": 1.0, "an": 1.0, "one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0, "five": 5.0, "six": 6.0, "half": 0.5}
_WEIGHT_RE = re.compile(r"(?<![\w.])(\d{2,3}(?:[.,]\d+)?)\s*(kg|kgs|kilos?|kilograms?|lb|lbs|pounds?)?\b", re.I)
_CLOCK_IN_TEXT = re.compile(r"(?<![\w:])(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)|\d{1,2}:\d{2})(?![\w])", re.I)


def water_amounts(message: str) -> List[float]:
    out: List[float] = []
    for m in _WATER_AMOUNT_RE.finditer(message):
        raw, unit = m.group(1).lower(), m.group(2).lower()
        n = _WORD_NUM.get(raw)
        if n is None:
            n = float(raw.replace(",", "."))
        if unit.startswith("ml") or unit.startswith("milli"):
            out.append(n)
        elif unit.startswith("l"):
            out.append(n * 1000)
        elif unit.startswith("glass"):
            out.append(n * GLASS_ML)
        elif unit.startswith("cup"):
            out.append(n * CUP_ML)
        else:
            out.append(n * OZ_ML)
    return [round(v, 1) for v in out if 0 < v <= 5000]


def weight_candidates(message: str, imperial: bool = False) -> List[float]:
    """Weights the user wrote, in kg. A number with a unit ("71 kg", "154 lb") beats a bare number elsewhere in the message
    ("log 250 ml water and weight 71 kg"): bare numbers are only considered when no number has a unit."""
    with_unit: List[float] = []
    bare: List[float] = []
    for m in _WEIGHT_RE.finditer(message):
        value = float(m.group(1).replace(",", "."))
        unit = (m.group(2) or "").lower()
        kg = value * LB_TO_KG if unit.startswith(("lb", "pound")) or (not unit and imperial) else value
        if 20 <= kg <= 500:
            (with_unit if unit else bare).append(round(kg, 2))
    return with_unit or bare


def clock_times(message: str) -> Set[str]:
    return {t for t in (parse_clock(m.group(1)) for m in _CLOCK_IN_TEXT.finditer(message)) if t}


def _has(pattern: str, message: str) -> bool:
    return re.search(pattern, message, re.I) is not None


def _ground_meal(intent: Intent, message: str, notes: List[str]) -> Optional[Intent]:
    kept = []
    for item in intent.params.get("items", []):
        if not words_present(item["name"], message):
            notes.append(f"I skipped \"{item['name']}\" because you didn't mention it.")
            continue
        item = dict(item)
        if item.get("quantity", 1) != 1 and not mentions_number(item["quantity"], message):
            item["quantity"], item["unit"] = 1, "piece"
            item.pop("grams", None)
        if item.get("grams") and not mentions_number(item["grams"], message):
            item.pop("grams")
        for key in ("calories", "protein", "carbs", "fat"):
            if key in item and not mentions_number(item[key], message):
                item.pop(key)
        kept.append(item)
    if not kept:
        return None
    params = {"items": kept}
    typed = meal_type_from(message)
    if typed:
        params["mealType"] = typed
    return Intent("LogMeal", params)


def _ground_water(intent: Intent, message: str) -> Optional[Intent]:
    amounts = water_amounts(message)
    if not amounts:
        return None
    wanted = intent.params.get("amountMl")
    if wanted is not None and any(abs(wanted - a) <= max(1.0, a * 0.01) for a in amounts):
        return intent
    return Intent("LogWater", {"amountMl": amounts[0]}) if len(set(amounts)) == 1 else None


def _ground_weight(intent: Intent, message: str, imperial: bool) -> Optional[Intent]:
    candidates = weight_candidates(message, imperial)
    wanted = intent.params.get("weightKg")
    if wanted is not None and any(abs(wanted - c) <= 0.06 for c in candidates):
        return intent
    return Intent("LogWeight", {"weightKg": candidates[0]}) if len(set(candidates)) == 1 else None


def _ground_sleep(intent: Intent, message: str) -> Optional[Intent]:
    times = clock_times(message)
    p = intent.params
    return intent if p.get("bedtime") in times and p.get("wakeTime") in times else None


def _ground_workout(intent: Intent, message: str, notes: List[str]) -> Optional[Intent]:
    kept = []
    for ex in intent.params.get("exercises", []):
        if not words_present(ex["name"], message):
            notes.append(f"I skipped \"{ex['name']}\" because you didn't mention it.")
            continue
        ok = all(mentions_number(s["reps"], message) and (not s.get("weightKg") or mentions_number(s["weightKg"], message)) for s in ex["sets"])
        if not ok:
            notes.append(f"I skipped \"{ex['name']}\" because its reps or weight weren't in your message.")
            continue
        kept.append(ex)
    if not kept:
        return None
    params = {"exercises": kept}
    if intent.params.get("durationMinutes") and mentions_number(intent.params["durationMinutes"], message):
        params["durationMinutes"] = intent.params["durationMinutes"]
    return Intent("LogWorkout", params)


_SPLIT_WORDS = {
    "ppl": r"\bppl\b|push[\s/-]*pull|push pull legs",
    "upper_lower": r"upper[\s/-]*lower",
    "full_body": r"full[\s-]*body",
    "home_dumbbell": r"\bhome\b|dumbbell",
}
_FOCUS_WORDS = {
    "hypertrophy": r"hypertrophy|muscle|size|bulk|mass",
    "strength": r"strength|stronger|\bstrong\b",
    "fat_loss": r"fat[\s-]*loss|lose (?:fat|weight)|\bcut(?:ting)?\b",
    "general_fitness": r"general|fitness|overall",
}
_LEVEL_WORDS = {"beginner": r"beginner|\bnew\b|just starting", "intermediate": r"intermediate", "advanced": r"advanced|experienced"}


def _keyword_choice(options: Dict[str, str], proposed: Optional[str], message: str) -> Optional[str]:
    return proposed if proposed and _has(options[proposed], message) else None


def _ground_plan(intent: Intent, message: str) -> Optional[Intent]:
    if not _has(r"\b(?:plan|program|programme|routine|split|schedule)\b", message):
        return None
    p, params = intent.params, {}
    if p.get("daysPerWeek") and mentions_number(p["daysPerWeek"], message):
        params["daysPerWeek"] = p["daysPerWeek"]
    if p.get("sessionDurationMinutes") and mentions_number(p["sessionDurationMinutes"], message):
        params["sessionDurationMinutes"] = p["sessionDurationMinutes"]
    for key, options in (("splitStyle", _SPLIT_WORDS), ("targetFocus", _FOCUS_WORDS), ("experienceLevel", _LEVEL_WORDS)):
        chosen = _keyword_choice(options, p.get(key), message)
        if chosen:
            params[key] = chosen
    return Intent("ConfigurePlan", params)


_GOAL_WORDS = {"lose_weight": r"lose|cut|fat loss|slim", "gain_weight": r"gain|bulk|build muscle", "maintain_weight": r"maintain|maintenance|keep my weight"}
_ACTIVITY_WORDS = {
    "sedentary": r"sedentary|desk job|not active",
    "lightly_active": r"lightly",
    "moderately_active": r"moderately",
    "very_active": r"very active",
    "extra_active": r"extra active|extremely active",
}


def _ground_profile(intent: Intent, message: str) -> Optional[Intent]:
    p, params = intent.params, {}
    for key in ("calorieDailyTarget", "proteinDailyTargetG", "waterDailyTargetMl", "targetWeightKg"):
        if key in p and mentions_number(p[key], message):
            params[key] = p[key]
    # "2 litres" of daily water is stated in litres: accept the matching millilitre value.
    if "waterDailyTargetMl" not in params and "waterDailyTargetMl" in p:
        if any(abs(p["waterDailyTargetMl"] - a) <= 1 for a in water_amounts(message)):
            params["waterDailyTargetMl"] = p["waterDailyTargetMl"]
    for key, options in (("goal", _GOAL_WORDS), ("activityLevel", _ACTIVITY_WORDS)):
        chosen = _keyword_choice(options, p.get(key), message)
        if chosen:
            params[key] = chosen
    if p.get("targetDate") and p["targetDate"] in message:
        params["targetDate"] = p["targetDate"]
    return Intent("UpdateProfile", params) if params else None


def ground(intents: List[Intent], message: str, imperial: bool = False) -> Tuple[List[Intent], List[str]]:
    """(intents that may run, notes explaining what was dropped or corrected)."""
    notes: List[str] = []
    kept: List[Intent] = []
    question_only = is_question_only(message)
    for intent in intents:
        if not intent.writes:
            kept.append(intent)
            continue
        if question_only:
            notes.append("I didn't change anything because that read as a question. Tell me what to log or change and I will.")
            continue
        grounded: Optional[Intent]
        if intent.type == "LogMeal":
            grounded = _ground_meal(intent, message, notes)
        elif intent.type == "LogWater":
            grounded = _ground_water(intent, message)
        elif intent.type == "LogWeight":
            grounded = _ground_weight(intent, message, imperial)
        elif intent.type == "LogSleep":
            grounded = _ground_sleep(intent, message)
        elif intent.type == "LogWorkout":
            grounded = _ground_workout(intent, message, notes)
        elif intent.type == "ConfigurePlan":
            grounded = _ground_plan(intent, message)
        elif intent.type == "UpdateProfile":
            grounded = _ground_profile(intent, message)
        elif intent.type == "StartPlannedWorkout":
            grounded = intent if _has(r"\b(?:start|begin|activate|kick off|do)\b", message) else None
        elif intent.type == "AdaptPlan":
            grounded = intent if _has(r"\b(?:adapt|adjust|tweak|progress|update)\b", message) else None
        else:
            grounded = None
        if grounded is None:
            notes.append(f"I couldn't confirm the details of that {intent.type} from what you wrote, so I left it alone.")
        else:
            kept.append(grounded)
    return kept, notes
