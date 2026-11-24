import asyncio
import time
from typing import Any, Callable, Dict, List, Optional, Sequence

from .base import ChatResult, LLMProvider, Message


class FallbackProvider(LLMProvider):
    """Tries providers in order and returns the first reply, e.g. NVIDIA first and a local Ollama second.

    Like every provider it never raises: if nothing answers it returns None and callers use their heuristics.
    """

    def __init__(self, providers: Sequence[LLMProvider], total_timeout: float = 40.0, clock: Callable[[], float] = time.monotonic):
        if not providers:
            raise ValueError("FallbackProvider needs at least one provider")
        self.providers: List[LLMProvider] = list(providers)
        # One budget for the whole chain, so a slow primary cannot push the answer past the caller's own timeout
        # (the Express server waits 45 s for chat). Each provider gets only the time that is left.
        self.total_timeout = total_timeout
        self._clock = clock

    @property
    def name(self) -> str:  # type: ignore[override]
        return self.providers[0].name

    @property
    def model(self) -> str:  # type: ignore[override]
        return self.providers[0].model

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
        deadline = self._clock() + (timeout or self.total_timeout)
        for provider in self.providers:
            remaining = deadline - self._clock()
            if remaining <= 0.5:
                break
            try:
                result = await provider.chat_with_meta(messages, temperature=temperature, json_mode=json_mode, timeout=remaining)
            except Exception as e:  # noqa: BLE001 - one broken provider must not stop the chain
                print(f"[FallbackProvider] {provider.name} raised {type(e).__name__}; trying the next provider.")
                continue
            if result:
                return result
        return None

    async def check_health(self) -> Dict[str, Any]:
        reports = await asyncio.gather(*(p.check_health() for p in self.providers), return_exceptions=True)
        details: List[Dict[str, Any]] = []
        for provider, report in zip(self.providers, reports):
            body = report if isinstance(report, dict) else {"reachable": False, "error": str(report)}
            details.append({"provider": provider.name, "model": provider.model, **body})
        return {"reachable": any(d.get("reachable") for d in details), "chain": details}
