# Kaizen

AI-powered health tracking platform: nutrition, hydration, weight, sleep and workouts in one daily dashboard, plus an equipment-aware adaptive workout planner and an AI coach. Named for the Japanese philosophy of *kaizen* (continuous improvement).

**Status: MVP in progress.** Core tracking and the workout planner work end to end; AI parsing/recommendations, gamification and global search are still stubs. See [docs/implementation/current_state.md](docs/implementation/current_state.md) for the full, honest picture and [docs/product/requirement_traceability_matrix.md](docs/product/requirement_traceability_matrix.md) for requirement-by-requirement status. Product context lives in [PRODUCT.md](PRODUCT.md).

## Stack

| Part | Tech |
|---|---|
| `client/` | React 18, TypeScript, Vite 5, TailwindCSS, TanStack Query, React Router 7, Recharts, jsPDF (plan export), PWA manifest |
| `server/` | Express 4, TypeScript, Mongoose 8 / MongoDB, JWT auth (access + refresh), Zod validation, helmet / rate-limit / mongo-sanitize |
| `ai_services/` | FastAPI + Pydantic v2, talks to a local Ollama model (default `phi3:mini`) |
| `e2e/` | Playwright (chromium, firefox, webkit) |

## Architecture

Both apps are organized **feature-first** (see [project_rules.md](project_rules.md)). On the server each feature owns its routes, controller, service, schema and model(s):

```
server/src/
  features/
    auth/  profile/  water/  meals/  foods/  recipes/  externalFood/
    weight/  measurements/  sleep/  exercises/  workouts/  routines/
    inventory/  planner/  analytics/  summary/  ai/
      <feature>.routes.ts  <feature>.controller.ts  <feature>.service.ts
      <feature>.schema.ts  <Model>.ts
    planner/engine/        # biomechanical workout-generation engine (12 modules)
    planner/__tests__/     # planner engine + adversarial test suites
  middleware/  config/  types/  docs/   # shared infrastructure
  scripts/                              # seed + migration scripts
  server.ts
```

Cross-feature reads (analytics, summary, AI context) import the owning feature's model directly; shared infrastructure stays at the `src` root.

The AI coach is isolated by design: if the FastAPI/Ollama service is down, `chatWithCoach` / `getDailyInsight` return a heuristic reply built from the user's logged data, so core tracking never depends on AI uptime.

## Running locally

Prerequisites: Node 20+, MongoDB, Python 3.10+ and [Ollama](https://ollama.com) (optional; AI falls back to a heuristic reply without it).

```bash
# 1. MongoDB (example using Docker)
docker run -d --name kaizen-mongo -p 27017:27017 mongo:latest

# 2. API  (http://localhost:5000, Swagger at /api-docs)
cd server && npm install
# create server/.env:  PORT=5000  MONGODB_URI=mongodb://localhost:27017/kaizen_db
#                      JWT_SECRET=<your secret>  CORS_ORIGIN=http://localhost:5173
npm run dev

# 3. Web app  (http://localhost:5173)
cd client && npm install && npm run dev

# 4. AI service (optional, http://localhost:8000)
cd ai_services && pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Seed data (exercise directory, foods, demo videos) comes from the scripts in `server/src/scripts/`, e.g. `npx ts-node --transpile-only src/scripts/seedComprehensiveExercises.ts`.

## Testing

```bash
# Workout planner engine (11 tests) and adversarial suite (15 scenarios)
cd server
npx ts-node --transpile-only src/features/planner/__tests__/plannerEngine.test.ts
npx ts-node --transpile-only src/features/planner/__tests__/adversarialPlanner.test.ts

# Type checks
cd server && npx tsc --noEmit
cd client && npx tsc -b --noEmit

# Browser e2e (needs MongoDB + server + client running; client must be on :5173)
cd e2e && npx playwright test
```

There is no `npm test` script or CI yet. When running the whole e2e suite against dev servers, use `--workers=1` (or a low worker count): 8 parallel browsers against `ts-node-dev` + Vite dev produce timeout flakes that disappear when run serially.

## Known issues

See [docs/implementation/current_state.md](docs/implementation/current_state.md#known-gaps-and-risks) for the maintained list. Highlights: stubbed AI food parsing / recommendations / global search, no gamification, no CI, `docker-compose.yml` lacks the AI service and sets `MONGO_URI` while the server reads `MONGODB_URI`, and Swagger documents only the auth endpoints.
