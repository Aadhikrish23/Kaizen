"""An in-memory stand-in for the Kaizen Express API, shaped like the real one (envelopes already unwrapped, same field names, same
behaviours the assistant relies on: GET /profile wraps the user, POST /workouts replaces the day's log, POST /weight and /sleep
upsert by date, `clientRequestId` makes creates idempotent, GET /planner creates a default plan when there is none)."""
import copy
import itertools
import re
from typing import Any, Dict, List, Optional

from app.core.kaizen_api import ApiError, KaizenApi


def default_plan() -> Dict[str, Any]:
    days = [
        {"dayNumber": n, "dayName": str(n), "isRestDay": n in (2, 4, 6, 7), "title": "Rest" if n in (2, 4, 6, 7) else f"Full Body {n}",
         "targetMuscles": [], "exercises": [] if n in (2, 4, 6, 7) else [{"exerciseName": "Squat", "targetMuscle": "legs"}]}
        for n in range(1, 8)
    ]
    return {"_id": "plan1", "programName": "Custom Split", "preferences": {"daysPerWeek": 3, "sessionDurationMinutes": 45, "durationPolicy": "approximate_target",
            "splitStyle": "full_body", "experienceLevel": "beginner", "targetFocus": "general_fitness"}, "schedule": days, "dailyAdaptations": []}


class FakeKaizen(KaizenApi):
    _ids = itertools.count(1)

    def __init__(self, user_id: str = "user-1", timezone: str = "Asia/Kolkata", token: str = "good-token", **user_over: Any):
        super().__init__(token, base_url="http://fake.test/api/v1")
        self.user: Dict[str, Any] = {"_id": user_id, "name": "Test User", "timezone": timezone, "units": "metric", "calorieDailyTarget": 2000,
                                     "proteinDailyTargetG": 150, "waterDailyTargetMl": 2500, "currentWeightKg": 80, "goal": "maintain_weight", **user_over}
        self.foods: List[Dict[str, Any]] = [
            {"_id": "f-roti", "name": "Roti", "servingSize": "1 piece", "calories": 120, "protein": 3, "carbs": 20, "fat": 3},
            {"_id": "f-dal", "name": "Dal", "servingSize": "1 bowl", "calories": 180, "protein": 9, "carbs": 25, "fat": 4},
            {"_id": "f-chicken", "name": "Chicken breast", "basis": "per_100g", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
            {"_id": "f-egg", "name": "Egg", "servingSize": "1 piece", "calories": 70, "protein": 6, "carbs": 0.5, "fat": 5},
        ]
        self.recipes: List[Dict[str, Any]] = []
        self.meals: List[Dict[str, Any]] = []
        self.water: List[Dict[str, Any]] = []
        self.weights: Dict[str, Dict[str, Any]] = {}
        self.sleeps: Dict[str, Dict[str, Any]] = {}
        self.workouts: Dict[str, Dict[str, Any]] = {}
        self.plan: Optional[Dict[str, Any]] = None
        self.exercises = [{"name": "Bench Press", "targetMuscle": "chest"}, {"name": "Squat", "targetMuscle": "legs"}]
        self.schedule_today: Dict[str, Any] = {"dayNumber": 1, "splitName": "Full Body 1", "isRestDay": False, "exercisesCount": 1}
        self.report: Dict[str, Any] = {"period": "weekly", "sufficient": False, "daysInPeriod": 7, "daysWithData": 0, "missing": ["meals"], "startDate": "2026-03-02", "endDate": "2026-03-08",
                                       "calories": None, "protein": None, "water": None, "workouts": None, "weight": None, "sleep": None}
        self.calls: List[tuple] = []
        self.fail: Dict[str, ApiError] = {}  # "METHOD /path" -> error to raise (matched by prefix)
        self.today_override: Optional[str] = None

    # ------------------------------------------------------------------ transport
    async def request(self, method: str, path: str, *, params: Optional[Dict[str, Any]] = None, json: Any = None) -> Any:
        self.calls.append((method, path, params, json))
        if self._token != "good-token":
            raise ApiError(401, "UNAUTHORIZED", "Not authorized to access this route")
        for key, err in self.fail.items():
            verb, prefix = key.split(" ", 1)
            if verb == method and path.startswith(prefix):
                raise err
        handler = getattr(self, "_" + method.lower())
        return copy.deepcopy(handler(path, params or {}, json))

    def called(self, method: str, prefix: str) -> List[tuple]:
        return [c for c in self.calls if c[0] == method and c[1].startswith(prefix)]

    # ------------------------------------------------------------------ helpers
    def _new_id(self, prefix: str) -> str:
        return f"{prefix}-{next(self._ids)}"

    def _idempotent(self, rows: List[Dict[str, Any]], body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        key = body.get("clientRequestId")
        return next((r for r in rows if key and r.get("clientRequestId") == key), None)

    @staticmethod
    def _require(body: Dict[str, Any], *fields: str) -> None:
        missing = [f for f in fields if body.get(f) in (None, "")]
        if missing:
            raise ApiError(400, "VALIDATION_ERROR", f"{', '.join(missing)} is required")

    # ------------------------------------------------------------------ GET
    def _get(self, path: str, params: Dict[str, Any], _body: Any) -> Any:
        if path == "/profile":
            return {"user": self.user, "tdeeData": {}}
        if path == "/summary":
            return self._summary(params["date"])
        if path == "/foods/search":
            q = str(params.get("q") or "").lower()
            rows = [f for f in self.foods if q in f["name"].lower()] if q else list(self.foods)
            return rows[: int(params.get("limit") or 20)]
        if path == "/recipes":
            return self.recipes
        if path == "/weight":
            return self.weights.get(params["date"])
        if path == "/sleep":
            return self.sleeps.get(params["date"])
        if path == "/workouts":
            return self.workouts.get(params["date"])
        if path == "/workouts/schedule":
            return {"today": self.schedule_today}
        if path == "/planner":
            if self.plan is None:
                self.plan = default_plan()
            return self.plan
        if path == "/exercises":
            return self.exercises
        if path == "/reports":
            return self.report
        raise ApiError(404, "NOT_FOUND", f"GET {path} is not faked")

    def _summary(self, date: str) -> Dict[str, Any]:
        meals = [m for m in self.meals if m["date"] == date]
        water = [w for w in self.water if w["date"] == date]
        weight, sleep, workout = self.weights.get(date), self.sleeps.get(date), self.workouts.get(date)
        total = lambda key: sum(m.get(key) or 0 for m in meals)  # noqa: E731
        return {
            "date": date,
            "nutrition": {"totalCalories": total("calories"), "totalProtein": total("protein"), "totalCarbs": total("carbs"), "totalFat": total("fat"),
                          "calorieGoal": self.user["calorieDailyTarget"], "proteinGoal": self.user["proteinDailyTargetG"], "meals": meals},
            "hydration": {"totalWater": sum(w["amount"] for w in water), "waterGoal": self.user["waterDailyTargetMl"], "logs": water},
            "bodyMetrics": {"weight": weight["weight"] if weight else None, "targetWeight": self.user.get("targetWeightKg") or 70},
            "sleep": {"logged": bool(sleep), "durationMinutes": (sleep or {}).get("durationMinutes", 0), "bedtime": (sleep or {}).get("bedtime"), "wakeTime": (sleep or {}).get("wakeTime")},
            "strength": {"workoutCompleted": bool(workout), "splitName": (workout or {}).get("splitName"), "totalVolumeKg": 0, "exercisesCount": len((workout or {}).get("exercises", [])), "workout": workout},
        }

    # ------------------------------------------------------------------ POST / PUT / PATCH / DELETE
    def _post(self, path: str, _params: Dict[str, Any], body: Any) -> Any:
        if path == "/meals":
            self._require(body, "name", "mealType", "time", "date")
            if body.get("calories") is None:
                raise ApiError(400, "VALIDATION_ERROR", "calories is required")
            existing = self._idempotent(self.meals, body)
            if existing:
                return existing
            row = {**body, "_id": self._new_id("meal")}
            self.meals.append(row)
            return row
        if path == "/water":
            self._require(body, "amount", "time", "date")
            if not re.match(r"^\d{2}:\d{2}$", body["time"]):
                raise ApiError(400, "VALIDATION_ERROR", "Time must be in HH:MM format")
            existing = self._idempotent(self.water, body)
            if existing:
                return existing
            row = {**body, "_id": self._new_id("water")}
            self.water.append(row)
            return row
        if path == "/weight":
            self._require(body, "weight", "date")
            row = {**self.weights.get(body["date"], {"_id": self._new_id("weight")}), **body}
            self.weights[body["date"]] = row
            return row
        if path == "/sleep":
            self._require(body, "date", "bedtime", "wakeTime")
            bed = int(body["bedtime"][:2]) * 60 + int(body["bedtime"][3:5])
            wake = int(body["wakeTime"][:2]) * 60 + int(body["wakeTime"][3:5])
            minutes = wake - bed if wake >= bed else 24 * 60 - bed + wake
            row = {**self.sleeps.get(body["date"], {"_id": self._new_id("sleep")}), **body, "durationMinutes": minutes}
            self.sleeps[body["date"]] = row
            return row
        if path == "/workouts":
            self._require(body, "date", "splitName")
            row = {**self.workouts.get(body["date"], {"_id": self._new_id("workout")}), **body}
            self.workouts[body["date"]] = row
            return row
        if path == "/planner/configure":
            self.plan = {**default_plan(), "preferences": {**body}, "_id": self._new_id("plan")}
            n = int(body["daysPerWeek"])
            for i, day in enumerate(self.plan["schedule"]):
                day["isRestDay"] = i >= n
                day["title"] = "Rest" if i >= n else f"{body['splitStyle']} {i + 1}"
                day["exercises"] = [] if i >= n else [{"exerciseName": "Squat"}]
            return self.plan
        if path == "/planner/adapt":
            plan = self.plan or default_plan()
            plan["dailyAdaptations"] = [{"date": body.get("date"), "reason": "Raised squat by 2.5 kg"}]
            self.plan = plan
            return plan
        if path == "/planner/activate":
            if body["date"] in self.workouts:
                raise ApiError(400, "BAD_REQUEST", "A workout already exists")
            row = {"_id": self._new_id("workout"), "date": body["date"], "splitName": self.schedule_today["splitName"], "exercises": [{"exerciseName": "Squat", "sets": []}]}
            self.workouts[body["date"]] = row
            return row
        raise ApiError(404, "NOT_FOUND", f"POST {path} is not faked")

    def _put(self, path: str, _params: Dict[str, Any], body: Any) -> Any:
        if path == "/planner/custom":
            self.plan = {**default_plan(), "programName": body.get("programName") or "Custom Split", "schedule": body["schedule"], "_id": "plan-custom"}
            return self.plan
        raise ApiError(404, "NOT_FOUND", f"PUT {path} is not faked")

    def _patch(self, path: str, _params: Dict[str, Any], body: Any) -> Any:
        if path == "/profile":
            self.user.update(body)
            return self.user
        raise ApiError(404, "NOT_FOUND", f"PATCH {path} is not faked")

    def _delete(self, path: str, _params: Dict[str, Any], _body: Any) -> Any:
        if path == "/planner":
            self.plan = None
            return {"deleted": True}
        kind, _, row_id = path.strip("/").partition("/")
        stores = {"meals": self.meals, "water": self.water}
        if kind in stores:
            before = len(stores[kind])
            stores[kind][:] = [r for r in stores[kind] if r["_id"] != row_id]
            if len(stores[kind]) == before:
                raise ApiError(404, "NOT_FOUND", "not found")
            return {"id": row_id}
        keyed = {"weight": self.weights, "sleep": self.sleeps, "workouts": self.workouts}
        if kind in keyed:
            for date, row in list(keyed[kind].items()):
                if row["_id"] == row_id:
                    del keyed[kind][date]
                    return {"id": row_id}
            raise ApiError(404, "NOT_FOUND", "not found")
        raise ApiError(404, "NOT_FOUND", f"DELETE {path} is not faked")
