from typing import Any, Dict, List, Optional

import httpx

from .base import LLMProvider, Message


class OpenAICompatibleProvider(LLMProvider):
    """Works with OpenAI and any gateway exposing POST {base_url}/chat/completions (Azure-style gateways, vLLM, LiteLLM...)."""

    name = "openai"

    def __init__(self, base_url: str, api_key: str, model: str, default_timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.default_timeout = default_timeout

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def check_health(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"reachable": False, "error": "OPENAI_API_KEY is not set"}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/models", headers=self._headers())
                return {"reachable": res.status_code == 200, **({} if res.status_code == 200 else {"error": f"HTTP {res.status_code}"})}
        except Exception as e:  # noqa: BLE001
            return {"reachable": False, "error": str(e)}

    async def chat(
        self,
        messages: List[Message],
        temperature: float = 0.6,
        json_mode: bool = False,
        timeout: Optional[float] = None,
    ) -> Optional[str]:
        if not self.api_key:
            return None
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 512,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        try:
            async with httpx.AsyncClient(timeout=timeout or self.default_timeout) as client:
                res = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=self._headers())
                if res.status_code != 200:
                    return None
                choices = res.json().get("choices") or []
                content = (choices[0].get("message", {}).get("content") if choices else None) or ""
                return content.strip() or None
        except Exception as e:  # noqa: BLE001
            print(f"[OpenAICompatibleProvider] Request failed: {e}")
            return None
