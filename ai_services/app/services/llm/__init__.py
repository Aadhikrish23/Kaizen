from typing import Optional

from ...config import Settings, settings
from .anthropic import AnthropicProvider
from .base import LLMProvider, Message
from .ollama import OllamaProvider
from .openai_compat import OpenAICompatibleProvider

__all__ = ["LLMProvider", "Message", "OllamaProvider", "OpenAICompatibleProvider", "AnthropicProvider", "build_provider", "get_provider", "set_provider"]


def build_provider(cfg: Settings) -> LLMProvider:
    """Select a provider from configuration (AI_PROVIDER = ollama | openai | anthropic). Keys come from env only."""
    name = (cfg.AI_PROVIDER or "ollama").strip().lower()
    if name == "ollama":
        return OllamaProvider(cfg.OLLAMA_HOST, cfg.OLLAMA_MODEL, cfg.REQUEST_TIMEOUT_SECONDS)
    if name in ("openai", "openai_compatible"):
        return OpenAICompatibleProvider(cfg.OPENAI_BASE_URL, cfg.OPENAI_API_KEY, cfg.OPENAI_MODEL, cfg.REQUEST_TIMEOUT_SECONDS)
    if name == "anthropic":
        return AnthropicProvider(cfg.ANTHROPIC_API_KEY, cfg.ANTHROPIC_MODEL, cfg.ANTHROPIC_BASE_URL, cfg.ANTHROPIC_VERSION, cfg.REQUEST_TIMEOUT_SECONDS)
    raise ValueError(f"Unknown AI_PROVIDER '{cfg.AI_PROVIDER}' (expected ollama, openai or anthropic)")


_provider: Optional[LLMProvider] = None


def get_provider() -> LLMProvider:
    global _provider
    if _provider is None:
        _provider = build_provider(settings)
    return _provider


def set_provider(provider: Optional[LLMProvider]) -> None:
    """Override (or reset with None) the active provider; used by tests."""
    global _provider
    _provider = provider
