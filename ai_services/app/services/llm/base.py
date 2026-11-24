from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

Message = Dict[str, str]  # {"role": "system" | "user" | "assistant", "content": str}


@dataclass(frozen=True)
class ChatResult:
    """A reply plus who actually produced it (matters when a fallback chain answers instead of the primary)."""

    text: str
    provider: str
    model: str


class LLMProvider(ABC):
    """Provider-neutral chat interface. Implementations never raise on network/API failure: they return None."""

    name: str = "base"
    model: str = ""

    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        temperature: float = 0.6,
        json_mode: bool = False,
        timeout: Optional[float] = None,
    ) -> Optional[str]:
        """Return the assistant text, or None if the provider is unreachable or returned an error.

        json_mode asks the provider for a JSON-only reply (best effort; callers must still validate).
        """

    async def chat_with_meta(
        self,
        messages: List[Message],
        temperature: float = 0.6,
        json_mode: bool = False,
        timeout: Optional[float] = None,
    ) -> Optional[ChatResult]:
        """Like chat(), but says which provider and model answered. Chains override this."""
        text = await self.chat(messages, temperature=temperature, json_mode=json_mode, timeout=timeout)
        return ChatResult(text=text, provider=self.name, model=self.model) if text else None

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Return {"reachable": bool, ...provider specific details}. Must not raise."""
