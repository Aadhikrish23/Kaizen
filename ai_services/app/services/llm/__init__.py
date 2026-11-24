from typing import Optional

from ...config import Settings, settings
from .anthropic import AnthropicProvider
from .base import ChatResult, LLMProvider, Message
from .fallback import FallbackProvider
from .nvidia import NvidiaNimProvider
from .ollama import OllamaProvider
from .openai_compat import OpenAICompatibleProvider

__all__ = [
    "LLMProvider", "Message", "ChatResult", "FallbackProvider", "NvidiaNimProvider", "OllamaProvider",
    "OpenAICompatibleProvider", "AnthropicProvider", "build_provider", "get_provider", "set_provider",
]


def _csv(value: str) -> list:
    return [v.strip() for v in (value or "").split(",") if v.strip()]


def build_single_provider(name: str, cfg: Settings) -> LLMProvider:
    name = (name or "").strip().lower()
    if name == "nvidia":
        return NvidiaNimProvider(
            cfg.NVIDIA_API_KEY, cfg.NVIDIA_MODEL, _csv(cfg.NVIDIA_FALLBACK_MODELS), cfg.NVIDIA_BASE_URL,
            default_timeout=cfg.NVIDIA_TIMEOUT_SECONDS, primary_timeout=cfg.NVIDIA_PRIMARY_TIMEOUT_SECONDS,
        )
    if name == "ollama":
        return OllamaProvider(cfg.OLLAMA_HOST, cfg.OLLAMA_MODEL, cfg.REQUEST_TIMEOUT_SECONDS)
    if name in ("openai", "openai_compatible"):
        return OpenAICompatibleProvider(cfg.OPENAI_BASE_URL, cfg.OPENAI_API_KEY, cfg.OPENAI_MODEL, cfg.REQUEST_TIMEOUT_SECONDS)
    if name == "anthropic":
        return AnthropicProvider(cfg.ANTHROPIC_API_KEY, cfg.ANTHROPIC_MODEL, cfg.ANTHROPIC_BASE_URL, cfg.ANTHROPIC_VERSION, cfg.REQUEST_TIMEOUT_SECONDS)
    raise ValueError(f"Unknown AI provider '{name}' (expected nvidia, ollama, openai or anthropic)")


def build_provider(cfg: Settings) -> LLMProvider:
    """AI_PROVIDER first, then each AI_FALLBACK_PROVIDERS entry that is not already in the chain. Keys come from env only."""
    primary = (cfg.AI_PROVIDER or "nvidia").strip().lower()
    names = list(dict.fromkeys([primary, *[n.lower() for n in _csv(cfg.AI_FALLBACK_PROVIDERS)]]))
    providers = [build_single_provider(n, cfg) for n in names]
    return providers[0] if len(providers) == 1 else FallbackProvider(providers, total_timeout=cfg.AI_CHAIN_TIMEOUT_SECONDS)


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
