from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health, coach, food
from .services.llm import get_provider

app = FastAPI(
    title="Kaizen AI Intelligence Service",
    description="Microservice providing personalized fitness, nutrition, and lifestyle coaching using a configurable LLM provider (Ollama, OpenAI-compatible or Anthropic)",
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
app.include_router(food.router)

@app.on_event("startup")
async def startup_event():
    print(f"[Kaizen AI] Service starting on port {settings.PORT}...")
    provider = get_provider()
    print(f"[Kaizen AI] LLM provider: {provider.name} (model: {provider.model})")
