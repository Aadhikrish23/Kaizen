from typing import List, Optional

from pydantic import BaseModel, Field

from .coach import UserProfileContext


class WeeklyMetricsContext(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_with_data: int = Field(0, ge=0, le=31)
    avg_calories: Optional[float] = None
    avg_protein_g: Optional[float] = None
    avg_water_ml: Optional[float] = None
    avg_sleep_hours: Optional[float] = None
    workout_count: int = Field(0, ge=0)
    total_volume_kg: Optional[float] = None
    weight_change_kg: Optional[float] = None
    missing: List[str] = Field(default_factory=list)


class WeeklyInsightRequest(BaseModel):
    user_profile: Optional[UserProfileContext] = None
    weekly_metrics: WeeklyMetricsContext
