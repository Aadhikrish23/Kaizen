"""Nutrition basis handling, ported from server/src/features/externalFood/nutrition.ts (the Express side keeps its copy for
imports and meal logging). Every food states what its macro numbers refer to:

- ``per_100g``: values are per 100 g (or 100 ml) of product; scale by amount / 100.
- ``per_serving``: values are per one serving; scale by the number of servings.
"""
import math
import re
from typing import Any, Dict, Optional, Tuple

Macros = Dict[str, float]

_SERVING_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|ml|millilit(?:er|re)s?)\b", re.IGNORECASE)


def js_round(value: float, digits: int = 0) -> float:
    """Math.round semantics (halves round up), so ported numbers match the TypeScript they replace exactly."""
    factor = 10 ** digits
    rounded = math.floor(value * factor + 0.5) / factor
    return int(rounded) if digits == 0 else rounded


def round1(value: float) -> float:
    return js_round(value, 1)


def parse_serving_size(label: Optional[str]) -> Optional[Tuple[float, str]]:
    """(qty, 'g'|'ml') from labels like "30 g" or "1 cup (240 ml)"; None when there is no numeric g/ml size."""
    if not label:
        return None
    match = _SERVING_RE.search(label)
    if not match:
        return None
    qty = float(match.group(1).replace(",", "."))
    if not math.isfinite(qty) or qty <= 0:
        return None
    return qty, ("ml" if match.group(2).lower().startswith("m") else "g")


def resolve_basis(food: Dict[str, Any]) -> str:
    """Legacy cached Open Food Facts rows have no basis but hold per-100g values."""
    basis = food.get("basis")
    if basis in ("per_100g", "per_serving"):
        return basis
    return "per_100g" if food.get("source") == "openfoodfacts" else "per_serving"


def portion_factor(basis: str, amount: float) -> float:
    return amount / 100 if basis == "per_100g" else amount


def scale_macros(base: Dict[str, Any], factor: float) -> Macros:
    """Calories to whole kcal, macros to 0.1 g."""
    return {
        "calories": js_round(float(base.get("calories") or 0) * factor),
        "protein": round1(float(base.get("protein") or 0) * factor),
        "carbs": round1(float(base.get("carbs") or 0) * factor),
        "fat": round1(float(base.get("fat") or 0) * factor),
    }
