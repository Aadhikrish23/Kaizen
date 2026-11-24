from fastapi import APIRouter, HTTPException

from ..schemas.food import ParseFoodRequest, ParseFoodResponse
from ..services.food_parser import ModelOutputError, ProviderUnavailable, parse_food_with_meta
from ..services.llm import get_provider

router = APIRouter(prefix="/api", tags=["Food Parsing"])


@router.post("/parse-food", response_model=ParseFoodResponse)
async def parse_food(req: ParseFoodRequest):
    provider = get_provider()
    try:
        items, result = await parse_food_with_meta(provider, req.text)
    except ProviderUnavailable:
        raise HTTPException(status_code=503, detail="LLM provider unavailable")
    except ModelOutputError as e:
        raise HTTPException(status_code=502, detail=f"Model returned invalid output: {e}")
    return ParseFoodResponse(items=items, model_used=result.model, source=result.provider)
