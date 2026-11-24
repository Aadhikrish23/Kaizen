"""Free-text meal parsing support: a deterministic fallback parser plus database matching and scaling.

Ported from server/src/features/ai/foodParsing.ts. The model (when available) only extracts names and quantities; nutrition
always comes from the food database and is never invented.
"""
import math
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

from .nutrition import js_round, parse_serving_size, portion_factor, resolve_basis, scale_macros

ParsedItem = Dict[str, Any]  # {name, quantity, unit, grams, confidence}
FoodRecord = Dict[str, Any]

# unit word -> (canonical unit, grams per unit or None)
UNITS: Dict[str, Tuple[str, Optional[float]]] = {
    "g": ("g", 1), "gm": ("g", 1), "gram": ("g", 1), "grams": ("g", 1),
    "kg": ("kg", 1000), "kilo": ("kg", 1000), "kilos": ("kg", 1000), "kilogram": ("kg", 1000), "kilograms": ("kg", 1000),
    "oz": ("oz", 28.35), "ounce": ("oz", 28.35), "ounces": ("oz", 28.35),
    "lb": ("lb", 453.6), "lbs": ("lb", 453.6), "pound": ("lb", 453.6), "pounds": ("lb", 453.6),
    "ml": ("ml", None), "l": ("l", None), "litre": ("l", None), "litres": ("l", None), "liter": ("l", None), "liters": ("l", None),
    "cup": ("cup", None), "cups": ("cup", None), "tbsp": ("tbsp", None), "tablespoon": ("tbsp", None), "tablespoons": ("tbsp", None),
    "tsp": ("tsp", None), "teaspoon": ("tsp", None), "teaspoons": ("tsp", None),
    "piece": ("piece", None), "pieces": ("piece", None), "slice": ("slice", None), "slices": ("slice", None),
    "serving": ("serving", None), "servings": ("serving", None), "bowl": ("bowl", None), "bowls": ("bowl", None),
    "glass": ("glass", None), "glasses": ("glass", None), "plate": ("plate", None), "plates": ("plate", None),
    "scoop": ("scoop", None), "scoops": ("scoop", None),
}

NUMBER_WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "half": 0.5}

# Units that count whole portions of the food rather than a weight/volume.
COUNT_UNITS = {"piece", "slice", "serving", "bowl", "glass", "plate", "scoop"}

# Real volume units and their size in ml (a cup is 240 ml, a tablespoon 15 ml, a teaspoon 5 ml).
ML_PER_UNIT = {"ml": 1, "l": 1000, "cup": 240, "tbsp": 15, "tsp": 5}

MAX_GRAMS = 100000  # matches ParsedFoodItem
MAX_QUANTITY = 10000  # anything larger is rejected as absurd

UNICODE_FRACTIONS = {
    "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
    "⅙": "1/6", "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
}
_FRACTION_RE = re.compile("([0-9])?([" + "".join(UNICODE_FRACTIONS) + "])")
_SPLIT_RE = re.compile(r"\s*(?:,|;|\n|&|\+|\band\b|\bwith\b)\s*")
_SCI_RE = re.compile(r"^\d[\d.]*e[+-]?\d")
_GLUE_RE = re.compile(r"^(\d+(?:\.\d+)?)([a-z]+)")
_FRACTION_TOKEN = re.compile(r"^\d{1,6}/\d{1,6}$")
_NAME_CLEAN = re.compile(r"[^a-z0-9\s'-]")


def to_ml(unit: str, quantity: float) -> Optional[float]:
    """Volume of the parsed amount in ml, or None if the unit is not a volume."""
    return js_round(quantity * ML_PER_UNIT[unit], 1) if unit in ML_PER_UNIT else None


def normalize_fractions(text: str) -> str:
    """"1½ cups" -> "1 1/2 cups", "½ cup" -> "1/2 cup" so fractions become ordinary tokens."""
    return _FRACTION_RE.sub(lambda m: f"{m.group(1) + ' ' if m.group(1) else ''}{UNICODE_FRACTIONS[m.group(2)]}", text)


def parse_quantity(token: str) -> Optional[float]:
    """A finite positive number or None. Digit strings long enough to overflow are rejected here."""
    t = token.lower()
    value: Optional[float] = None
    if t in NUMBER_WORDS:
        value = NUMBER_WORDS[t]
    else:
        frac = re.match(r"^(\d{1,6})/(\d{1,6})$", t)
        if frac:
            value = None if int(frac.group(2)) == 0 else int(frac.group(1)) / int(frac.group(2))
        elif re.match(r"^\d{1,9}(\.\d{1,6})?$", t):
            value = float(t)
    return value if value is not None and math.isfinite(value) and 0 < value <= MAX_QUANTITY else None


def regex_parse_food(text: str) -> List[ParsedItem]:
    """Deterministic parser: "2 rotis and 1 cup dal, 150g chicken" -> items. Quantity defaults to 1."""
    lowered = normalize_fractions(unicodedata.normalize("NFC", text.lower()))
    segments = [s.strip() for s in _SPLIT_RE.split(lowered) if s and s.strip()]

    items: List[ParsedItem] = []
    for seg in segments:
        if _SCI_RE.match(seg):
            continue  # scientific notation (1e400): not a quantity we accept
        tokens = _GLUE_RE.sub(r"\1 \2", seg, count=1).split()
        if not tokens:
            continue
        quantity = 1.0
        had_quantity = False
        i = 0
        q = parse_quantity(tokens[0])
        if q is not None:
            quantity, had_quantity, i = q, True, 1
            # mixed fraction: "1 1/2 cups" = 1.5
            if re.match(r"^\d+$", tokens[0]) and len(tokens) > 1 and _FRACTION_TOKEN.match(tokens[1]):
                frac = parse_quantity(tokens[1])
                if frac is not None:
                    quantity += frac
                    i = 2
        elif re.match(r"^\d", tokens[0]):
            continue  # a number we refuse (overflow, absurd size, malformed): drop the item instead of guessing
        unit, grams_per_unit, had_unit = "piece", None, False
        if i < len(tokens) and tokens[i] in UNITS:
            unit, grams_per_unit = UNITS[tokens[i]]
            had_unit = True
            i += 1
            if i < len(tokens) and tokens[i] == "of":
                i += 1
        name = _NAME_CLEAN.sub("", " ".join(tokens[i:])).strip()
        if not name or not quantity > 0:
            continue
        if grams_per_unit and quantity * grams_per_unit > MAX_GRAMS:
            continue  # e.g. 9999 kg: absurd, drop it
        items.append({
            "name": name,
            "quantity": quantity,
            "unit": unit,
            "grams": js_round(quantity * grams_per_unit, 1) if grams_per_unit else None,
            "confidence": 0.6 if had_quantity and had_unit else 0.5 if had_quantity else 0.35,
        })
    return items[:20]


def search_terms(name: str) -> List[str]:
    """Candidate search terms for a parsed name: exact, then a simple singular form."""
    terms = [name]
    if re.search(r"[^aeiou]ies$", name):
        terms.append(name[:-3] + "y")
    elif re.search(r"(ch|sh|x|z|ss|o)es$", name):
        terms.append(name[:-2])
    elif re.search(r"[^s]s$", name) and len(name) > 3:
        terms.append(name[:-1])
    return terms


def pick_best_food(name: str, foods: List[FoodRecord]) -> Optional[FoodRecord]:
    """Pick the best match among database rows: exact name, then prefix, then shortest name."""
    n = name.strip().lower()

    def score(food: FoodRecord) -> int:
        fn = str(food.get("name", "")).strip().lower()
        return 0 if fn == n else 1 if fn.startswith(n) else 2

    return sorted(foods, key=lambda f: (score(f), len(str(f.get("name", "")))))[0] if foods else None


def resolve_amount(item: ParsedItem, food: FoodRecord) -> Optional[Dict[str, Any]]:
    """Express the parsed quantity in the food's own basis units, or None when it cannot be done honestly (the UI then asks)."""
    basis = resolve_basis(food)
    unit_of_food = "ml" if food.get("servingUnit") == "ml" else "g"
    is_count = item["unit"] in COUNT_UNITS
    grams = item.get("grams") if item.get("grams") and item["grams"] > 0 else None
    ml = to_ml(item["unit"], item["quantity"])
    serving_qty = food.get("servingQty")

    if basis == "per_100g":
        if grams:
            return {"amount": grams, "amountUnit": unit_of_food}
        # A volume is only usable for foods measured per 100 ml; converting to grams needs a density we do not know.
        if ml is not None:
            return {"amount": ml, "amountUnit": "ml"} if unit_of_food == "ml" else None
        if is_count and serving_qty and serving_qty > 0:
            return {"amount": item["quantity"] * serving_qty, "amountUnit": unit_of_food}
        return None

    # per_serving
    if is_count:
        return {"amount": item["quantity"], "amountUnit": "serving"}
    serving = parse_serving_size(food.get("servingSize"))
    if ml is not None:
        return {"amount": js_round(ml / serving[0], 2), "amountUnit": "serving"} if serving and serving[1] == "ml" else None
    if grams and serving and serving[1] == "g":
        return {"amount": js_round(grams / serving[0], 2), "amountUnit": "serving"}
    return None


def compute_nutrition(item: ParsedItem, food: FoodRecord) -> Optional[Dict[str, Any]]:
    resolved = resolve_amount(item, food)
    if not resolved:
        return None
    factor = portion_factor(resolve_basis(food), resolved["amount"])
    return {**resolved, "nutrition": scale_macros(food, factor)}


def build_result(item: ParsedItem, food: Optional[FoodRecord]) -> Dict[str, Any]:
    """Combine a parsed item with an (optional) database match. Never fabricates nutrition."""
    base = {**item, "grams": item.get("grams")}
    empty = {"source": "estimate", "needsConfirmation": True, "amount": None, "amountUnit": None, "nutrition": None}
    if not food:
        return {**base, **empty, "food": None}
    matched = compute_nutrition(item, food)
    if not matched:
        # Food found but the amount cannot be converted: keep the match so the user can enter an amount.
        return {**base, **empty, "food": food}
    return {**base, "source": "database", "needsConfirmation": item["confidence"] < 0.5, **matched, "food": food}
