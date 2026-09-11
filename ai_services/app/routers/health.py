from fastapi import APIRouter
from ..services.ollama_client import ollama_client
from ..config import settings

router = APIRouter(prefix="/api", tags=["System Health"])

@router.get("/health")
async def health_check():
    ollama_status = await ollama_client.check_health()
    return {
        "status": "healthy",
        "service": "Kaizen AI Service",
        "version": "1.0.0",
        "ollama": ollama_status,
        "configured_model": settings.OLLAMA_MODEL
    }
