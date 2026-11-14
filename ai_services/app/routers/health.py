from fastapi import APIRouter
from ..services.llm import get_provider

router = APIRouter(prefix="/api", tags=["System Health"])

@router.get("/health")
async def health_check():
    """Always 200 while the API process is up (the container healthcheck relies on it), even if the provider is down."""
    provider = get_provider()
    details = await provider.check_health()
    return {
        "status": "healthy",
        "service": "Kaizen AI Service",
        "version": "1.0.0",
        "provider": provider.name,
        "model": provider.model,
        "reachable": bool(details.get("reachable")),
        "details": details,
    }
