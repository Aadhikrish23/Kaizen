# AI assistant

`POST /api/v1/ai/chat` (alias `/ai/assistant/chat`) is both the coach and an action assistant. It logs and changes data from plain language and answers questions about the user's own data. The Python AI service (`ai_services/app/assistant/`) does the work as the signed-in user: it calls this API with the user's own access token, so ownership checks, validation and idempotency stay in Express and the AI service never touches the database.

## What it can do

| Say | It does |
|---|---|
| "ate 2 rotis and dal for lunch", "had 150 g chicken breast" | Logs meals. Nutrition comes only from the food database (or calories the user states). A food it cannot measure is refused, never guessed. |
| "drank 500 ml water", "a glass of water" | Logs water (glass = 250 ml, cup = 240 ml). |
| "I weigh 71.2 kg", "154 lb" | Logs weight in kg. |
| "slept 11pm to 7am" | Logs sleep (needs both times; asks otherwise). |
| "bench press 3 sets of 10 at 60kg" | Logs a workout; adds to the day's existing log. |
| "start today's workout" | Starts today's day from the plan (never overwrites an existing workout). |
| "make me a 4 day upper lower plan" | Generates a plan. Asks first when a plan exists. |
| "adapt my plan" | Adjusts the plan from the last workout. |
| "set my protein target to 160g" | Changes targets, goal, target weight, activity level or target date. Always asks first. |
| "how many calories do I have left?", "what did I eat today?" | Answers from the data, without a model. |
| "what should I eat tonight?" | Deterministic suggestions from the remaining targets. |
| "undo" | Takes back the last change (30 minutes, one level). |

Add "yesterday" or "3 days ago" to log for a past day (taken from the user's own words, in their timezone). Reply "yes" or "no" to a confirmation question.

## How a message is handled

pending yes/no, then undo, greeting and help, then the **fast path** (plain commands and data questions, no model), then the **model planner** (turns the message into JSON intents), then **grounding**, then confirmation, then the actions, then a reply built from what actually happened.

Safety rules, enforced in code rather than by the prompt:

- The model only proposes. Unknown intent types and out-of-range parameters are dropped (`models.py`).
- A message that only asks a question never changes data.
- Every number must be one the user wrote (or a fixed unit conversion of it); foods and exercises must be ones they named; meal types and relative dates come from their words, not the model (`grounding.py`).
- Replies about changes come from the real results of the actions, so the assistant cannot claim to have done something it did not.
- Creates carry an idempotency key, so a retried request cannot log twice. Profile changes, plan replacement and similar are confirmed first.
- Conversation memory, the pending question and the undo snapshot are per user, in the AI service's memory only (one instance; a restart clears them).

When the model cannot be reached, commands and data questions still work; anything else says so instead of answering a log command with advice.

## Operating it

- Configuration: [deployment.md](deployment.md). The AI service needs `KAIZEN_API_URL` and (recommended) the shared `AI_INTERNAL_TOKEN`, which lets its calls back into the API skip the per-IP rate limit; users stay limited per account.
- Tests: `ai_services/tests/` (`python -m unittest discover tests`: providers, parity with the TypeScript it replaced, the assistant against an in-memory fake API, routes) and `scripts/smoke.d/47-ai-assistant.sh` (the real API, no model).
- Not verified: behaviour with a real language model (planning quality, prompts), and the multi-instance case (memory is per process).
