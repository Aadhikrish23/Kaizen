"""Endpoints for the signed-in user. The caller's Kaizen access token comes in the Authorization header; this service uses it to read
and write the user's data through the Express API, so nothing here can reach data the user themselves could not.
"""
import uuid
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ..assistant import runtime as assistant_runtime
from ..core.auth import get_api
from ..core.kaizen_api import ApiError, KaizenApi
from ..services.coach_service import coach_service
from ..services.llm import get_provider
from ..services.parse_pipeline import parse_food_for_user
from ..services.recommendations import get_meal_recommendations
from ..services.user_context import load_context, load_profile
from ..services.weekly_service import get_user_weekly_insight

router = APIRouter(prefix="/api/me", tags=["Signed-in user"])

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


def api_error_to_http(e: ApiError) -> HTTPException:
    """Express's own answer about the caller's token or data (400, 401, 403, 404, 429) is passed through. Anything else is an
    upstream failure and its text is not forwarded."""
    if e.status in (400, 401, 403, 404, 429):
        return HTTPException(status_code=e.status, detail={"code": e.code, "message": e.message})
    if e.status == 503:
        return HTTPException(status_code=503, detail={"code": "UPSTREAM_UNAVAILABLE", "message": "The Kaizen API is unavailable"})
    return HTTPException(status_code=502, detail={"code": "UPSTREAM_ERROR", "message": "The Kaizen API returned an error"})


class ParseFoodBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., min_length=1, max_length=500)


class HistoryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class ChatBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[List[HistoryMessage]] = Field(default=None, max_length=20)
    date: Optional[str] = Field(default=None, pattern=DATE_PATTERN)


@router.post("/parse-food")
async def parse_food(body: ParseFoodBody, api: KaizenApi = Depends(get_api)):
    try:
        return await parse_food_for_user(api, get_provider(), body.text.strip())
    except ApiError as e:
        raise api_error_to_http(e)


@router.get("/recommendations")
async def recommendations(
    date: Optional[str] = Query(default=None, pattern=DATE_PATTERN),
    limit: int = Query(default=5, ge=1, le=10),
    api: KaizenApi = Depends(get_api),
):
    try:
        user = await load_profile(api)
        return await get_meal_recommendations(api, user.get("timezone"), date, limit)
    except ApiError as e:
        raise api_error_to_http(e)


@router.get("/insight/daily")
async def daily_insight(date: Optional[str] = Query(default=None, pattern=DATE_PATTERN), api: KaizenApi = Depends(get_api)):
    try:
        _, profile, metrics = await load_context(api, date)
    except ApiError as e:
        raise api_error_to_http(e)
    result = await coach_service.get_insight(profile, metrics)
    return {"insight": result.insight, "category": result.category, "modelUsed": result.model_used}


@router.get("/insight/weekly")
async def weekly_insight(api: KaizenApi = Depends(get_api)):
    try:
        user = await load_profile(api)
        return await get_user_weekly_insight(api, user.get("name"), user.get("goal"))
    except ApiError as e:
        raise api_error_to_http(e)


# --- the action assistant (also answers coaching questions) -----------------------------------------------------------


@router.post("/assistant/chat")
async def assistant_chat(body: ChatBody, api: KaizenApi = Depends(get_api)):
    """Plain-language commands ("ate 2 rotis", "drank 500 ml water", "undo") and questions. `history` and `date` are accepted for
    compatibility with the coach chat; conversation memory is kept server-side per user and dates come from the user's own words."""
    try:
        return await assistant_runtime.chat(api, get_provider(), body.message, uuid.uuid4().hex[:24])
    except ApiError as e:
        raise api_error_to_http(e)


@router.post("/assistant/reset")
async def assistant_reset(api: KaizenApi = Depends(get_api)):
    try:
        user = await load_profile(api)
    except ApiError as e:
        raise api_error_to_http(e)
    assistant_runtime.reset(str(user.get("_id") or user.get("id")))
    return {"reset": True}
