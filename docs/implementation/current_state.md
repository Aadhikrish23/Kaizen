# Current State

**Last reviewed:** 2026-11-15 (as of PR #27, `af0ed62`; all sprint 5 PRs #20 to #27 are merged, nothing is open except the refresh-hardening follow-up described under "After sprint 5")
**Stage:** pre-launch: feature-complete against the requirement matrix except for items marked open; not yet deployed anywhere.

Requirement-level status: [../product/requirement_traceability_matrix.md](../product/requirement_traceability_matrix.md).
Launch work: [../production_checklist.md](../production_checklist.md), [../deployment.md](../deployment.md).

## What changed since the 2026-11-13 snapshot

The earlier version of this file listed stubs and security gaps. They were worked off in sprints 1 to 4 (PR numbers on `main`):

- **Security and hardening (sprint 1, #1 to #7):** fail-fast JWT secrets, Mongo env fix, analytics window cap, refresh tokens hashed and
  single-use (#3), strict AI chat input and AI-service CORS without `*` (#5), env-based API URL, React error boundary and a confirm
  before replacing a completed workout (#6), health endpoint, compose health checks, AI service in compose, `.env.example`, CI that
  runs server tests (#7), post-merge smoke test against MongoDB 7, built server serves Swagger (#4).
- **Data and planner correctness (sprint 2, #8 to #10):** one timezone rule ([../timezone.md](../timezone.md)); Open Food Facts values
  on an explicit per-100 g or per-serving basis with scaled logging, no fabricated per-ingredient recipe macros, honest "not enough
  data" readiness score, estimate wording in the sleep UI (#9); no assumed equipment for new users, adaptation uses the requested
  date's log and real RPE, no invented loads for swapped exercises (#10).
- **AI features (sprint 3, #11 to #13):** modular smoke script (#11); provider-neutral LLM layer (Ollama, OpenAI-compatible,
  Anthropic), validated food-text parsing with database-backed nutrition and a regex fallback, deterministic meal recommendations (#12);
  grouped global search and weekly insight (#13). Per-user rate limits for AI routes.
- **Engagement and reporting (sprint 4, #14 to #19):** gamification ([../gamification.md](../gamification.md)) (#14, #17), reports and goal
  history/progress (#16), in-app reminders (#15), mass-assignment and ownership hardening of profile, routines, recipes and
  measurements (#17, #18), recipe privacy fix and configurable global limit (#19).
- **Hardening and launch prep (sprint 5):** real-browser E2E in CI (chromium, firefox, webkit), nginx SPA fallback for the client image,
  removal of the dead `InventoryModal.tsx` (#20, `90b711d`); admin panel with audited user and global-food management, deactivation, a
  `make-admin` script, last-admin protection and removal of the old default-admin creation in `migrateData.ts` (#21, `40ec3cd`); offline support:
  cached reads, idempotent creates with `clientRequestId` and a replay-safe write queue for meals, water, weight and sleep, with a
  per-user cache owner (#23, `b6f852e`); OpenAPI for every route generated from the zod schemas, with tests that fail on a missing route or a stale file, and a typed client API layer (#22, `ecafef7`); the client query cache is cleared when the signed-in user changes and a failed token refresh now signs the UI out (#25, `a4ebba3`). Docs: this launch checklist and deployment guide (PR #24).

## Verified state (what is actually exercised automatically)

- `ci.yml`: server and client build, server `npm test` (unit tests, no database) on every PR and push to main; a `docker` job (added in
  #24) builds both images and checks the client image's nginx config, SPA fallback and security headers.
- `e2e.yml`: Playwright specs on chromium, firefox and webkit against a real MongoDB 7 service, the built server and `vite preview`
  (not the nginx image) on every PR and push to main.
- `smoke.yml`: after merging to main, a smoke run against real MongoDB 7 (`scripts/smoke.sh` plus `scripts/smoke.d/*.sh`: auth, validation,
  inventory, recipes, timezone, gamification, reminders, reports/goals, ownership, recipe privacy, search, admin, idempotency, insight,
  refresh-token replay).
- Planner engine and adversarial suites (11 + 15) are run by hand with `ts-node`; AI service tests with `python -m unittest`.
- **Not exercised automatically:** `docker compose up` of the whole stack, any real LLM provider call, Spoonacular and Open Food Facts
  calls, the service worker and IndexedDB queue in a real offline browser (only the pure logic is unit tested), the seed scripts.
- Nothing has been deployed to a production-like host from this repository.

## After sprint 5

Merged: #20 `90b711d`, #21 `40ec3cd`, #22 `ecafef7`, #23 `b6f852e`, #24 `5fe4aa8` (launch docs, Node 20 images, nginx security headers,
the `docker` CI job, a unit test for `config/secrets.ts`), #25 `a4ebba3`, #26 `72a4788` (reminder-prefs user-switch E2E; a wrong-password
login no longer goes through the refresh flow) and #27 `af0ed62` (single-flight access-token refresh: one shared refresh for all
requests that hit a 401 at once, plus a Web Lock so several tabs do not refresh simultaneously; refresh tokens are single-use, so
concurrent refreshes used to sign the user out despite a valid session). The Web Locks path and the multi-tab case are unit tested
with a simulated lock only; no real multi-tab browser test exists.

Follow-up (`sprint-5/refresh-hardening`): the refresh request has a 15 s timeout, and a timeout counts as a refresh failure so a hung
refresh cannot hold the cross-tab lock; every step of the forced logout (token removal, cache clear, session-expired event) runs even if
an earlier one throws, e.g. blocked localStorage.

Known limitation: a slow request still in flight from the previous user when another user signs in in the same tab can still receive
a 401 and join the shared refresh; this straggler case is not handled.

## AI work in progress (branch `feature/nvidia-provider`, not merged)

NVIDIA NIM is the default AI provider (Ollama as a fallback chain). The AI features moved into the Python service, which acts as the signed-in user through this API; the Express AI routes are proxies. `/ai/chat` is now an action assistant ([../assistant.md](../assistant.md)). Verified with the AI service tests (mock transport and an in-memory fake API), the smoke suite and a live run against MongoDB; **never run with a real NVIDIA key or language model**. Search stays in Express.

## Known gaps and risks

**Security and operations (see the production checklist for the status of each item)**
- No `trust proxy` setting: behind a reverse proxy all users share one IP rate-limit bucket.
- Password reset is a mock (logs a link); no email delivery, verification or 2FA.
- Compose runs MongoDB without authentication; no backup, monitoring or alerting automation; logs are plain console output.
- No account export/deletion endpoints.
- Databases that ever ran the old `migrateData.ts` may contain an `admin@kaizen.com` admin with a publicly known password: run
  `node dist/scripts/checkDefaultAdmin.js` and remove or demote it (see [../admin.md](../admin.md)).
- `NODE_ENV` must be set to `production` explicitly; unset is treated as development (insecure fallback secrets).
- `RefreshToken.tokenHash` has a normal, non-unique index.

**Product**
- AI quality is unproven against real providers; only the fallback paths and validation logic are tested.
- Food database coverage (including Indian foods) is as good as the seed data; not audited. `seedFoods` deletes all global foods first.
- Reminders are in-app only (shown while the app is open); there is no email or push delivery.
- Gamification challenges are not built.
- Offline: only meals, water, weight and sleep can be added offline; weight/sleep per-day replays are last-write-wins ([../offline.md](../offline.md)).

**Code health**
- Types are duplicated between `client/` and `server/`; the planned shared packages were never created.
- No guard (test or lint) against a new query missing a `userId` filter; the audit in #19 was manual.
- The client has no unit-test runner; pure client modules are tested from `server/test` through a small transpile helper.

**Planner behaviour (by design, see `planner/__tests__/inspection_report.txt`)**
- Unfillable blueprint slots mark the plan `NEEDS_REPAIR` rather than picking a random exercise.
- The generator still chooses starting dumbbell/barbell loads when no working weight is known; swapped exercises never get an invented load.

## Suggested next steps

1. Make the E2E and docker jobs required checks.
2. Add a configurable `trust proxy` setting, then deploy to a staging host behind HTTPS and run the smoke script and the browser suite against it.
3. Decide on transactional email (password reset, verification) and on push/email reminders.
4. Exercise the AI providers with real keys and review the prompts and parsing in practice.
5. Add backup automation and basic monitoring (health checks, error alerts).
