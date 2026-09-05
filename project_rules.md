# Kaizen Project Rules

**Document Version:** 1.0
**Status:** Mandatory
**Applies To:** All Engineers, AI Agents, and Contributors
**Last Updated:** July 2026

---

## WHY Does This Document Exist?

This document exists to serve as the absolute source of truth for how the Kaizen platform is built. It overrides all other guidelines, personal preferences, and theoretical best practices. It prevents decision fatigue, architectural drift, and technical debt by enforcing a strict, unified development philosophy.

## WHO Uses It?

Every engineer, architect, and AI coding agent working on Kaizen must read, understand, and strictly adhere to these rules before writing a single line of code.

## WHEN Is It Used?

It is used constantly: during onboarding, sprint planning, architecture design, implementation, and code review. If a proposed change violates these rules, the change must be rejected.

---

## 1. The "Feature-First" Rule

### Concept
Code must be organized by what it does (the feature), not by what it is (the technical layer). 

### Implementation
- **DO:** Group components, services, and models under a specific business capability (e.g., `features/MealTracking`).
- **DO NOT:** Create massive global folders for `controllers`, `services`, or `components` that contain unrelated business logic.
- **WHY:** Feature-based architecture scales infinitely and minimizes merge conflicts. It allows a single engineer to understand and modify a complete business vertical without hunting across the entire repository.

---

## 2. The "Independent Buildability" Rule

### Concept
Every sprint must leave the application in a fully runnable, deployable state. 

### Implementation
- No massive integration branches.
- No "half-finished" features pushed to the main branch.
- Use feature flags if a feature is incomplete but must be merged.
- **WHY:** This ensures the platform is always ready for production deployment, enabling continuous delivery and immediate feedback.
- **TRADE-OFFS:** Requires more upfront planning and disciplined use of feature toggles, slightly slowing down initial velocity in favor of long-term stability.

---

## 3. The "No AI Filler" Documentation Rule

### Concept
Documentation exists exclusively to support implementation. 

### Implementation
- Every architectural decision and module must answer: *WHY, WHEN, WHO, HOW, HOW WILL IT SCALE, WHAT ARE THE TRADE-OFFS?*
- Do not generate generic boilerplate. If a document does not directly help an engineer build, debug, or deploy a feature, delete it.
- **WHY:** Bloated documentation is ignored. Concise, implementation-focused documentation accelerates development.

---

## 4. The "Strict TypeScript" Rule

### Concept
Type safety is non-negotiable.

### Implementation
- `strict: true` must be enabled across all `tsconfig.json` files.
- The use of `any` is strictly prohibited. Use `unknown` if the type is truly unknown, and narrow it with type guards.
- Interfaces must be used to define system boundaries (APIs, shared models).
- **WHY:** Catching errors at compile-time is exponentially cheaper than debugging them in production.
- **TRADE-OFFS:** Higher initial friction when defining complex types or integrating poorly-typed third-party libraries.

---

## 5. The "Shared Core, Isolated Boundaries" Rule

### Concept
Code reuse is required for infrastructure, but prohibited across independent business boundaries.

### Implementation
- Use shared packages (`shared-types`, `shared-validation`, `shared-utils`) for DTOs, Zod schemas, and date formatters.
- **DO NOT** share business logic between features. If Feature A and Feature B need the same logic, reconsider their boundaries or abstract the logic into a separate Domain Service.
- **WHY:** Coupling independent business features creates a monolith that is impossible to maintain.

---

## 6. The "AI Isolation" Rule

### Concept
AI features can fail, but core business features must never go down because of an AI failure.

### Implementation
- AI Services (FastAPI) must operate asynchronously or via resilient boundaries from the Backend API (Express).
- If the OpenAI API is down, meal logging and goal tracking must still work perfectly.
- **WHY:** AI providers have unpredictable latency and uptime. The core health operating system must remain highly available.

---

## 7. The "Review Everything" Rule

### Concept
No code goes to production without completing the standard review lifecycle.

### Implementation
Every single sprint deliverable must pass:
1. Architecture Review (Does it follow these rules?)
2. Code Review (Is it clean and performant?)
3. Security Review (Are endpoints protected?)
4. UX Review (Does it meet Kaizen standards?)
5. Testing Review (Are all unit, integration, and E2E tests passing?)

---

## Conclusion

By adhering strictly to these 7 rules, Kaizen will scale from a minimum viable product to a global health operating system without succumbing to the technical debt that typically cripples fast-moving startups.
