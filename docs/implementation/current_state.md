# Current State

**Last reviewed:** 2026-11-13 (reflects `main` at the commit that introduced this file)
**Stage:** MVP in progress

This replaces the earlier "Phase-1 foundation" snapshot, which described an app with no auth, no tests and no service layer. That snapshot was written at project start and was never updated; almost everything it lists as missing now exists. Requirement-level status is in [../product/requirement_traceability_matrix.md](../product/requirement_traceability_matrix.md).

## What was there (baseline, commit `1bb53fe`)

A working full-stack app that had grown in bulk phases (see `git log`):

- **Server:** Express + Mongoose + TypeScript in a *layered* layout (`routes/ controllers/ services/ models/ schemas/`), 18 route groups, 14 models, JWT auth with refresh tokens, Zod request validation, helmet / rate limiting / Mongo-sanitize, Swagger UI.
- **Client:** React + Vite + Tailwind, feature-first folders, protected routing with an onboarding gate, athletic dark theme.
- **Tracking:** water, meals (+ foods, recipes, external recipe/food import), weight, body measurements, sleep, workouts (set-by-set, RPE, volume), routines, equipment inventory, analytics charts, daily summary.
- **Workout planner:** a 12-module biomechanical engine (`catalog`, `movementModel`, `weeklyBalanceEngine`, `timeBudgetEngine`, `progressiveOverloadEngine`, `bodyweightProgressionEngine`, `redundancyDetector`, `conditioningEngine`, `inventoryEvaluator`, `plannerQualityScorer`, `plannerExplainability`, `sessionIntentValidator`) with its own tests.
- **AI:** FastAPI service calling a local Ollama model for coach chat and daily insight, with a heuristic fallback in the Express layer.
- **Tests:** 11 planner engine tests, 15 adversarial planner scenarios, 8 Playwright specs.
- **Known problems at the time:** the e2e `full-walkthrough` spec failed on its first assertion; several features implied "done" by commit messages were stubs (below); status docs were stale; the README was empty.

## What was completed in this round

| # | Change | Commit |
|---|---|---|
| 1 | Full codebase audit (scope, built vs partial vs missing, stack, risks, git history). Findings feed the sections below. | - |
| 2 | **Server migrated to feature-first architecture.** 104 files moved with `git mv` into `server/src/features/<feature>/` and `server/src/scripts/`, relative imports rewritten by script; seed/migration scripts moved to `server/src/scripts/`; shared infra left at the root. No behavior change. | `909ff2a` |
| 3 | **Bug: Scale Weight page unreachable.** The `weight` tab and its render branch existed but nothing navigated to it. Added to `navItems`. | `e4b480b` |
| 4 | **Bug: saving a weight crashed the page** (`history.find is not a function`). `GET /weight` returns one day's log but the tracker treated it as a history list; `getHistory` existed server-side but was never routed. Added `GET /weight/history`, a `useWeightHistory` hook, and corrected `WeightTracker`. | `e4b480b` |
| 5 | **E2E `full-walkthrough.spec.ts` re-synced** to the current UI (20+ stale assertions; "Push to Today's Workout Tracker" is now "Start This Workout"; the "Adapt Daily" phase removed because that UI no longer exists). | `7632194` |
| 6 | E2E screenshots refreshed from the latest runs. | `c15ac0a` |
| 7 | `PRODUCT.md` (product context: users, positioning, capabilities, constraints, principles), `README.md`, this file, and the traceability matrix brought up to date. | docs commit |

## Verified state

- `tsc --noEmit` clean for `server/` and `client/`.
- Planner suites pass from their new location: 11/11 engine tests, 15/15 adversarial scenarios.
- **E2E, first full run** (36 tests: 8 specs x 3 browsers, 8 parallel workers): 26 passed, 10 failed. Seven of the failures (`clean-custom-planner` on chromium and firefox, `export-workout-pdf` on chromium) were dev-server contention, not regressions: re-running those specs plus `full-walkthrough` with `--workers=1` passed 12 of 15, the 3 failures all being `full-walkthrough` (a real stale-test problem on all three browsers, fixed in item 5). The server logged no errors during the run.
- **E2E, after fixes:** `full-walkthrough.spec.ts` passes end to end on **chromium**, covering all 9 phases (registration, onboarding, dashboard, AI coach, hydration, nutrition + recipe explorer, workouts hub, weight + measurements, analytics, profile).
- **Not re-run since the fixes:** the complete suite across chromium, firefox and webkit, and `full-walkthrough` on firefox/webkit. Run `cd e2e && npx playwright test --workers=1` before relying on a fully green suite.
- The AI coach path was exercised with Ollama/FastAPI **not running**, so the heuristic fallback (not the LLM) is what the e2e run verified.

## Known gaps and risks

**Stubbed features (look shipped, are not).** Commit `622708a` describes them as delivered:
- `parseFoodText` returns a hardcoded 250 kcal item regardless of input, `getRecommendations` returns two static foods, and `globalSearch` always returns empty arrays (`server/src/features/ai/ai.controller.ts`).
- Gamification (XP, levels, streaks, achievements) has no model, service or UI. The dashboard's "Kaizen Readiness" score is a separate, working, client-side composite. These are confirmed as *planned*, not dropped.

**Security.**
- `JWT_SECRET` falls back to the literal `'fallback_secret_do_not_use_in_prod'` in `features/auth/auth.service.ts:7` and `middleware/auth.middleware.ts:6`. The dev `server/.env` sets no `JWT_SECRET`, so local runs use it, and a production deploy that forgets the variable would silently sign forgeable tokens. The server should refuse to start without it outside development.
- `docker-compose.yml` ships the placeholder `JWT_SECRET=your_jwt_secret_key_here`.
- The AI service allows CORS origin `"*"` together with `allow_credentials=True` (`ai_services/app/config.py`).

**Deployment.**
- `docker-compose.yml` sets `MONGO_URI`, but the server reads `MONGODB_URI` (`config/db.ts`); inside compose the server would fall back to `localhost` and fail to reach Mongo. It also has no `ai_services` container.
- No CI of any kind; no `npm test` script; planner tests are plain `assert` scripts run by hand with `ts-node`. The roadmap's definition of done (CI build, >80% coverage) is not enforceable today.

**Code health.**
- No React error boundary: any render error blanks the whole app (this is exactly how the weight bug presented).
- `features/workouts/InventoryModal.tsx` is dead code, superseded by `features/inventory/InventoryView.tsx`, and diverges from it.
- `apiClient`'s response interceptor unwraps `response.data.data` but call sites are still typed as `AxiosResponse`, forcing casts (e.g. `as unknown as WeightLog | null`).
- Types are hand-duplicated between `client/` and `server/`. The roadmap's `shared-types` / `shared-validation` packages and Turborepo monorepo were never created.
- Swagger (`server/src/docs/swagger.yml`) documents only the 6 auth endpoints; the other 17 route groups, including the new `GET /weight/history`, are undocumented.
- `docs/` still describes OpenAI-based AI; the implementation uses a local Ollama model, which `PRODUCT.md` records as a temporary stopgap, with cloud AI the intended direction.

**Planner behavior worth knowing (by design, documented in `inspection_report.txt`).**
- When a blueprint slot cannot be filled from the user's equipment, the plan is marked `NEEDS_REPAIR` and the slot is reported unresolved rather than filled with a random exercise.
- Beginner bodyweight-only plans can show a push/pull ratio warning (about 2:1); it is a warning, not a gating failure.

## Suggested next steps

1. **Security first:** fail fast without `JWT_SECRET`; fix the compose env name and add the AI service; tighten AI-service CORS.
2. **Add CI** (GitHub Actions): `tsc` for both apps, planner suites, and Playwright with `--workers=1` against built or preview servers.
3. Run the full e2e suite on all three browsers and keep it green; add a `test` script to `server/package.json`.
4. Add a top-level React error boundary.
5. Implement the planned stubs for real: food-text parsing, recommendations, global search, then gamification (scope with `/impeccable shape` first).
6. Extend Swagger to all routes, delete `InventoryModal.tsx`, and decide whether to build the shared-types package or drop it from the roadmap.
7. Plan the Ollama to cloud-LLM move behind the existing FastAPI boundary so the Express fallback stays unchanged.
