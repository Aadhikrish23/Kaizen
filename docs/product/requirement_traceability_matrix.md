# Requirement Traceability Matrix

**Document Version:** 2.0
**Last reviewed:** 2026-11-13

Version 1.0 of this file was written at project start and marked nearly everything NOT IMPLEMENTED. This version reflects the code on `main`. Paths are relative to `server/src/` (server) and `client/src/` (client). Overall narrative: [../implementation/current_state.md](../implementation/current_state.md).

"Tests" lists automated coverage only: **planner suites** = `server/src/features/planner/__tests__/` (11 engine tests + 15 adversarial scenarios); **e2e** = Playwright specs in `e2e/tests/`. "Swagger" covers `server/src/docs/swagger.yml`, which documents only the auth endpoints.

| Req ID | Description | Status | Implemented Location | Tests | Swagger |
|---|---|---|---|---|---|
| **REQ-AUTH** | Complete JWT Auth (Register, Login, Token Rotation, Profile, Sessions) | ✅ COMPLETE | `features/auth/`; client `features/auth/`, `contexts/AuthContext` | e2e: `auth`, `auth-onboarding-routing` | 6 endpoints |
| **REQ-PROFILE** | User Profile, Activity Level, Onboarding | ✅ COMPLETE | `features/profile/`; client `features/profile/`, `features/onboarding/` | e2e: onboarding, walkthrough | None |
| **REQ-GOALS** | Weight Goals, Target Dates, Goal History | 🟡 PARTIAL | Goal and target weight stored on the user profile (`features/auth/User.ts`); no target dates or goal history found | e2e: onboarding | None |
| **REQ-WATER** | Track water, Quick Adds, Calibrated Progress, Configurable Goal | ✅ COMPLETE | `features/water/`; client `features/water/` | e2e: walkthrough | None |
| **REQ-MEALS** | Meal creation, macros, calories, categories | ✅ COMPLETE | `features/meals/`; client `features/meals/` | e2e: walkthrough (page + recipe modal) | None |
| **REQ-FOOD_DB** | Food database, Indian foods, Serving sizes, Search | 🟡 PARTIAL | `features/foods/`, `features/externalFood/`, `scripts/seedFoods.ts`; client `components/ui/FoodSearch.tsx`. Seed coverage of Indian foods not verified | None | None |
| **REQ-RECIPES** | Create recipes, ingredients, calc nutrition, log in meal | ✅ COMPLETE | `features/recipes/`, `features/externalFood/` (import); client `features/meals/RecipeList.tsx`, `RecipeExplorerModal.tsx` | e2e: modal open only | None |
| **REQ-WEIGHT** | Daily overwrite, History, Trends, Goal Delta | ✅ COMPLETE | `features/weight/` (incl. `GET /weight/history`); client `features/weight/WeightTracker.tsx`. Page was unreachable and crashed on save until `e4b480b` | e2e: walkthrough, `sleep-and-weight-refactor` | None |
| **REQ-MEASURE** | Body measurements (Waist, Chest, etc) | ✅ COMPLETE | `features/measurements/`; client `features/weight/MeasurementTracker.tsx` | e2e: walkthrough | None |
| **REQ-WORKOUT** | Split banner, Set-by-Set, RPE, Volume, Directory, Notes | ✅ COMPLETE | `features/workouts/`, `features/exercises/`; client `features/workouts/WorkoutTracker.tsx` | e2e: walkthrough, `clean-custom-planner` | None |
| **REQ-DASHBOARD** | Unified multi-pillar view, Historical date navigation | ✅ COMPLETE | `features/summary/`; client `features/dashboard/`, `layouts/DashboardLayout.tsx` | e2e: walkthrough | None |
| **REQ-ANALYTICS** | Daily/Weekly/Monthly Trends (Nutrition, Weight, Workouts) | ✅ COMPLETE | `features/analytics/`; client `features/analytics/` (4 Recharts cards, day-range filter) | e2e: walkthrough | None |
| **REQ-SCORE** | Kaizen Health Score | 🟡 PARTIAL | Client-side "Kaizen Readiness" composite on the dashboard (`DashboardOverview.tsx`); no server-side score or history | e2e: walkthrough (card present) | None |
| **REQ-REPORTS** | Daily/Weekly/Monthly Reports | ❌ NOT IMPLEMENTED | No report code found (workout-plan PDF export is separate, see REQ-PLANNER) | None | None |
| **REQ-AI-PARSE** | AI Food Parsing from natural language | 🟡 STUB | `features/ai/ai.controller.ts` `parseFoodText` returns a hardcoded item regardless of input | None | None |
| **REQ-AI-INSIGHT** | Daily/Weekly AI generated insights on behavior | ✅ COMPLETE | `features/ai/aiMicroservice.service.ts` `getDailyInsight`; `ai_services/`; heuristic fallback when AI is down. Daily only, no weekly insight | e2e: fallback path only | None |
| **REQ-AI-RECOMMEND** | Meal recommendations based on remaining budget | 🟡 STUB | `getRecommendations` returns two static foods; ignores user data | None | None |
| **REQ-AI-COACH** | Conversational chat interface for health coaching | ✅ COMPLETE | `features/ai/` `chatWithCoach`; client `features/dashboard/AICoach.tsx`; local Ollama (temporary, cloud AI planned) with heuristic fallback | e2e: fallback path only (LLM path unexercised) | None |
| **REQ-GAMIFY** | XP, Levels, Streaks, Achievements, Challenges | ❌ NOT IMPLEMENTED | Planned. No model, service or UI (not to be confused with the Readiness card above) | None | None |
| **REQ-NOTIFY** | Reminders (Water, Meal, Weight, Workout) | ❌ NOT IMPLEMENTED | No notification or reminder code found | None | None |
| **REQ-SEARCH** | Unified cross-platform search | 🟡 STUB | `GET /ai/search` (`globalSearch`) always returns empty arrays; food-only search exists in `FoodSearch.tsx` | None | None |
| **REQ-ADMIN** | Admin panel to manage users, food DB, recipes, achievements | 🟡 PARTIAL | `middleware/admin.middleware.ts` exists but is not used by any route; no admin UI | None | None |
| **REQ-OFFLINE** | Offline-friendly functionality with background sync | 🟡 PARTIAL | `vite-plugin-pwa` manifest configured in `client/vite.config.ts` (installable); no offline data caching or background sync | None | None |
| **REQ-PLANNER** 🆕 | Equipment-aware adaptive workout planner (generation, swap, custom plans, PDF export, explainability) | ✅ COMPLETE | `features/planner/` incl. `engine/` (12 modules); client `features/planner/` | planner suites (26 scenarios); e2e: `planner-5day-frequency`, `inventory-equipment-strict`, `export-workout-pdf`, `clean-custom-planner`, walkthrough | None |
| **REQ-INVENTORY** 🆕 | Gym / equipment inventory and working weights | ✅ COMPLETE | `features/inventory/`; client `features/inventory/InventoryView.tsx` (`features/workouts/InventoryModal.tsx` is unused dead code) | e2e: `inventory-equipment-strict`, walkthrough | None |
| **REQ-SLEEP** 🆕 | Sleep cycle tracking | ✅ COMPLETE | `features/sleep/`; client `features/sleep/` | e2e: `sleep-and-weight-refactor` | None |
| **REQ-ROUTINES** 🆕 | Saved workout routines | ✅ COMPLETE | `features/routines/` | e2e: `clean-custom-planner` | None |

*Status Legend:*
✅ COMPLETE | 🟡 PARTIAL / STUB | ❌ NOT IMPLEMENTED | 🔄 REWORK REQUIRED | 🆕 NEW (built but absent from the original matrix)
