from fastapi import APIRouter

from ..schemas.coach import InsightResponse
from ..schemas.weekly import WeeklyInsightRequest
from ..services.weekly_service import get_weekly_insight

router = APIRouter(prefix="/api/coach", tags=["AI Coach"])


@router.post("/weekly-insight", response_model=InsightResponse)
async def weekly_insight(req: WeeklyInsightRequest):
    return await get_weekly_insight(req.user_profile, req.weekly_metrics)
