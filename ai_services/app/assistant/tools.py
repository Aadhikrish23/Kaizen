"""The actions. Each one changes data only through the Express API, as the signed-in user, and returns what actually happened plus the
steps needed to take it back. Replies are built from these results, never from the model's own words."""
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Awaitable, Callable, Dict, List, Optional

from ..core.clock import add_days, time_in_tz, today_in_tz
from ..core.kaizen_api import ApiError, KaizenApi
from ..services.food_match import build_result
from ..services.nutrition import js_round
from ..services.parse_pipeline import lookup_food
from .models import Intent, ToolResult, UndoOp
from .text import meal_type_for_hour

DEFAULT_MEAL_TIMES = {"breakfast": "08:00", "lunch": "13:00", "snack": "16:00", "dinner": "20:00"}


@dataclass
class ToolContext:
    api: KaizenApi
    user: Dict[str, Any]
    today: str
    now_hhmm: str
    request_id: str
    days_ago: int = 0

    @property
    def date(self) -> str:
        return add_days(self.today, -self.days_ago)

    @property
    def tz(self) -> Optional[str]:
        return self.user.get("timezone")

    @property
    def day_label(self) -> str:
        return "today" if self.days_ago == 0 else "yesterday" if self.days_ago == 1 else f"on {self.date}"

    def request_key(self, suffix: str) -> str:
        """An idempotency key (8-64 chars of A-Za-z0-9_-): a retried request cannot log the same thing twice."""
        return f"ai-{self.request_id}-{suffix}"[:64]


def make_context(api: KaizenApi, user: Dict[str, Any], request_id: str, days_ago: int = 0) -> ToolContext:
    tz = user.get("timezone")
    return ToolContext(api=api, user=user, today=today_in_tz(tz), now_hhmm=time_in_tz(tz), request_id=request_id, days_ago=days_ago)


def _id(doc: Any) -> Optional[str]:
    return str(doc.get("_id") or doc.get("id")) if isinstance(doc, dict) and (doc.get("_id") or doc.get("id")) else None


def _num(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(round(float(value), 1))


def _clock12(hhmm: str) -> str:
    return datetime.strptime(hhmm, "%H:%M").strftime("%I:%M %p")


async def _failure(label: str, e: ApiError) -> ToolResult:
    if e.status in (401, 403):
        raise e
    return ToolResult(False, f"I couldn't {label}: {e.message}")


# ---------------------------------------------------------------------------------------------------- meals


async def log_meal(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    hour = int(ctx.now_hhmm[:2])
    meal_type = params.get("mealType") or (meal_type_for_hour(hour) if ctx.days_ago == 0 else "lunch")
    when = ctx.now_hhmm if ctx.days_ago == 0 else DEFAULT_MEAL_TIMES[meal_type]

    logged: List[str] = []
    unresolved: List[str] = []
    undo: List[UndoOp] = []
    total_kcal = 0.0
    for index, item in enumerate(params["items"]):
        entry = await _meal_entry(ctx, item)
        if entry is None:
            unresolved.append(item["name"])
            continue
        payload = {**entry["macros"], "name": entry["name"], "mealType": meal_type, "time": _clock12(when), "date": ctx.date,
                   "clientRequestId": ctx.request_key(f"meal{index}")}
        try:
            doc = await ctx.api.post("/meals", payload)
        except ApiError as e:
            if e.status in (401, 403):
                raise
            unresolved.append(item["name"])
            continue
        if _id(doc):
            undo.append(UndoOp("delete", {"path": f"/meals/{_id(doc)}"}))
        total_kcal += entry["macros"]["calories"]
        logged.append(f"{entry['name']} ({_num(entry['macros']['calories'])} kcal, {_num(entry['macros']['protein'])} g protein)")

    parts: List[str] = []
    if logged:
        parts.append(f"Logged {'; '.join(logged)} as {meal_type} for {ctx.day_label}" + (f" (total {_num(total_kcal)} kcal)." if len(logged) > 1 else "."))
    if unresolved:
        parts.append(
            f"I couldn't log {', '.join(unresolved)}: it isn't in the food database in a form I can measure, and I won't guess nutrition. "
            "Tell me its calories (for example \"2 slices pizza 500 kcal\") or add it from the Meals page."
        )
    return ToolResult(bool(logged), " ".join(parts), undo, ["meals", "summary"] if logged else [])


async def _meal_entry(ctx: ToolContext, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """The food to log with its nutrition, or None when it cannot be done honestly. Numbers come from what the user said or from the
    food database, nothing else."""
    if item.get("calories") is not None:
        macros = {"calories": js_round(item["calories"]), "protein": item.get("protein") or 0, "carbs": item.get("carbs") or 0, "fat": item.get("fat") or 0}
        return {"name": item["name"].strip().capitalize(), "macros": macros}
    try:
        food = await lookup_food(ctx.api, item["name"])
    except ApiError as e:
        if e.status in (401, 403):
            raise
        return None
    parsed = {"name": item["name"], "quantity": item.get("quantity", 1), "unit": item.get("unit", "piece"), "grams": item.get("grams"), "confidence": 1}
    result = build_result(parsed, food)
    if result["source"] != "database" or not result["nutrition"]:
        return None
    unit = result["amountUnit"]
    amount = result["amount"]
    label = f"{_num(amount)} {unit}" if unit != "serving" else f"{_num(amount)} serving{'' if amount == 1 else 's'}"
    return {"name": f"{food['name']} ({label})", "macros": result["nutrition"]}


# ---------------------------------------------------------------------------------------------------- water, weight, sleep


async def log_water(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    amount = params["amountMl"]
    when = ctx.now_hhmm if ctx.days_ago == 0 else "12:00"
    try:
        doc = await ctx.api.post("/water", {"amount": amount, "time": when, "date": ctx.date, "clientRequestId": ctx.request_key("water")})
    except ApiError as e:
        return await _failure("log water", e)
    undo = [UndoOp("delete", {"path": f"/water/{_id(doc)}"})] if _id(doc) else []
    return ToolResult(True, f"Logged {_num(amount)} ml of water for {ctx.day_label}.", undo, ["water", "summary"])


async def log_weight(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    weight = params["weightKg"]
    try:
        previous = await ctx.api.get("/weight", params={"date": ctx.date})
        doc = await ctx.api.post("/weight", {"weight": weight, "date": ctx.date, "clientRequestId": ctx.request_key("weight")})
    except ApiError as e:
        return await _failure("log your weight", e)
    if previous and previous.get("weight") is not None:
        undo = [UndoOp("restore_weight", {"weight": previous["weight"], "date": ctx.date})]
        note = f" (replacing {_num(previous['weight'])} kg)"
    else:
        undo = [UndoOp("delete", {"path": f"/weight/{_id(doc)}"})] if _id(doc) else []
        note = ""
    return ToolResult(True, f"Logged your weight as {_num(weight)} kg for {ctx.day_label}{note}.", undo, ["weight", "summary", "profile"])


async def log_sleep(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    body = {"date": ctx.date, "bedtime": params["bedtime"], "wakeTime": params["wakeTime"], "quality": params.get("quality") or 3,
            "clientRequestId": ctx.request_key("sleep")}
    try:
        previous = await ctx.api.get("/sleep", params={"date": ctx.date})
        doc = await ctx.api.post("/sleep", body)
    except ApiError as e:
        return await _failure("log your sleep", e)
    minutes = (doc or {}).get("durationMinutes")
    length = f" ({int(minutes // 60)} h {int(minutes % 60)} min)" if isinstance(minutes, (int, float)) else ""
    if previous and previous.get("bedtime"):
        keep = {k: previous[k] for k in ("bedtime", "wakeTime", "quality", "notes") if previous.get(k) is not None}
        undo = [UndoOp("restore_sleep", {"date": ctx.date, **keep})]
    else:
        undo = [UndoOp("delete", {"path": f"/sleep/{_id(doc)}"})] if _id(doc) else []
    return ToolResult(True, f"Logged sleep from {params['bedtime']} to {params['wakeTime']}{length} for {ctx.day_label}.", undo, ["sleep", "summary"])


# ---------------------------------------------------------------------------------------------------- workouts and plan


async def _muscle_for(ctx: ToolContext, name: str) -> str:
    try:
        exercises = await ctx.api.get("/exercises") or []
    except ApiError:
        return "general"
    wanted = name.strip().lower()
    for ex in exercises:
        if str(ex.get("name", "")).strip().lower() == wanted:
            return ex.get("targetMuscle") or "general"
    for ex in exercises:
        if wanted and wanted in str(ex.get("name", "")).lower():
            return ex.get("targetMuscle") or "general"
    return "general"


def _workout_body(log: Dict[str, Any]) -> Dict[str, Any]:
    keep = ("date", "splitName", "muscleGroups", "exercises", "durationMinutes", "notes")
    return {k: log[k] for k in keep if log.get(k) is not None}


async def log_workout(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    try:
        existing = await ctx.api.get("/workouts", params={"date": ctx.date})
        new_exercises = []
        for ex in params["exercises"]:
            muscle = await _muscle_for(ctx, ex["name"])
            new_exercises.append({
                "exerciseName": ex["name"].strip().title(), "targetMuscle": muscle,
                "sets": [{"setNumber": i + 1, "weightKg": s.get("weightKg", 0), "reps": s["reps"], "completed": True} for i, s in enumerate(ex["sets"])],
            })
        merged = (existing or {}).get("exercises") or []
        body = {
            "date": ctx.date,
            "splitName": (existing or {}).get("splitName") or "Custom workout",
            "muscleGroups": sorted({*((existing or {}).get("muscleGroups") or []), *(e["targetMuscle"] for e in new_exercises)}),
            "exercises": [*merged, *new_exercises],
        }
        duration = params.get("durationMinutes") or (existing or {}).get("durationMinutes")
        if duration:
            body["durationMinutes"] = duration
        doc = await ctx.api.post("/workouts", body)
    except ApiError as e:
        return await _failure("log your workout", e)
    if existing and _id(existing):
        undo = [UndoOp("restore_workout", {"body": _workout_body(existing)})]
        verb = "Added to your existing workout"
    else:
        undo = [UndoOp("delete", {"path": f"/workouts/{_id(doc)}"})] if _id(doc) else []
        verb = "Logged a workout"
    lines = [f"{e['exerciseName']}: " + ", ".join(f"{s['reps']}×{_num(s['weightKg'])} kg" if s["weightKg"] else f"{s['reps']} reps" for s in e["sets"]) for e in new_exercises]
    return ToolResult(True, f"{verb} for {ctx.day_label}: " + "; ".join(lines) + ".", undo, ["workouts", "summary"])


async def start_planned_workout(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    try:
        schedule = await ctx.api.get("/workouts/schedule")
        today = (schedule or {}).get("today") or {}
        if today.get("isRestDay") or not today.get("dayNumber"):
            return ToolResult(False, "Today is a rest day in your plan, so there is no workout to start. You can log one yourself by telling me the exercises and sets.")
        existing = await ctx.api.get("/workouts", params={"date": ctx.date})
        if existing:
            return ToolResult(False, f"You already have a workout for {ctx.day_label}, so I didn't start another. Open Workouts to continue it.")
        doc = await ctx.api.post("/planner/activate", {"dayNumber": today["dayNumber"], "date": ctx.date})
    except ApiError as e:
        return await _failure("start today's workout", e)
    undo = [UndoOp("delete", {"path": f"/workouts/{_id(doc)}"})] if _id(doc) else []
    return ToolResult(True, f"Started {today.get('splitName', 'today’s workout')} ({today.get('exercisesCount', 0)} exercises) from your plan. Open Workouts to log your sets.", undo, ["workouts", "summary", "planner"])


async def configure_plan(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    try:
        try:
            previous = await ctx.api.get("/planner")
        except ApiError as e:
            if e.status != 404:
                raise
            previous = None
        # Express does not fill in schema defaults for this endpoint, so send a complete set: what the user asked for, then their
        # current plan's preferences for anything they did not mention, then the documented defaults.
        current = (previous or {}).get("preferences") or {}
        defaults = {"daysPerWeek": 3, "sessionDurationMinutes": 45, "durationPolicy": "approximate_target", "splitStyle": "full_body",
                    "experienceLevel": "beginner", "targetFocus": "general_fitness"}
        body = {k: params.get(k) or current.get(k) or v for k, v in defaults.items()}
        if current.get("preferredDays"):
            body["preferredDays"] = current["preferredDays"]
        plan = await ctx.api.post("/planner/configure", body)
    except ApiError as e:
        return await _failure("generate a plan", e)
    if previous and previous.get("schedule"):
        undo = [UndoOp("restore_plan", {"body": {"programName": previous.get("programName"), "daysPerWeek": (previous.get("preferences") or {}).get("daysPerWeek"),
                                                 "schedule": previous["schedule"]}})]
    else:
        undo = [UndoOp("delete", {"path": "/planner"})]
    days = [d for d in (plan or {}).get("schedule", []) if not d.get("isRestDay")]
    names = ", ".join(d.get("title", "") for d in days if d.get("title"))
    prefs = (plan or {}).get("preferences") or params
    summary = f"{len(days)} training days a week" + (f" ({names})" if names else "")
    return ToolResult(True, f"Generated a new plan: {summary}. Split: {prefs.get('splitStyle', 'default')}, focus: {prefs.get('targetFocus', 'default')}.", undo, ["planner"])


async def adapt_plan(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    try:
        previous = await ctx.api.get("/planner")
        plan = await ctx.api.post("/planner/adapt", {"date": ctx.date, "force": True})
    except ApiError as e:
        return await _failure("adapt your plan", e)
    adaptations = [a for a in (plan or {}).get("dailyAdaptations", []) if a.get("date") == ctx.date]
    undo = []
    if previous and previous.get("schedule"):
        undo = [UndoOp("restore_plan", {"body": {"programName": previous.get("programName"), "daysPerWeek": (previous.get("preferences") or {}).get("daysPerWeek"),
                                                 "schedule": previous["schedule"]}})]
    if not adaptations:
        return ToolResult(True, f"I checked your plan against {ctx.day_label}'s workout and there was nothing to change yet. Log a workout first and ask again.", [], [])
    notes = "; ".join(str(a.get("reason", "")).strip() for a in adaptations[:4] if a.get("reason"))
    return ToolResult(True, f"Adapted your plan from {ctx.day_label}'s workout: {notes}.", undo, ["planner"])


# ---------------------------------------------------------------------------------------------------- profile


async def update_profile(ctx: ToolContext, params: Dict[str, Any]) -> ToolResult:
    previous = {k: ctx.user.get(k) for k in params}
    try:
        await ctx.api.patch("/profile", params)
    except ApiError as e:
        return await _failure("update your profile", e)
    restorable = {k: v for k, v in previous.items() if v is not None}
    undo = [UndoOp("patch_profile", {"body": restorable})] if restorable else []
    labels = {
        "calorieDailyTarget": "daily calories", "proteinDailyTargetG": "daily protein (g)", "waterDailyTargetMl": "daily water (ml)",
        "goal": "goal", "targetWeightKg": "target weight (kg)", "activityLevel": "activity level", "targetDate": "target date",
    }
    changes = ", ".join(f"{labels.get(k, k)}: {_num(previous[k]) if isinstance(previous.get(k), (int, float)) else previous.get(k) or 'not set'} → {_num(v) if isinstance(v, (int, float)) else v}" for k, v in params.items())
    unset = [labels.get(k, k) for k, v in previous.items() if v is None]
    note = f" (I can't undo {', '.join(unset)} because it wasn't set before; you can change it back from Settings.)" if unset else ""
    return ToolResult(True, f"Updated your {changes}.{note}", undo, ["profile", "summary"])


# ---------------------------------------------------------------------------------------------------- registry and undo


EXECUTORS: Dict[str, Callable[[ToolContext, Dict[str, Any]], Awaitable[ToolResult]]] = {
    "LogMeal": log_meal,
    "LogWater": log_water,
    "LogWeight": log_weight,
    "LogSleep": log_sleep,
    "LogWorkout": log_workout,
    "StartPlannedWorkout": start_planned_workout,
    "ConfigurePlan": configure_plan,
    "AdaptPlan": adapt_plan,
    "UpdateProfile": update_profile,
}


async def needs_confirmation(ctx: ToolContext, intent: Intent) -> Optional[str]:
    """A yes/no question to ask before running this intent, or None when it can just run (everything else has a one-step undo)."""
    if intent.type == "UpdateProfile":
        changes = ", ".join(f"{k} → {_num(v) if isinstance(v, (int, float)) else v}" for k, v in intent.params.items())
        return f"This will change your profile ({changes}). Go ahead?"
    if intent.type == "ConfigurePlan":
        try:
            existing = await ctx.api.get("/planner")
        except ApiError as e:
            if e.status == 404:
                return None
            raise
        if existing and existing.get("schedule"):
            return "This will replace your current workout plan with a new generated one. Go ahead? (You can undo it afterwards.)"
    return None


async def run_undo(api: KaizenApi, ops: List[UndoOp]) -> List[str]:
    """Replay the stored steps in reverse. Returns a line for anything that could not be put back."""
    problems: List[str] = []
    for op in reversed(ops):
        try:
            if op.kind == "delete":
                await api.delete(op.data["path"])
            elif op.kind == "restore_weight":
                await api.post("/weight", {"weight": op.data["weight"], "date": op.data["date"]})
            elif op.kind == "restore_sleep":
                await api.post("/sleep", {k: v for k, v in op.data.items() if v is not None})
            elif op.kind == "restore_workout":
                await api.post("/workouts", op.data["body"])
            elif op.kind == "restore_plan":
                await api.put("/planner/custom", {k: v for k, v in op.data["body"].items() if v is not None})
            elif op.kind == "patch_profile":
                await api.patch("/profile", op.data["body"])
        except ApiError as e:
            if e.status in (401, 403):
                raise
            if op.kind == "delete" and e.status == 404:
                continue  # already gone: that is what undo wanted
            problems.append(e.message)
    return problems
