# Testing Plan & Strategy

**Document ID:** test_plan.md
**Version:** 1.0
**Status:** Approved
**Author:** QA & Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
This document establishes the exact methodology for validating that the Kaizen platform operates securely, reliably, and accurately. It prevents regressions and ensures confidence during rapid continuous deployment.

### WHO Uses It?
Software engineers writing automated tests, QA engineers running manual validation, and AI agents evaluating code changes against the Definition of Done.

### WHEN Is It Used?
Every single sprint. A feature is not done until the tests defined in this plan are written and passing.

---

## 2. The Testing Pyramid

Kaizen utilizes a standard testing pyramid to balance execution speed with confidence.

### 2.1 Unit Tests (The Foundation)
- **Scope:** Individual functions, utilities, Zod schemas, and isolated React components.
- **Tools:** Vitest / Jest, React Testing Library.
- **Coverage Target:** > 80% (Services and Utilities > 90%).
- **Execution:** Runs on every commit in the local environment and CI pipeline.

### 2.2 Integration Tests (The Core)
- **Scope:** API routes, Database queries, Service-to-Service communication.
- **Tools:** Supertest (Express), PyTest (FastAPI).
- **Execution:** Runs in CI pipeline against an ephemeral test database.
- **Requirement:** Every single API endpoint must have at least one positive (200) and one negative (400/401/404) integration test.

### 2.3 End-to-End (E2E) Tests (The Peak)
- **Scope:** Critical user journeys spanning the UI to the database.
- **Tools:** Playwright / Cypress.
- **Execution:** Runs nightly and before production releases against a staging environment.
- **Critical Paths:** 
  1. User Registration & Login.
  2. Logging a Meal.
  3. Interacting with the AI Coach.

---

## 3. Implementation Plan by Feature

### Authentication Testing
- **Unit:** Validate email regex, password hashing algorithms.
- **Integration:** Mock JWT signing, test `/auth/login` with bad passwords (expect 401), test token refresh logic.
- **E2E:** Browser automation navigating to `/login`, filling form, asserting redirect to `/dashboard`.

### AI Integration Testing
- **Unit:** Test prompt generators and response parsers.
- **Integration (Mocked):** Mock the OpenAI API response to ensure FastAPI correctly formats the data for Express.
- **Integration (Live):** Run daily tests against the real OpenAI API to detect model drift or API deprecations.

---

## 4. Manual QA & Release Testing

While automation is the priority, certain features (UX feel, animation fluidity, mobile device quirks) require manual validation.

See the accompanying documents for manual processes:
- `manual_test_cases.md` (Detailed steps for exploratory testing).
- `release_checklist.md` (Final sanity checks before triggering a production deployment).

---

## 5. SCALE & TRADE-OFFS

### How will this scale?
- Automated testing in the CI pipeline allows the team to merge code hundreds of times a day without fear of catastrophic regressions.
- Strict isolation of tests (each test setups and tears down its own data) prevents flaky tests as the suite grows.

### What are the trade-offs?
- **Speed of Development:** Writing tests takes time. A feature that takes 4 hours to build may take an additional 2 hours to test thoroughly. This is an intentional trade-off to avoid spending 20 hours fixing production bugs later.
- **Maintenance Burden:** E2E tests are notoriously brittle. We restrict E2E tests to only the absolute most critical paths to avoid spending excessive time maintaining them.
