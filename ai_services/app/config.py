import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Provider selection: ollama (default) | openai | anthropic. API keys are read from the environment only.
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "ollama")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_BASE_URL: str = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    ANTHROPIC_VERSION: str = os.getenv("ANTHROPIC_VERSION", "2023-06-01")
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "phi3:mini")
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
