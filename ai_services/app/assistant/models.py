"""What the assistant can do. Every intent has a strict parameter model, so whatever the language model returns is validated before
anything runs, and unknown or out-of-range values are dropped rather than coerced."""
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Type

from pydantic import BaseModel, ConfigDict, Field, field_validator

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MealItem(Strict):
    name: str = Field(..., min_length=1, max_length=100)
    quantity: float = Field(default=1, gt=0, le=10000)
    unit: str = Field(default="piece", min_length=1, max_length=30)
    grams: Optional[float] = Field(default=None, gt=0, le=100000)
    # Only when the user stated the numbers themselves ("a snickers, 250 kcal").
    calories: Optional[float] = Field(default=None, ge=0, le=10000)
    protein: Optional[float] = Field(default=None, ge=0, le=1000)
    carbs: Optional[float] = Field(default=None, ge=0, le=1000)
    fat: Optional[float] = Field(default=None, ge=0, le=1000)


class LogMeal(Strict):
    items: List[MealItem] = Field(..., min_length=1, max_length=10)
    mealType: Optional[Literal["breakfast", "lunch", "dinner", "snack"]] = None


class LogWater(Strict):
    amountMl: float = Field(..., gt=0, le=5000)


class LogWeight(Strict):
    weightKg: float = Field(..., ge=20, le=500)


class LogSleep(Strict):
    bedtime: str
    wakeTime: str
    quality: Optional[int] = Field(default=None, ge=1, le=5)

    @field_validator("bedtime", "wakeTime")
    @classmethod
    def _clock(cls, v: str) -> str:
        if not TIME_RE.match(v):
            raise ValueError("time must be HH:MM")
        return v


class WorkoutSet(Strict):
    reps: int = Field(..., ge=1, le=1000)
    weightKg: float = Field(default=0, ge=0, le=1000)


class WorkoutExercise(Strict):
    name: str = Field(..., min_length=1, max_length=100)
    sets: List[WorkoutSet] = Field(..., min_length=1, max_length=20)


class LogWorkout(Strict):
    exercises: List[WorkoutExercise] = Field(..., min_length=1, max_length=15)
    durationMinutes: Optional[int] = Field(default=None, ge=1, le=600)


class StartPlannedWorkout(Strict):
    pass


class ConfigurePlan(Strict):
    daysPerWeek: Optional[int] = Field(default=None, ge=2, le=6)
    splitStyle: Optional[Literal["full_body", "upper_lower", "ppl", "home_dumbbell"]] = None
    experienceLevel: Optional[Literal["beginner", "intermediate", "advanced"]] = None
    targetFocus: Optional[Literal["hypertrophy", "strength", "fat_loss", "general_fitness"]] = None
    sessionDurationMinutes: Optional[int] = Field(default=None, ge=20, le=120)


class AdaptPlan(Strict):
    pass


class UpdateProfile(Strict):
    calorieDailyTarget: Optional[float] = Field(default=None, ge=800, le=10000)
    proteinDailyTargetG: Optional[float] = Field(default=None, ge=10, le=500)
    waterDailyTargetMl: Optional[float] = Field(default=None, ge=500, le=10000)
    goal: Optional[Literal["lose_weight", "gain_weight", "maintain_weight"]] = None
    targetWeightKg: Optional[float] = Field(default=None, ge=25, le=500)
    activityLevel: Optional[Literal["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]] = None
    targetDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class AskQuestion(Strict):
    topic: Optional[str] = Field(default=None, max_length=200)


class Recommend(Strict):
    pass


class Help(Strict):
    pass


@dataclass(frozen=True)
class IntentSpec:
    model: Type[BaseModel]
    writes: bool
    describe: str  # what the planner is told this intent does


INTENTS: Dict[str, IntentSpec] = {
    "LogMeal": IntentSpec(LogMeal, True, 'The user ate or drank something with calories. params: {"items":[{"name","quantity","unit","grams"?}],"mealType"?}. '
                          'Add calories/protein/carbs/fat to an item ONLY if the user said those numbers themselves.'),
    "LogWater": IntentSpec(LogWater, True, 'The user drank water. params: {"amountMl": number}. A glass is 250 ml, a cup 240 ml, a litre 1000 ml.'),
    "LogWeight": IntentSpec(LogWeight, True, 'The user states their body weight. params: {"weightKg": number} (convert pounds to kg).'),
    "LogSleep": IntentSpec(LogSleep, True, 'The user states when they went to bed and woke up. params: {"bedtime":"HH:MM","wakeTime":"HH:MM","quality"?:1-5} (24-hour clock).'),
    "LogWorkout": IntentSpec(LogWorkout, True, 'The user did exercise and states sets. params: {"exercises":[{"name","sets":[{"reps","weightKg"}]}],"durationMinutes"?}.'),
    "StartPlannedWorkout": IntentSpec(StartPlannedWorkout, True, "The user wants to start today's workout from their plan. params: {}."),
    "ConfigurePlan": IntentSpec(ConfigurePlan, True, 'The user wants a new workout plan generated. params (all optional): {"daysPerWeek":2-6,"splitStyle":"full_body|upper_lower|ppl|home_dumbbell","experienceLevel":"beginner|intermediate|advanced","targetFocus":"hypertrophy|strength|fat_loss|general_fitness","sessionDurationMinutes":20-120}.'),
    "AdaptPlan": IntentSpec(AdaptPlan, True, "The user wants their plan adjusted from how their last workout went. params: {}."),
    "UpdateProfile": IntentSpec(UpdateProfile, True, 'The user wants to change a target or goal. params (only what they asked): {"calorieDailyTarget","proteinDailyTargetG","waterDailyTargetMl","goal":"lose_weight|gain_weight|maintain_weight","targetWeightKg","activityLevel","targetDate":"YYYY-MM-DD"}.'),
    "Recommend": IntentSpec(Recommend, False, 'The user asks what to eat next. params: {}.'),
    "AskQuestion": IntentSpec(AskQuestion, False, 'Any question, advice request or chat that changes nothing. params: {"topic"?}.'),
    "Help": IntentSpec(Help, False, 'The user asks what the assistant can do. params: {}.'),
}


@dataclass
class Intent:
    type: str
    params: Dict[str, Any] = field(default_factory=dict)

    @property
    def writes(self) -> bool:
        return INTENTS[self.type].writes


@dataclass
class UndoOp:
    """One reversible step, kept as plain data so it can be shown, stored and replayed: kind + the arguments it needs."""

    kind: str
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    ok: bool
    message: str
    undo: List[UndoOp] = field(default_factory=list)
    changed: List[str] = field(default_factory=list)  # data areas to refresh in the app: meals, water, weight, sleep, workouts, planner, profile
    data: Any = None


def validate_intent(raw: Any) -> Optional[Intent]:
    """An Intent from model output, or None if the type is unknown or the params do not pass their model."""
    if not isinstance(raw, dict):
        return None
    kind = raw.get("type")
    if kind not in INTENTS:
        return None
    params = raw.get("params") or {}
    if not isinstance(params, dict):
        return None
    try:
        validated = INTENTS[kind].model.model_validate(params)
    except Exception:  # noqa: BLE001 - pydantic ValidationError and friends: invalid params mean the intent is dropped
        return None
    return Intent(kind, validated.model_dump(exclude_none=True))
