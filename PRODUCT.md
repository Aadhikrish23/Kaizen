# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience: health-conscious individuals aged 18-45 who want to manage nutrition, hydration, weight, sleep, and fitness in one place instead of juggling several single-purpose apps. The product is being built toward real external users (beta testers and, eventually, paying users), not as a personal-only tool, so UX and hardening decisions should account for people other than the builder.

Three illustrative personas from the project's vision doc frame the range of users to design for (not confirmed real customers — see Evidence on Hand):
- Busy professionals with irregular schedules who need fast logging and smart reminders.
- Fitness enthusiasts who actively track calories, macros, hydration, and body composition and want serious training tools (the adaptive workout planner is built primarily for this group).
- Beginners with little nutrition/fitness knowledge who need guidance and a low-friction on-ramp.

## Product Purpose

Kaizen is an AI-powered health tracking platform that unifies nutrition, hydration, weight, sleep, and workout tracking with AI coaching into one daily-use dashboard. It is named for and framed around the Japanese philosophy of Kaizen (continuous improvement): small, consistent, trackable improvements across health pillars rather than one big program. Success means a user can log their day across all pillars quickly, see a unified picture of their progress, and get a genuinely useful adaptive training plan and coaching nudge instead of generic advice.

## Positioning

Most health apps are either narrow single-purpose trackers (just calories, or just workouts) or broad apps with shallow, generic recommendations. Kaizen's differentiated mechanism is a real adaptive workout-planning engine — a biomechanical exercise-selection system that accounts for a user's actual equipment inventory, movement-pattern balance, fatigue/recovery, and progressive overload, with machine-checked quality scoring and human-readable rationale for every exercise choice — combined with centralized tracking and an AI coach that has the user's actual logged data as context, not just a chat window.

## Operating Context

A daily-use web dashboard: users log meals, water, weight, sleep, and workouts throughout the day and return to a central dashboard that shows all pillars at once with date-based navigation (today vs. past days). The adaptive workout planner is a distinct, heavier workflow: configure preferences and equipment inventory once, generate a weekly plan, then execute and adapt day-to-day (swap exercises, push a planned day into the active session tracker, log sets/reps/RPE). The AI coach is consulted in-context from the dashboard using the user's real logged metrics for that day.

## Capabilities and Constraints

**Built and functional:**
- JWT auth (register/login/refresh), user profile, onboarding flow.
- Core tracking: meals (with macro/calorie calculation), water, weight (daily log + history trend), sleep, body measurements, workouts (set-by-set logging with RPE and volume).
- Adaptive workout planner: equipment-aware exercise selection, weekly movement-pattern balance, fatigue/recovery modeling, double progression, redundancy detection, and decision explainability — covered by its own adversarial test suite (26 scenarios).
- AI coach: calls a self-hosted Ollama model via a FastAPI microservice, with the user's real daily nutrition/hydration/workout context injected; falls back to a heuristic reply using the user's logged stats if the AI service is unreachable, so the app never breaks when AI is down.
- Analytics dashboard (calorie/weight/workout-volume/macro trend charts), recipes/saved meals, workout routines.

**Confirmed temporary constraint:** AI coaching currently runs on a self-hosted Ollama model rather than a cloud LLM. This is a stopgap, not a durable design decision — moving to a cloud AI provider (e.g. OpenAI) is the actual plan, so the AI integration should stay provider-agnostic rather than being designed specifically around local-model quirks or being treated as permanently cost/privacy-driven.

**Confirmed planned but not yet built** (commit history describes these as shipped; the code only has stubs — real work remains):
- Gamification: XP, levels, streaks, achievements. No model, service, or UI component exists yet beyond a "Kaizen Readiness" composite score card, which is a different, already-working feature (not gamification).
- AI food-text parsing: natural-language meal logging currently returns a hardcoded mock response regardless of input.
- Global cross-platform search: the endpoint exists but always returns empty results.

**Terminology:** the four/five core tracking areas are called "pillars" in the UI (Strength & Training, Nutrition & Energy, Hydration Level, Sleep & Circadian, Scale Weight). The composite daily score shown on the dashboard is "Kaizen Readiness."

## Brand Commitments

Product name: Kaizen. The product recently completed a full "athletic dark" visual redesign (dark theme, emerald/violet/amber accent system, monospace-accented UI) — this is the current, intentional visual identity, not a placeholder.

## Evidence on Hand

No real testimonials, case studies, press, or confirmed paying customers exist yet. The personas described under Users are illustrative personas from the project's own vision document, not real people or user-research findings — future design/copy work must not present them, or any invented quotes/metrics attributed to them, as real evidence.

## Product Principles

- Centralize, don't fragment: one dashboard across nutrition, hydration, weight, sleep, and workouts beats several single-purpose trackers.
- Adaptive over generic: recommendations (the workout planner, AI coaching) should be computed from the user's actual logged data and constraints, not generic advice.
- AI can fail safely, the product can't: core tracking and planning must keep working even when the AI layer is slow, wrong, or unreachable (the AI coach's heuristic fallback is the model to follow for any future AI-dependent feature).
- Small, consistent improvement over big-program energy: features should help users build daily habits, matching the Kaizen philosophy the product is named for.
- Say what's real: don't let shipped-looking UI or commit messages imply a capability (gamification, AI parsing, search) is real when it's a stub — this has already caused confusion once in this project.
