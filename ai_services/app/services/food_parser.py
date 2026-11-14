import json
import re
from typing import Any, List

from pydantic import ValidationError

from ..schemas.food import ParsedFoodItem
from .llm import LLMProvider

MAX_ITEMS = 20

SYSTEM_PROMPT = (
    "You extract foods and quantities from a meal description. "
    "Return ONLY JSON of the form {\"items\": [{\"name\": str, \"quantity\": number, \"unit\": str, "
    "\"grams\": number or null, \"confidence\": number between 0 and 1}]}. "
    "Rules: extract only foods and their amounts as written; use unit \"piece\" for countable items with no unit; "
    "set grams only when the amount is given in grams/kg or is clearly inferable (e.g. 100 g); otherwise null. "
    "NEVER include calories, protein, carbs, fat or any other nutrition values. No commentary."
)


class ModelOutputError(ValueError):
    """The model's reply was not valid, strictly-shaped JSON for this task."""


def _strip_fences(raw: str) -> str:
    text = raw.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.DOTALL | re.IGNORECASE)
    return match.group(1) if match else text


def parse_model_output(raw: str) -> List[ParsedFoodItem]:
    """Validate raw model text into items. Raises ModelOutputError on any deviation (no partial acceptance)."""
    if not raw or not raw.strip():
        raise ModelOutputError("empty model output")
    try:
        data: Any = json.loads(_strip_fences(raw))
    except json.JSONDecodeError as e:
        raise ModelOutputError(f"not valid JSON: {e}") from e

    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise ModelOutputError("expected a list of items")
    if len(items) == 0:
        raise ModelOutputError("no items extracted")
    if len(items) > MAX_ITEMS:
        raise ModelOutputError(f"too many items ({len(items)})")

    parsed: List[ParsedFoodItem] = []
    for idx, item in enumerate(items):
        try:
            parsed.append(ParsedFoodItem.model_validate(item))
        except ValidationError as e:
            raise ModelOutputError(f"item {idx} invalid: {e.errors()[0]['msg']}") from e
    return parsed


async def parse_food_text(provider: LLMProvider, text: str) -> List[ParsedFoodItem]:
    """Ask the provider to extract items. Raises ProviderUnavailable if it did not answer, ModelOutputError if invalid."""
    reply = await provider.chat(
        [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": text}],
        temperature=0.0,
        json_mode=True,
    )
    if reply is None:
        raise ProviderUnavailable("LLM provider unavailable")
    return parse_model_output(reply)


class ProviderUnavailable(RuntimeError):
    pass
