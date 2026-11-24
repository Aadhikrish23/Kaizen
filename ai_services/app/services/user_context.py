"""What the AI knows about the signed-in user: their profile and a day's totals, read through the Express API."""
from datetime import date
from typing import Any, Dict, Optional, Tuple

from ..core.clock import today_in_tz
from ..core.kaizen_api import ApiError, KaizenApi
from ..schemas.coach import DailyMetricsContext, UserProfileContext
from .nutrition import js_round


def _int(value: Any) -> int:
    return int(js_round(float(value or 0)))


def age_from_dob(dob: Optional[str], today: Optional[date] = None) -> Optional[int]:
    if not dob:
        return None
    try:
        born = date.fromisoformat(str(dob)[:10])
    except ValueError:
        return None
    now = today or date.today()
    age = now.year - born.year - ((now.month, now.day) < (born.month, born.day))
    return age if 0 <= age < 130 else None


async def load_profile(api: KaizenApi) -> Dict[str, Any]:
    """The user document. `GET /profile` wraps it as {user, tdeeData}; a user without an id is refused outright, because that id
    keys the per-user conversation and undo state and must never be shared."""
    data = await api.get("/profile")
    user = data.get("user") if isinstance(data, dict) and isinstance(data.get("user"), dict) else data
    if not isinstance(user, dict) or not (user.get("_id") or user.get("id")):
        raise ApiError(502, "BAD_PROFILE", "The Kaizen API returned a profile without an id")
    return user


def profile_context(user: Dict[str, Any]) -> UserProfileContext:
    return UserProfileContext(
        name=user.get("name"),
        gender=user.get("gender"),
        age=age_from_dob(user.get("dob")),
        heightCm=user.get("heightCm"),
        currentWeightKg=user.get("currentWeightKg"),
        goal=user.get("goal"),
        activityLevel=user.get("activityLevel"),
        calorieDailyTarget=_int(user.get("calorieDailyTarget") or 2000),
        proteinDailyTargetG=_int(user.get("proteinDailyTargetG") or 150),
        waterDailyTargetMl=_int(user.get("waterDailyTargetMl") or 2500),
    )


def metrics_context(summary: Dict[str, Any]) -> DailyMetricsContext:
    nutrition, hydration, strength = summary["nutrition"], summary["hydration"], summary["strength"]
    cal_goal, pro_goal, water_goal = nutrition["calorieGoal"], nutrition["proteinGoal"], hydration["waterGoal"]
    return DailyMetricsContext(
        date=summary.get("date"),
        totalCalories=_int(nutrition["totalCalories"]),
        remainingCalories=_int(max(0, cal_goal - nutrition["totalCalories"])),
        totalProteinG=_int(nutrition["totalProtein"]),
        remainingProteinG=_int(max(0, pro_goal - nutrition["totalProtein"])),
        totalCarbsG=_int(nutrition["totalCarbs"]),
        totalFatG=_int(nutrition["totalFat"]),
        waterMl=_int(hydration["totalWater"]),
        remainingWaterMl=_int(max(0, water_goal - hydration["totalWater"])),
        workoutsLogged=1 if strength.get("workoutCompleted") else 0,
        totalVolumeKg=float(strength.get("totalVolumeKg") or 0),
    )


async def load_context(api: KaizenApi, date_str: Optional[str] = None) -> Tuple[Dict[str, Any], UserProfileContext, DailyMetricsContext]:
    """(raw profile, profile context, the day's metrics). The day defaults to today in the user's own timezone."""
    user = await load_profile(api)
    day = date_str or today_in_tz(user.get("timezone"))
    summary = await api.get("/summary", params={"date": day})
    return user, profile_context(user), metrics_context(summary)
