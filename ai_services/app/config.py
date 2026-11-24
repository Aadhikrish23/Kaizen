import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Provider selection: nvidia (default) | ollama | openai | anthropic. API keys are read from the environment only.
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "nvidia")
    # Comma-separated providers tried, in order, when the primary one gives no answer. Empty = no fallback chain.
    AI_FALLBACK_PROVIDERS: str = os.getenv("AI_FALLBACK_PROVIDERS", "ollama")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL") or "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = os.getenv("NVIDIA_MODEL") or "nvidia/nemotron-3-super-120b-a12b"
    # Other models on the same key, tried in order when the primary model is slow or unavailable.
    NVIDIA_FALLBACK_MODELS: str = os.getenv("NVIDIA_FALLBACK_MODELS") or "openai/gpt-oss-20b"
    # Seconds the primary model gets before the next model is tried (healthy replies take 1-5 s).
    NVIDIA_PRIMARY_TIMEOUT_SECONDS: float = float(os.getenv("NVIDIA_PRIMARY_TIMEOUT_SECONDS", "8.0"))
    # Most time one NVIDIA call may take across all its models, and across the whole provider chain (the Express
    # server gives up on a chat reply after 45 s).
    NVIDIA_TIMEOUT_SECONDS: float = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "25.0"))
    AI_CHAIN_TIMEOUT_SECONDS: float = float(os.getenv("AI_CHAIN_TIMEOUT_SECONDS", "40.0"))
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_BASE_URL: str = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    ANTHROPIC_VERSION: str = os.getenv("ANTHROPIC_VERSION", "2023-06-01")
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "phi3:mini")
    # The Express API the assistant reads and writes through, as the signed-in user (never the database directly).
    KAIZEN_API_URL: str = os.getenv("KAIZEN_API_URL", "http://localhost:5000/api/v1")
    # Shared secret (AI_INTERNAL_TOKEN, same value as on the Express server) sent as X-Kaizen-Internal so Express can skip its per-IP
    # limiter for this server-to-server hop. Users stay limited per account.
    KAIZEN_INTERNAL_TOKEN: str = os.getenv("AI_INTERNAL_TOKEN", "")
    KAIZEN_API_TIMEOUT_SECONDS: float = float(os.getenv("KAIZEN_API_TIMEOUT_SECONDS", "10.0"))
    PORT: int = int(os.getenv("PORT", "8000"))
    REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "60.0"))
    # Comma-separated list in the CORS_ORIGINS env var; never "*" (credentials are allowed).
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173,http://127.0.0.1:5000",
        ).split(",")
        if o.strip() and o.strip() != "*"
    ]

settings = Settings()
