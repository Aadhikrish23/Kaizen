from typing import List, Optional
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the speaker: user, assistant, or system")
    content: str = Field(..., description="Message text content")

class UserProfileContext(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    heightCm: Optional[float] = None
    currentWeightKg: Optional[float] = None
    goal: Optional[str] = None
    activityLevel: Optional[str] = None
    calorieDailyTarget: Optional[int] = 2000
    proteinDailyTargetG: Optional[int] = 150
    waterDailyTargetMl: Optional[int] = 2500

class DailyMetricsContext(BaseModel):
    date: Optional[str] = None
    totalCalories: Optional[int] = 0
    remainingCalories: Optional[int] = 2000
    totalProteinG: Optional[int] = 0
    remainingProteinG: Optional[int] = 150
    totalCarbsG: Optional[int] = 0
    totalFatG: Optional[int] = 0
    waterMl: Optional[int] = 0
    remainingWaterMl: Optional[int] = 2500
    workoutsLogged: Optional[int] = 0
    totalVolumeKg: Optional[float] = 0.0

class CoachChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's query to the coach")
    conversation_history: Optional[List[ChatMessage]] = Field(default_factory=list)
    user_profile: Optional[UserProfileContext] = None
    daily_metrics: Optional[DailyMetricsContext] = None

class CoachChatResponse(BaseModel):
    reply: str
    model_used: str
    context_applied: bool
    source: str = "ollama"

class InsightRequest(BaseModel):
    user_profile: Optional[UserProfileContext] = None
    daily_metrics: Optional[DailyMetricsContext] = None

class InsightResponse(BaseModel):
    insight: str
    category: str = "general"
    model_used: str
