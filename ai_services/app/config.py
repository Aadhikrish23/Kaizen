import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
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
