# Kaizen AI service

FastAPI microservice used by the Express server for coach chat, daily insight and food-text parsing.

## LLM providers

All LLM calls go through `app/services/llm` (`LLMProvider`: `chat(messages, temperature, json_mode)` and `check_health()`).
The provider is chosen with `AI_PROVIDER` (default `ollama`). Keys are read from environment variables only.

| `AI_PROVIDER` | Class | Environment |
| --- | --- | --- |
| `ollama` | `OllamaProvider` | `OLLAMA_HOST` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `phi3:mini`) |
| `openai` | `OpenAICompatibleProvider` | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` (default `https://api.openai.com/v1`; point it at any OpenAI-compatible gateway) |
| `anthropic` | `AnthropicProvider` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, optional `ANTHROPIC_BASE_URL` |

Providers never raise on network or API errors: they return `None` and callers fall back to deterministic heuristics.
`GET /api/health` always returns 200 while the process is up and reports `provider`, `model` and `reachable`.

Other settings: `PORT`, `REQUEST_TIMEOUT_SECONDS`, `CORS_ORIGINS` (comma separated, never `*`).

## Endpoints

- `POST /api/coach/chat`, `POST /api/coach/insights`
- `POST /api/parse-food` `{text}` (1..500 chars): the model only extracts `{name, quantity, unit, grams, confidence}` items. Output is validated strictly
  (extra keys such as calories are rejected); 503 if the provider is down, 502 if its output is invalid. Nutrition is never produced here:
  the Express layer looks it up in the food database.

## Tests

Install dependencies first (`pip install -r requirements.txt`). No network or API keys are needed (a fake provider is used):

    python -m unittest discover tests
