from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ParseFoodRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class ParsedFoodItem(BaseModel):
    """One food mentioned in the text. Nutrition is deliberately NOT part of this model: extra keys are rejected,
    so a model that invents calories/macros fails validation instead of leaking made-up numbers."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100)
    quantity: float = Field(..., gt=0, le=10000)
    unit: str = Field(..., min_length=1, max_length=30)
    grams: Optional[float] = Field(default=None, gt=0, le=100000)
    confidence: float = Field(..., ge=0, le=1)


class ParseFoodResponse(BaseModel):
    items: List[ParsedFoodItem]
    model_used: str
    source: str = "llm"
