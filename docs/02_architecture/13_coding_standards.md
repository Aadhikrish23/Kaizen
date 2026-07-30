# Kaizen Coding Standards

**Document ID:** 13_coding_standards.md
**Version:** 1.0
**Status:** Approved for Phase 1 Development
**Author:** Principal Software Architecture Team
**Last Updated:** June 2026

---

# 1. Executive Summary

This document defines the official coding standards for the Kaizen platform.

It applies to:

* Web Application
* Mobile Application
* Desktop Application
* API Service
* AI Service
* Shared Packages

The purpose is to ensure:

* Consistency
* Maintainability
* Scalability
* Readability
* Predictability
* AI-agent compatibility

These standards are mandatory for all contributors.

---

# 2. General Principles

## Principle 1: Readability First

Code is written for humans first.

---

## Principle 2: Consistency Over Preference

Team standards override personal preferences.

---

## Principle 3: Simplicity

Prefer simple solutions over clever solutions.

---

## Principle 4: Single Responsibility

Every module should have one clear responsibility.

---

## Principle 5: Explicitness

Prefer explicit behavior over hidden behavior.

---

## Mandatory Rules

* Strict TypeScript enabled
* No unused code
* No dead code
* No commented-out code
* No magic values

---

## Prohibited Patterns

* Massive files
* Deep nesting
* Circular dependencies
* Hidden side effects

---

# 3. TypeScript Standards

## Required Configuration

```text id="h7k9x2"
strict = true
```

---

## Good

```typescript id="rj4e1n"
interface User {
  id: string;
  email: string;
}
```

---

## Bad

```typescript id="x9d2bv"
let user: any;
```

---

## Rules

### Use Interfaces For Contracts

Preferred:

```text id="b8w7nm"
interface
```

---

### Avoid any

Allowed only with architectural justification.

---

### Explicit Return Types

Required for exported functions.

---

## Mandatory

* Strong typing
* Shared DTO usage
* Shared enums

---

# 4. React Standards

## Component Philosophy

Components must be:

* Small
* Reusable
* Focused

---

## Good

```text id="t8c1r4"
MealCard.tsx
```

Single responsibility.

---

## Bad

```text id="v2n8hz"
DashboardEverything.tsx
```

Multiple responsibilities.

---

## Rules

### Functional Components Only

Class components prohibited.

---

### Hooks Only

Use React hooks.

---

### Feature-Based Organization

Components belong inside features.

---

## Prohibited

* Business logic in components
* Direct API calls in UI components
* Massive components

---

# 5. Express Standards

## Architecture Layers

```text id="j4n6qp"
Route
  |
Controller
  |
Service
  |
Repository
```

---

## Responsibilities

### Routes

Routing only.

---

### Controllers

Request handling only.

---

### Services

Business logic only.

---

### Repositories

Database access only.

---

## Prohibited

* Database queries in controllers
* Business logic in routes

---

# 6. FastAPI Standards

## Architecture Layers

```text id="n8u5yx"
Router
  |
Service
  |
Provider
```

---

## Responsibilities

### Router

Request handling.

---

### Service

AI orchestration.

---

### Provider

OpenAI communication.

---

## Prohibited

* Business logic ownership
* User authentication ownership

---

# 7. Naming Conventions

| Item       | Convention       |
| ---------- | ---------------- |
| Variables  | camelCase        |
| Functions  | camelCase        |
| Classes    | PascalCase       |
| Components | PascalCase       |
| Interfaces | PascalCase       |
| Enums      | PascalCase       |
| Constants  | UPPER_SNAKE_CASE |
| Files      | kebab-case       |

---

# 8. Folder Naming Rules

## Standard

```text id="o3f5wp"
kebab-case
```

---

## Good

```text id="b7m9dq"
meal-history
goal-management
```

---

## Bad

```text id="p8v2yt"
MealHistory
goalManagement
```

---

# 9. File Naming Rules

## React Components

```text id="l4c8hs"
PascalCase.tsx
```

Example:

```text id="x6n5qw"
MealCard.tsx
```

---

## Utility Files

```text id="m1k4er"
kebab-case.ts
```

Example:

```text id="f7j8up"
date-utils.ts
```

---

## Validation Files

```text id="h3y9ra"
meal.schema.ts
```

---

# 10. Function Naming Rules

## Functions

```text id="a2p7zn"
camelCase
```

---

## Good

```text id="v5w4ob"
calculateCalories()
getUserGoals()
createMeal()
```

---

## Bad

```text id="d8n3yt"
CalculateCalories()
userGoals()
```

---

## Rules

Functions must start with:

```text id="k4m2qc"
get
create
update
delete
calculate
validate
```

when applicable.

---

# 11. Variable Naming Rules

## Good

```text id="r8k1jt"
mealCount
dailyCalories
currentGoal
```

---

## Bad

```text id="v4z8md"
x
data
temp
```

---

## Rules

Names must describe intent.

---

## Boolean Variables

Must start with:

```text id="t1s9kp"
is
has
can
should
```

---

## Examples

```text id="b6w3hz"
isAuthenticated
hasCompletedGoal
canGenerateReport
```

---

# 12. Component Standards

## Structure

```text id="n2m7qy"
Component
Hooks
Handlers
Render
```

---

## Responsibilities

Components should:

* Render UI
* Manage local state
* Trigger actions

---

## Must Not

* Access database
* Contain business logic
* Perform calculations

---

## Component Size

Recommended:

```text id="f5y2br"
< 250 lines
```

Maximum:

```text id="c8x1nm"
500 lines
```

---

# 13. API Standards

## Endpoint Naming

Use nouns.

---

## Good

```text id="s6k3qw"
/meals
/goals
/reports
```

---

## Bad

```text id="d4n8hp"
/getMeals
/createGoal
```

---

## Response Structure

Standardized.

```text id="y5m7rl"
success
message
data
meta
```

---

## Status Codes

Must follow REST conventions.

---

# 14. Validation Standards

## Validation Location

### Frontend

Shared validation schemas.

---

### Backend

Shared validation schemas.

---

## Technology

```text id="r7h4pn"
Zod
```

---

## Rules

Every input must be validated.

---

## Prohibited

Trusting client input.

---

# 15. Logging Standards

## Logging Format

Structured logging only.

---

## Required Fields

```text id="m3w8qy"
timestamp
level
service
message
requestId
```

---

## Log Levels

```text id="u8f6vk"
DEBUG
INFO
WARN
ERROR
FATAL
```

---

## Never Log

* Passwords
* Tokens
* Secrets

---

# 16. Documentation Standards

## Required Documentation

### Features

Must include:

* Purpose
* Architecture
* Dependencies

---

### APIs

Must include:

* Request
* Response
* Validation

---

## Code Comments

Comment:

* Why

Avoid commenting:

* What

---

# 17. Testing Standards

## Required Test Types

### Unit Tests

Business logic.

---

### Integration Tests

Service interactions.

---

### E2E Tests

Critical user flows.

---

## Coverage Targets

| Type            | Target |
| --------------- | ------ |
| Services        | 80%    |
| Utilities       | 90%    |
| Shared Packages | 90%    |

---

## Prohibited

Shipping untested business logic.

---

# 18. Git Standards

## Branch Naming

```text id="y4q6kn"
feature/
bugfix/
hotfix/
refactor/
```

---

## Examples

```text id="g9r2mu"
feature/meal-tracking
bugfix/auth-refresh-token
```

---

## Commit Format

```text id="w2k8pt"
type(scope): description
```

---

## Examples

```text id="s3f6nx"
feat(auth): add refresh token support

fix(meals): correct calorie calculation

refactor(api): simplify goal service
```

---

# 19. Pull Request Standards

## Requirements

Every PR must include:

* Summary
* Screenshots (if UI)
* Test results
* Architecture impact

---

## Size Limits

Recommended:

```text id="j7m5pc"
< 500 lines changed
```

---

## Large PRs

Must be split.

---

# 20. Code Review Standards

## Review Criteria

### Correctness

Works as expected.

---

### Maintainability

Easy to understand.

---

### Security

No security issues.

---

### Performance

No obvious bottlenecks.

---

### Architecture

Respects architecture boundaries.

---

## Reviewer Checklist

* [ ] Naming standards followed
* [ ] Tests included
* [ ] Validation included
* [ ] Logging included
* [ ] Architecture respected

---

# 21. Dependency Management Standards

## Rules

Dependencies must:

* Solve a real problem
* Be actively maintained
* Be reviewed before addition

---

## Prohibited

Adding libraries for trivial functionality.

---

# 22. Error Handling Standards

## Requirements

Every external operation must handle failures.

---

## Examples

* Database operations
* API requests
* AI requests
* File uploads

---

## Rules

Never expose internal errors to users.

---

# 23. Security Coding Standards

## Required

* Validate all inputs
* Sanitize outputs
* Use parameterized queries
* Use environment variables

---

## Prohibited

* Hardcoded secrets
* Raw token storage
* Trusting client input

---

# 24. AI Agent Rules

## AI Agents Must

### Follow Architecture Documents

Mandatory.

---

### Respect Folder Structure

Mandatory.

---

### Use Shared Packages

When applicable.

---

### Create Tests

For business logic.

---

### Add Validation

For all inputs.

---

### Add Logging

For critical operations.

---

## AI Agents Must Never

### Create New Top-Level Directories

Forbidden.

---

### Modify Architecture Documents

Without explicit request.

---

### Place Business Logic In UI

Forbidden.

---

### Place Business Logic In Shared Packages

Forbidden.

---

### Access Database From Frontend

Forbidden.

---

### Call OpenAI Directly From Clients

Forbidden.

---

### Introduce New Technologies

Without architecture approval.

---

# 25. Prohibited Patterns

## Architecture Violations

```text id="k7v2qy"
Frontend → Database
Frontend → OpenAI
Shared Package → Business Logic
```

---

## Code Smells

* God classes
* Massive components
* Circular dependencies
* Deep nesting
* Long functions

---

## Forbidden Examples

```text id="u9r4mw"
1000+ line files
Controllers with business logic
Database access in routes
```

---

# 26. Engineering Excellence Checklist

## Code Quality

* [ ] Strong typing
* [ ] Validation included
* [ ] Logging included

---

## Architecture

* [ ] Layer separation respected
* [ ] Package boundaries respected

---

## Security

* [ ] No secrets committed
* [ ] Inputs validated

---

## Testing

* [ ] Unit tests added
* [ ] Integration tests added

---

## Documentation

* [ ] Public APIs documented
* [ ] Architecture impact documented

---

# 27. Conclusion

These coding standards establish the engineering foundation for Kaizen. By enforcing strict architectural boundaries, strong typing, validation, testing, security controls, and maintainable development practices, the platform remains scalable, secure, AI-agent-friendly, and sustainable as it grows from Phase 1 implementation to enterprise-scale deployment.
