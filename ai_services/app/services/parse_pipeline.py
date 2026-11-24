"""Quick-add by text for the signed-in user: the model only extracts names and amounts; nutrition comes from the food database."""
from typing import Any, Dict, List, Optional

from ..core.kaizen_api import ApiError, KaizenApi
from .food_match import build_result, pick_best_food, regex_parse_food, search_terms
from .food_parser import ModelOutputError, ProviderUnavailable, parse_food_with_meta
from .llm import LLMProvider


# The model only extracts names here and the regex parser is a complete fallback, so it gets a short budget (Express waits 25 s).
EXTRACT_TIMEOUT_SECONDS = 12.0


async def lookup_food(api: KaizenApi, name: str) -> Optional[Dict[str, Any]]:
    for term in search_terms(name):
        foods = await api.get("/foods/search", params={"q": term, "limit": 5}) or []
        best = pick_best_food(name, foods)
        if best:
            return best
    return None


async def extract_items(provider: LLMProvider, text: str) -> "tuple[List[Dict[str, Any]], str, Optional[str]]":
    """(items, 'ai'|'fallback', model). Any model failure or invalid output falls back to the deterministic parser."""
    try:
        items, result = await parse_food_with_meta(provider, text, timeout=EXTRACT_TIMEOUT_SECONDS)
        return [i.model_dump() for i in items], "ai", result.model
    except (ProviderUnavailable, ModelOutputError) as e:
        print(f"[parse-food] model unavailable or invalid output ({e}); using regex fallback.")
        return regex_parse_food(text), "fallback", None


async def parse_food_for_user(api: KaizenApi, provider: LLMProvider, text: str) -> Dict[str, Any]:
    items, source, model = await extract_items(provider, text)
    results = []
    for item in items:
        try:
            food = await lookup_food(api, item["name"])
        except ApiError as e:
            if e.status in (401, 403):
                raise
            food = None  # a failed lookup degrades to "estimate, ask the user"; it never invents nutrition
        results.append(build_result(item, food))
    return {"items": results, "source": source, **({"model": model} if model else {})}
