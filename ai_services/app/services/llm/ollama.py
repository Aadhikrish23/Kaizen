from typing import Any, Dict, List, Optional

import httpx

from .base import LLMProvider, Message


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, base_url: str, model: str, default_timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.default_timeout = default_timeout

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    return {
                        "reachable": True,
                        "models": models,
                        "has_configured_model": any(self.model in (m or "") for m in models),
                    }
                return {"reachable": False, "error": f"HTTP {res.status_code}"}
        except Exception as e:  # noqa: BLE001 - health must never raise
            return {"reachable": False, "error": str(e)}

    async def chat(
        self,
        messages: List[Message],
        temperature: float = 0.6,
        json_mode: bool = False,
        timeout: Optional[float] = None,
    ) -> Optional[str]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "top_p": 0.9, "num_predict": 512},
        }
        if json_mode:
            payload["format"] = "json"
        try:
            async with httpx.AsyncClient(timeout=timeout or self.default_timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    return (res.json().get("message", {}).get("content") or "").strip() or None
                return None
        except Exception as e:  # noqa: BLE001
            print(f"[OllamaProvider] Request failed: {e}")
            return None
