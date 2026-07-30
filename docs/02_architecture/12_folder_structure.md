# Kaizen Repository Folder Structure

**Document ID:** 12_folder_structure.md
**Version:** 1.0
**Status:** Approved for Phase 1 Development
**Author:** Principal Software Architecture Team
**Last Updated:** June 2026

---

# 1. Executive Summary

This document defines the official repository structure for the Kaizen platform.

This document is the **single source of truth** for:

* Developers
* Architects
* AI Coding Agents
* Future Contributors

All implementation work must follow this structure.

Any deviation requires architectural review.

---

# 2. Repository Design Principles

## Principles

### Feature-Based Organization

Business features own their implementation.

---

### Clear Ownership

Every folder has a single responsibility.

---

### Separation of Concerns

Applications, services, shared packages, and documentation remain isolated.

---

### AI Agent Friendly

Structure is designed to minimize ambiguity and maximize maintainability.

---

# 3. Monorepo Structure

## Approved Repository Layout

```text
kaizen/

├── apps/
│
├── services/
│
├── packages/
│
├── docs/
│
├── .github/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── README.md
```

---

# 4. Repository Ownership Rules

| Folder   | Owner             |
| -------- | ----------------- |
| apps     | Frontend Team     |
| services | Backend Team      |
| packages | Platform Team     |
| docs     | Architecture Team |

---

# 5. apps Folder

## Purpose

Contains all user-facing applications.

---

## Structure

```text
apps/
├── web/
├── mobile/
└── desktop/
```

---

## Allowed Contents

* UI
* Routing
* State management
* Forms
* API communication

---

## Forbidden Contents

* Database access
* Business logic
* AI provider calls
* Secrets

---

# 6. Web Application Structure

## Path

```text
apps/web
```

---

## Structure

```text
apps/web/

├── public/

├── src/
│
├── assets/
│
├── app/
│
├── features/
│
├── pages/
│
├── components/
│
├── hooks/
│
├── services/
│
├── store/
│
├── routes/
│
├── layouts/
│
├── constants/
│
├── lib/
│
├── types/
│
└── styles/

├── tests/

├── package.json
└── vite.config.ts
```

---

## Folder Responsibilities

### public

Static assets.

---

### assets

Images and icons.

---

### app

Application initialization.

---

### features

Feature-based modules.

Example:

```text
features/

├── auth
├── meals
├── goals
├── dashboard
├── reports
└── settings
```

---

### pages

Route-level pages.

---

### components

Reusable UI components.

---

### hooks

React hooks.

---

### services

API communication.

---

### store

Zustand stores.

---

### routes

Route definitions.

---

### layouts

Application layouts.

---

### constants

Static constants.

---

### lib

Frontend helper functions.

---

### tests

Frontend tests.

---

# 7. Mobile Application Structure

## Path

```text
apps/mobile
```

---

## Structure

```text
apps/mobile/

├── assets/

├── src/
│
├── app/
│
├── features/
│
├── screens/
│
├── navigation/
│
├── components/
│
├── hooks/
│
├── services/
│
├── store/
│
├── constants/
│
├── lib/
│
└── types/

├── tests/

├── app.json
└── package.json
```

---

## Folder Responsibilities

### screens

Mobile screens.

---

### navigation

React Navigation setup.

---

### features

Feature modules.

---

### store

Mobile state management.

---

### services

API communication.

---

## Forbidden Contents

* Direct database access
* Business logic
* AI provider access

---

# 8. Desktop Application Structure

## Path

```text
apps/desktop
```

---

## Structure

```text
apps/desktop/

├── electron/
│
├── src/
│
├── app/
│
├── features/
│
├── pages/
│
├── components/
│
├── hooks/
│
├── services/
│
├── store/
│
├── layouts/
│
├── constants/
│
├── lib/
│
└── types/

├── tests/

├── electron-builder.json
└── package.json
```

---

## Folder Responsibilities

### electron

Electron main process.

---

### src

Renderer process.

---

### features

Feature modules.

---

### services

API communication.

---

## Forbidden Contents

* Direct database access
* AI provider access

---

# 9. services Folder

## Purpose

Contains backend services.

---

## Structure

```text
services/

├── api/
└── ai/
```

---

# 10. API Service Structure

## Path

```text
services/api
```

---

## Structure

```text
services/api/

├── src/
│
├── app/
│
├── config/
│
├── modules/
│
├── middleware/
│
├── routes/
│
├── controllers/
│
├── services/
│
├── repositories/
│
├── models/
│
├── validators/
│
├── jobs/
│
├── utils/
│
├── types/
│
└── tests/

├── package.json
└── tsconfig.json
```

---

## Responsibilities

### app

Application bootstrap.

---

### config

Environment configuration.

---

### modules

Feature modules.

Example:

```text
modules/

├── auth
├── users
├── meals
├── goals
├── reports
├── notifications
└── achievements
```

---

### middleware

Express middleware.

---

### routes

Route definitions.

---

### controllers

Request handlers.

---

### services

Business logic.

---

### repositories

Database access layer.

---

### models

Mongoose schemas.

---

### validators

Request validation.

---

### jobs

Background jobs.

---

## Forbidden Contents

* Frontend code
* OpenAI calls

---

# 11. AI Service Structure

## Path

```text
services/ai
```

---

## Structure

```text
services/ai/

├── app/
│
├── api/
│
├── config/
│
├── providers/
│
├── prompts/
│
├── engines/
│
├── cache/
│
├── models/
│
├── schemas/
│
├── services/
│
├── utils/
│
├── tests/

├── main.py
└── requirements.txt
```

---

## Responsibilities

### providers

Provider abstraction layer.

Example:

```text
providers/

├── openai
└── interfaces
```

---

### prompts

Prompt definitions.

---

### engines

AI engines.

Example:

```text
engines/

├── food-parser
├── nutrition-analysis
├── deficiency-detection
├── recommendations
├── coaching
└── reports
```

---

### cache

AI cache layer.

---

## Forbidden Contents

* User authentication
* Business rules
* Direct database ownership

---

# 12. packages Folder

## Purpose

Contains reusable shared code.

---

## Structure

```text
packages/

├── shared-types/
├── shared-validation/
└── shared-utils/
```

---

# 13. shared-types Structure

## Path

```text
packages/shared-types
```

---

## Structure

```text
shared-types/

├── auth/
├── users/
├── meals/
├── goals/
├── reports/
├── achievements/
└── index.ts
```

---

## Allowed Contents

* Interfaces
* DTOs
* Enums

---

## Forbidden Contents

* Business logic
* Validation
* API calls

---

# 14. shared-validation Structure

## Path

```text
packages/shared-validation
```

---

## Structure

```text
shared-validation/

├── auth/
├── users/
├── meals/
├── goals/
├── reports/
└── index.ts
```

---

## Allowed Contents

* Zod schemas
* Validation helpers

---

## Forbidden Contents

* Business logic
* API code

---

# 15. shared-utils Structure

## Path

```text
packages/shared-utils
```

---

## Structure

```text
shared-utils/

├── dates/
├── formatting/
├── calculations/
├── constants/
└── index.ts
```

---

## Allowed Contents

* Pure functions
* Constants
* Helpers

---

## Forbidden Contents

* React code
* Business logic
* API access

---

# 16. Testing Structure

## Strategy

Testing exists within each application and service.

---

## Layout

```text
apps/*/tests

services/api/tests

services/ai/tests
```

---

## Test Categories

### Unit Tests

```text
tests/unit
```

---

### Integration Tests

```text
tests/integration
```

---

### End-to-End Tests

```text
tests/e2e
```

---

## Ownership

| Test Type   | Owner         |
| ----------- | ------------- |
| Unit        | Feature Owner |
| Integration | Service Owner |
| E2E         | Platform Team |

---

# 17. Documentation Structure

## Path

```text
docs/
```

---

## Structure

```text
docs/

├── 01_project/
│
├── 02_architecture/
│
├── 03_api/
│
├── 04_database/
│
├── 05_deployment/
│
├── 06_testing/
│
└── 07_operations/
```

---

## Architecture Folder

```text
docs/02_architecture/

01_system_architecture.md
02_technology_decisions.md
03_database_architecture.md
04_api_architecture.md
05_frontend_architecture.md
06_ai_architecture.md
07_security_architecture.md
08_deployment_architecture.md
09_monitoring_architecture.md
10_scalability_architecture.md
11_cross_platform_architecture.md
12_folder_structure.md
```

---

# 18. AI Coding Agent Rules

## AI Agents Must

* Follow this structure exactly
* Respect package boundaries
* Respect ownership boundaries
* Keep business logic in services
* Keep UI inside apps

---

## AI Agents Must Never

### Move Folders

```text
Not Allowed
```

---

### Create New Top-Level Directories

```text
Not Allowed
```

---

### Place Business Logic In Shared Packages

```text
Not Allowed
```

---

### Access Database From Frontend

```text
Not Allowed
```

---

### Call OpenAI From Clients

```text
Not Allowed
```

---

# 19. Dependency Direction Rules

## Allowed

```text
apps
   |
   v

packages

services
   |
   v

packages
```

---

## Forbidden

```text
packages
    |
    v

apps

packages
    |
    v

services
```

---

## Dependency Diagram

```text
            +------------------+
            |     packages     |
            +--------+---------+
                     ^
                     |
         +-----------+-----------+
         |                       |
         |                       |
         |                       |
+--------+--------+     +--------+--------+
|      apps       |     |    services     |
+-----------------+     +-----------------+
```

Packages must never depend on apps or services.

---

# 20. Architecture Review Checklist

## Repository Structure

* [ ] Folder structure unchanged
* [ ] Package boundaries respected

---

## Applications

* [ ] No database access
* [ ] No AI provider access

---

## Services

* [ ] Business logic isolated
* [ ] AI logic isolated

---

## Shared Packages

* [ ] No business logic
* [ ] No UI components
* [ ] No platform-specific code

---

## Documentation

* [ ] Architecture documents updated
* [ ] Folder structure remains authoritative

---

# 21. Conclusion

This document defines the official repository structure for Kaizen and serves as the authoritative source for all implementation decisions. By enforcing strict boundaries between applications, services, shared packages, testing, and documentation, the architecture remains maintainable, scalable, AI-agent-friendly, and prepared for long-term growth across Web, Mobile, Desktop, and future platforms.
