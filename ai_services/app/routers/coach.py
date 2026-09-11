from fastapi import APIRouter
from ..schemas.coach import (
    CoachChatRequest,
    CoachChatResponse,
    InsightRequest,
    InsightResponse
)
from ..services.coach_service import coach_service

router = APIRouter(prefix="/api/coach", tags=["AI Coach"])

@router.post("/chat", response_model=CoachChatResponse)
async def chat_with_coach(req: CoachChatRequest):
    return await coach_service.chat(
        message=req.message,
        history=req.conversation_history,
        profile=req.user_profile,
        metrics=req.daily_metrics
    )

@router.post("/insights", response_model=InsightResponse)
async def get_coach_insight(req: InsightRequest):
    return await coach_service.get_insight(
        profile=req.user_profile,
        metrics=req.daily_metrics
    )
