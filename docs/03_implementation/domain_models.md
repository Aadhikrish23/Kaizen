# Domain Models & Bounded Contexts

**Document ID:** domain_models.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
To establish the ubiquitous language and domain-driven design (DDD) aggregates for Kaizen. This prevents engineers from building a tightly coupled "big ball of mud" by clearly defining where business boundaries begin and end.

### WHO Uses It?
Backend Engineers structuring the `services/api` directories, and Product Managers communicating features.

### WHEN Is It Used?
During architecture design for new features and code reviews to ensure boundaries aren't violated.

---

## 2. Bounded Contexts

Kaizen is divided into three strict bounded contexts. Code in one context cannot directly import internal logic from another context.

### 2.1 Identity & Access Context
*   **Responsibility:** Authentication, User Profiles, Security.
*   **Aggregates:** `User`, `RefreshToken`.
*   **Ubiquitous Language:** Register, Login, Session, Revoke, Verify.
*   **Rule:** Other contexts can hold a `userId` reference, but cannot modify a user's password or email directly.

### 2.2 Health Tracking Context (Core Domain)
*   **Responsibility:** Recording and retrieving daily health telemetry.
*   **Aggregates:** `Meal` (Root), `WaterLog` (Root).
*   **Ubiquitous Language:** Log, Consume, Macros, Calories, Hydration.
*   **Rule:** This context owns the heavy read/write paths. It does NOT care about AI insights. It simply stores the raw data.

### 2.3 Intelligence Context
*   **Responsibility:** Analyzing data and generating actionable insights via AI.
*   **Aggregates:** `DailyInsight`, `CoachConversation`.
*   **Ubiquitous Language:** Prompt, Sentiment, Recommendation, Insight.
*   **Rule:** Operates asynchronously. It reads from the Tracking Context but never mutates raw tracking data.

---

## 3. The "No Cross-Aggregate Transactions" Rule

### Implementation
*   **DO NOT** attempt to save a `User` profile update and a new `Meal` in a single MongoDB transaction.
*   **WHY:** Aggregates are consistency boundaries. Modifying multiple aggregates synchronously tightly couples the system and scales poorly. If a user deletes their account, emit an event (or run a background job) to delete their meals asynchronously.

---

## 4. SCALE & TRADE-OFFS

### How will this scale?
By strictly enforcing these boundaries in the monorepo (e.g., `features/Identity`, `features/Tracking`), we can easily extract the Tracking context into a dedicated microservice in Phase 3 without massive refactoring, as there are no tangled `require()` statements between the domains.

### What are the trade-offs?
It requires more boilerplate. If we want to show a dashboard with User info AND their latest Meal, we must query both contexts and assemble the DTO, rather than writing a massive monolithic SQL JOIN.
