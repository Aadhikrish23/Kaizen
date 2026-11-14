from typing import Any, Dict, List, Optional

import httpx

from .base import LLMProvider, Message

JSON_ONLY_INSTRUCTION = "Respond with a single valid JSON value and nothing else (no prose, no code fences)."


class AnthropicProvider(LLMProvider):
    """Anthropic Messages API via httpx."""

    name = "anthropic"

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str = "https://api.anthropic.com",
        api_version: str = "2023-06-01",
        default_timeout: float = 60.0,
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_version = api_version
        self.default_timeout = default_timeout

    def _headers(self) -> Dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": self.api_version,
            "content-type": "application/json",
        }

    @staticmethod
    def split_messages(messages: List[Message], json_mode: bool = False):
        """The Messages API takes `system` separately and only user/assistant turns in `messages`."""
        system_parts = [m["content"] for m in messages if m["role"] == "system"]
        if json_mode:
            system_parts.append(JSON_ONLY_INSTRUCTION)
        turns = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] in ("user", "assistant")]
        return "\n\n".join(system_parts), turns

    async def check_health(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"reachable": False, "error": "ANTHROPIC_API_KEY is not set"}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/v1/models", headers=self._headers())
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
        system, turns = self.split_messages(messages, json_mode)
        payload: Dict[str, Any] = {
            "model": self.model,
            "max_tokens": 512,
            "temperature": temperature,
            "messages": turns,
        }
        if system:
            payload["system"] = system
        try:
            async with httpx.AsyncClient(timeout=timeout or self.default_timeout) as client:
                res = await client.post(f"{self.base_url}/v1/messages", json=payload, headers=self._headers())
                if res.status_code != 200:
                    return None
                blocks = res.json().get("content") or []
                text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
                return text.strip() or None
        except Exception as e:  # noqa: BLE001
            print(f"[AnthropicProvider] Request failed: {e}")
            return None
