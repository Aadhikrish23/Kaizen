import httpx
from typing import List, Dict, Any, Optional
from ..config import settings

class OllamaClient:
    def __init__(self, base_url: str = settings.OLLAMA_HOST, default_model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip('/')
        self.default_model = default_model

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama server is accessible and list installed models."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    has_model = any(self.default_model in m for m in models)
                    return {
                        "online": True,
                        "models": models,
                        "has_default_model": has_model,
                        "default_model": self.default_model
                    }
        except Exception as e:
            return {
                "online": False,
                "error": str(e),
                "models": [],
                "has_default_model": False,
                "default_model": self.default_model
            }
        return {"online": False, "models": [], "has_default_model": False, "default_model": self.default_model}

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.6,
        timeout: float = settings.REQUEST_TIMEOUT_SECONDS
    ) -> Optional[str]:
        """Send chat completion request to Ollama /api/chat."""
        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": 0.9,
                "num_predict": 512
            }
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    message = data.get("message", {})
                    return message.get("content", "").strip()
                else:
                    return None
        except Exception as e:
            print(f"[OllamaClient] Request failed: {e}")
            return None

ollama_client = OllamaClient()
