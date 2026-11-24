import re
import time
from typing import Any, Callable, Dict, List, Optional, Sequence

import httpx

from .base import ChatResult, LLMProvider, Message

# A model that failed (timeout, 5xx, empty reply) is skipped for this long so the next requests do not wait on it.
UNHEALTHY_SECONDS = 5 * 60
# "Not found for account": that model will keep 404ing for this key, so skip it for much longer.
UNUSABLE_SECONDS = 60 * 60
_FATAL_STATUSES = (401, 403, 429)


class _SkipModel(Exception):
    """This model failed in a way another model on the same key might not."""

    def __init__(self, reason: str, cooldown: float = UNHEALTHY_SECONDS):
        super().__init__(reason)
        self.reason = reason
        self.cooldown = cooldown


class _Fatal(Exception):
    """The key or the account is the problem (401/403/429): every model would fail the same way."""


class NvidiaNimProvider(LLMProvider):
    """NVIDIA NIM hosted models through its OpenAI-compatible endpoint (POST {base_url}/chat/completions).

    NVIDIA's shared endpoint is sometimes slow and a single model can be unavailable for an account, so one call tries
    the primary model with a short budget and then the fallback models on the same key. A bad key or a rate limit applies
    to every model, so it stops there instead of hammering the others.
    """

    name = "nvidia"

    def __init__(
        self,
        api_key: str,
        model: str,
        fallback_models: Sequence[str] = (),
        base_url: str = "https://integrate.api.nvidia.com/v1",
        default_timeout: float = 30.0,
        primary_timeout: float = 8.0,
        max_tokens: int = 1024,
        transport: Optional[httpx.AsyncBaseTransport] = None,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.api_key = (api_key or "").strip()
        self.model = model
        self.models: List[str] = list(dict.fromkeys(m for m in [model, *fallback_models] if m))
        self.base_url = base_url.rstrip("/")
        self.default_timeout = default_timeout
        self.primary_timeout = primary_timeout
        self.max_tokens = max_tokens
        self._transport = transport
        self._clock = clock
        self._skip_until: Dict[str, float] = {}

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def _client(self, timeout: float) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=timeout, transport=self._transport)

    async def check_health(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"reachable": False, "error": "NVIDIA_API_KEY is not set", "models": self.models}
        try:
            async with self._client(5.0) as client:
                res = await client.get(f"{self.base_url}/models", headers=self._headers())
            ok = res.status_code == 200
            return {"reachable": ok, "models": self.models, **({} if ok else {"error": f"HTTP {res.status_code}"})}
        except Exception as e:  # noqa: BLE001 - health must never raise
            return {"reachable": False, "error": str(e), "models": self.models}

    async def chat(
        self,
        messages: List[Message],
        temperature: float = 0.6,
        json_mode: bool = False,
        timeout: Optional[float] = None,
    ) -> Optional[str]:
        result = await self.chat_with_meta(messages, temperature=temperature, json_mode=json_mode, timeout=timeout)
        return result.text if result else None

    async def chat_with_meta(
        self,
        messages: List[Message],
        temperature: float = 0.6,
        json_mode: bool = False,
        timeout: Optional[float] = None,
    ) -> Optional[ChatResult]:
        if not self.api_key:
            return None

        now = self._clock()
        healthy = [m for m in self.models if self._skip_until.get(m, 0.0) <= now]
        # Everything recently failed: try them all again rather than give up.
        order = healthy or self.models
        # default_timeout is the cap: a caller can ask for less (a dashboard insight) but not more.
        deadline = now + (min(timeout, self.default_timeout) if timeout else self.default_timeout)

        for index, model in enumerate(order):
            remaining = deadline - self._clock()
            if remaining <= 0.5:
                break
            is_last = index == len(order) - 1
            budget = remaining if is_last else min(self.primary_timeout, remaining)
            try:
                text = await self._call(model, messages, temperature, json_mode, budget)
            except _Fatal as e:
                print(f"[NvidiaNimProvider] {e}")
                return None
            except _SkipModel as e:
                self._skip_until[model] = self._clock() + e.cooldown
                print(f"[NvidiaNimProvider] {model} failed ({e.reason}); trying the next model.")
                continue
            self._skip_until.pop(model, None)
            return ChatResult(text=text, provider=self.name, model=model)
        return None

    async def _call(self, model: str, messages: List[Message], temperature: float, json_mode: bool, timeout: float) -> str:
        # Nemotron-style hybrid reasoning models spend the whole token budget "thinking" before they answer unless it is
        # switched off; models without the switch ignore it. JSON mode is prompt-level only (no response_format): not every
        # hosted model accepts it, and callers validate the output anyway.
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": self.max_tokens,
            "stream": False,
            "chat_template_kwargs": {"thinking": False},
        }
        try:
            async with self._client(timeout) as client:
                res = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=self._headers())
        except httpx.TimeoutException:
            raise _SkipModel("timed out") from None
        except httpx.HTTPError as e:
            raise _SkipModel(f"unreachable: {type(e).__name__}") from None

        if res.status_code in _FATAL_STATUSES:
            reason = {401: "invalid API key", 403: "API key not allowed", 429: "rate limited"}[res.status_code]
            raise _Fatal(f"NVIDIA NIM rejected the request ({res.status_code}, {reason})")
        if res.status_code == 404:
            raise _SkipModel("model not available for this key", UNUSABLE_SECONDS)
        if res.status_code != 200:
            raise _SkipModel(f"HTTP {res.status_code}")

        try:
            choice = (res.json().get("choices") or [{}])[0]
        except ValueError:
            raise _SkipModel("reply was not JSON") from None
        if choice.get("finish_reason") == "content_filter":
            raise _SkipModel("content filtered")
        text = ((choice.get("message") or {}).get("content") or "").strip()
        # Some hosted reasoning models still inline their reasoning; keep only what follows it.
        text = re.sub(r"^<think>.*?</think>\s*", "", text, flags=re.DOTALL).strip()
        if not text:
            raise _SkipModel("empty reply")
        return text
