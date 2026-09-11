from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health, coach

app = FastAPI(
    title="Kaizen AI Intelligence Service",
    description="Microservice providing personalized fitness, nutrition, and lifestyle coaching using local Ollama LLMs",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(coach.router)

@app.on_event("startup")
async def startup_event():
    print(f"[Kaizen AI] Service starting on port {settings.PORT}...")
    print(f"[Kaizen AI] Connected Ollama endpoint: {settings.OLLAMA_HOST}")
    print(f"[Kaizen AI] Configured LLM model: {settings.OLLAMA_MODEL}")
