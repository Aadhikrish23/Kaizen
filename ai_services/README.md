# Kaizen AI service

FastAPI microservice used by the Express server for coach chat, daily insight and food-text parsing.

## LLM providers

All LLM calls go through `app/services/llm` (`LLMProvider`: `chat(messages, temperature, json_mode)`, `chat_with_meta(...)` which also says
which provider and model answered, and `check_health()`). The primary provider is chosen with `AI_PROVIDER` (default `nvidia`). Keys are
read from environment variables only.

`AI_FALLBACK_PROVIDERS` (comma separated, default `ollama`; set it empty for none) lists providers tried in order when the primary gives
no answer. The whole chain shares one time budget (`AI_CHAIN_TIMEOUT_SECONDS`, default 40 s, under the 45 s the Express server waits for
chat), and each provider only gets the time that is left. Responses report the provider and model that actually answered.

| `AI_PROVIDER` | Class | Environment |
| --- | --- | --- |
| `nvidia` | `NvidiaNimProvider` | `NVIDIA_API_KEY` (from build.nvidia.com), `NVIDIA_MODEL` (default `nvidia/nemotron-3-super-120b-a12b`), `NVIDIA_FALLBACK_MODELS` (default `openai/gpt-oss-20b`, tried in order on the same key), `NVIDIA_BASE_URL` (default `https://integrate.api.nvidia.com/v1`), `NVIDIA_PRIMARY_TIMEOUT_SECONDS` (8) and `NVIDIA_TIMEOUT_SECONDS` (25) |
| `ollama` | `OllamaProvider` | `OLLAMA_HOST` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `phi3:mini`) |
| `openai` | `OpenAICompatibleProvider` | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` (default `https://api.openai.com/v1`; point it at any OpenAI-compatible gateway) |
| `anthropic` | `AnthropicProvider` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, optional `ANTHROPIC_BASE_URL` |

Providers never raise on network or API errors: they return `None` and callers fall back to deterministic heuristics.
`GET /api/health` always returns 200 while the process is up and reports `provider`, `model` and `reachable`.

Other settings: `PORT`, `REQUEST_TIMEOUT_SECONDS`, `CORS_ORIGINS` (comma separated, never `*`).

## Signed-in user endpoints (`/api/me/*`)

Called by the Express server, which forwards the user's own access token (`Authorization: Bearer ...`). The service reads and changes data back through the Express API as that user (`KAIZEN_API_URL`, optional shared secret `AI_INTERNAL_TOKEN`), never the database.

- `POST /api/me/assistant/chat` `{message}`: the action assistant ([../docs/assistant.md](../docs/assistant.md)); `POST /api/me/assistant/reset`
- `POST /api/me/parse-food`, `GET /api/me/recommendations`, `GET /api/me/insight/daily`, `GET /api/me/insight/weekly`: ported from the Express server; `tests/test_port_parity.py` checks them against golden outputs generated from the original TypeScript.

## Endpoints (stateless; context in the body)

- `POST /api/coach/chat`, `POST /api/coach/insights`
- `POST /api/parse-food` `{text}` (1..500 chars): the model only extracts `{name, quantity, unit, grams, confidence}` items. Output is validated strictly
  (extra keys such as calories are rejected); 503 if the provider is down, 502 if its output is invalid. Nutrition is never produced here:
  the Express layer looks it up in the food database.

## Tests

Install dependencies first (`pip install -r requirements.txt`). No network or API keys are needed (a fake provider is used):

    python -m unittest discover tests
