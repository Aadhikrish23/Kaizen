"""Deterministic meal suggestions: no model involved, so the same data always gives the same ranking.

Ported from server/src/features/ai/recommendations.ts. Candidates (foods and the user's recipes) and what is left of today's
targets are read through the Express API as the signed-in user.
"""
from typing import Any, Dict, List, Optional

from ..core.clock import today_in_tz
from ..core.kaizen_api import KaizenApi
from .nutrition import js_round, parse_serving_size, resolve_basis, round1, scale_macros

Candidate = Dict[str, Any]
Remaining = Dict[str, float]

MIN_MEAL_KCAL = 50
TYPICAL_MEAL_KCAL = 600
TYPICAL_MEAL_PROTEIN_G = 40
FOOD_POOL = 400
RECIPE_POOL = 100


def _clamp01(n: float) -> float:
    return max(0.0, min(1.0, n))


def score_candidate(c: Candidate, remaining: Remaining) -> float:
    """Higher is better: calorie fit (40%), protein fit (40%), protein density (20%)."""
    target_cal = max(MIN_MEAL_KCAL, min(remaining["calories"], TYPICAL_MEAL_KCAL))
    cal_fit = 1 - _clamp01(abs(c["calories"] - target_cal) / target_cal)
    target_pro = min(max(remaining["protein"], 0), TYPICAL_MEAL_PROTEIN_G)
    pro_fit = _clamp01(c["protein"] / target_pro) if target_pro > 0 else 1
    density = _clamp01(((c["protein"] * 4) / c["calories"]) / 0.6)
    return js_round(0.4 * cal_fit + 0.4 * pro_fit + 0.2 * density, 3)


def build_reason(c: Candidate, remaining: Remaining) -> str:
    parts = [f"{_num(c['calories'])} kcal and {_num(c['protein'])} g protein per {c['servingLabel']}"]
    parts.append(f"fits within your {js_round(remaining['calories'])} kcal remaining")
    if remaining["protein"] > 0:
        share = js_round(min(100, (c["protein"] / remaining["protein"]) * 100))
        parts.append(f"covers about {share}% of your {js_round(remaining['protein'])} g remaining protein")
    return "; ".join(parts)


def _num(value: float) -> str:
    """Render numbers the way JavaScript does in a template string (150.0 -> 150)."""
    return str(int(value)) if float(value).is_integer() else str(value)


def _name_key(name: str):
    # JavaScript's localeCompare puts 'a' before 'B' and 'a' before 'A'; plain code-point order does neither.
    return (name.casefold(), name.swapcase())


def rank_meals(candidates: List[Candidate], remaining: Remaining, limit: int = 5) -> List[Candidate]:
    if not remaining["calories"] >= MIN_MEAL_KCAL:
        return []  # nothing sensible fits in what is left
    fitting = [c for c in candidates if MIN_MEAL_KCAL <= c["calories"] <= remaining["calories"]]
    scored = [{**c, "score": score_candidate(c, remaining), "reason": build_reason(c, remaining)} for c in fitting]
    scored.sort(key=lambda s: (-s["score"], _name_key(s["name"])))
    seen = set()
    ranked: List[Candidate] = []
    for s in scored:
        key = f"{s['type']}:{s['name'].lower()}"
        if key in seen:
            continue
        seen.add(key)
        ranked.append(s)
    return ranked[:limit]


def food_to_candidate(food: Dict[str, Any]) -> Optional[Candidate]:
    basis = resolve_basis(food)
    if basis == "per_100g":
        qty = food["servingQty"] if food.get("servingQty") and food["servingQty"] > 0 else 100
        unit = "ml" if food.get("servingUnit") == "ml" else "g"
        return {"id": str(food.get("_id")), "type": "food", "name": food["name"], "servingLabel": f"{_num(qty)} {unit}", **scale_macros(food, qty / 100)}
    label = food.get("servingSize") or "1 serving"
    return {
        "id": str(food.get("_id")), "type": "food", "name": food["name"], "servingLabel": label,
        "calories": food["calories"], "protein": food["protein"], "carbs": food["carbs"], "fat": food["fat"],
    }


def recipe_to_candidate(recipe: Dict[str, Any]) -> Optional[Candidate]:
    """Imported recipes (no per-ingredient macros) store per-serving totals; manual recipes store the whole recipe, so divide."""
    ingredients = recipe.get("ingredients") or []
    manual = len(ingredients) > 0 and all(isinstance(i.get("calories"), (int, float)) and not isinstance(i.get("calories"), bool) for i in ingredients)
    servings = max(1, recipe.get("servings") or 1) if manual else 1
    total = recipe.get("totalCalories")
    if not isinstance(total, (int, float)) or isinstance(total, bool):
        return None
    return {
        "id": str(recipe.get("_id")), "type": "recipe", "name": recipe["name"], "servingLabel": "1 serving",
        "calories": js_round(total / servings),
        "protein": round1((recipe.get("totalProtein") or 0) / servings),
        "carbs": round1((recipe.get("totalCarbs") or 0) / servings),
        "fat": round1((recipe.get("totalFat") or 0) / servings),
    }


def _stable(rows: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    """Candidate pools are read in a stable order so the same rows are considered on every request."""
    return sorted(rows, key=lambda r: (_name_key(str(r.get("name", ""))), str(r.get("_id", ""))))[:limit]


async def get_meal_recommendations(api: KaizenApi, timezone: Optional[str], date: Optional[str] = None, limit: int = 5) -> List[Candidate]:
    day = date or today_in_tz(timezone)
    summary = await api.get("/summary", params={"date": day})
    nutrition = summary["nutrition"]
    remaining = {
        "calories": max(0, nutrition["calorieGoal"] - nutrition["totalCalories"]),
        "protein": max(0, nutrition["proteinGoal"] - nutrition["totalProtein"]),
    }
    foods = await api.get("/foods/search", params={"limit": FOOD_POOL}) or []
    recipes = await api.get("/recipes") or []
    candidates = [c for c in [*map(food_to_candidate, _stable(foods, FOOD_POOL)), *map(recipe_to_candidate, _stable(recipes, RECIPE_POOL))] if c]
    return rank_meals(candidates, remaining, limit)
