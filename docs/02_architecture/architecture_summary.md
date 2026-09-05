# Architecture Summary

**Document ID:** architecture_summary.md
**Version:** 1.0
**Status:** Approved
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

This document serves as the high-level roadmap to the Kaizen architectural design. Kaizen is an AI-powered health tracking platform using a modular, service-oriented architecture designed to scale to tens of thousands of active users. The architecture prioritizes separation of concerns, strong typing, API-first design, and isolated AI workloads.

### WHY Does This Document Exist?
To provide a single entry point for understanding the entire system architecture, allowing new developers and AI agents to quickly grasp how the components interact before diving into specific subsystem documentation.

### WHO Uses It?
All engineers, DevOps personnel, and AI coding agents during onboarding or when assessing cross-system impacts.

### WHEN Is It Used?
During onboarding, system design discussions, and when tracing request flows across the platform.

---

## 2. High-Level Architecture Overview

Kaizen utilizes a client-server model extended by an isolated AI processing layer:

- **Clients (Frontend):** React (Web), React Native (Mobile), Electron (Desktop).
- **Core Backend (Business Logic):** Node.js + Express (TypeScript).
- **Database (Persistence):** MongoDB Atlas.
- **AI Backend (Intelligence):** Python + FastAPI.
- **External Dependencies:** OpenAI API, Cloudinary (Media).

### Core Philosophy
1. **API-First:** All business capabilities are exposed via REST APIs.
2. **AI Isolation:** The AI Service operates independently. If AI processing fails or is delayed, core health tracking (food, water, weight) must remain 100% operational.
3. **Feature-Based Modules:** Code is organized by business feature (e.g., `features/Goals`) rather than technical layer (e.g., `controllers/`).

---

## 3. Directory of Architecture Documents

Detailed architectural decisions are broken down into the following specific domains. Review these documents for deep dives into their respective areas:

| Domain | Document | Purpose |
| :--- | :--- | :--- |
| **System Overview** | `01_system_architecture.md` | Core structural breakdown and request flow. |
| **Tech Stack** | `02_technology_decisions.md` | Justifications for the chosen technologies. |
| **Data Layer** | `03_database_architecture.md` | MongoDB collection definitions, indexing, and normalization strategies. |
| **API Layer** | `04_api_architecture.md` | REST API standards, endpoint structures, and routing rules. |
| **Frontend** | `05_frontend_architecture.md` | React, React Native, and state management strategies. |
| **AI Layer** | `06_ai_architecture.md` | FastAPI integration, prompt management, and AI boundaries. |
| **Security** | `07_security_architecture.md` | JWT Auth, RBAC, and data protection strategies. |
| **DevOps** | `08_deployment_architecture.md` | CI/CD pipelines, containerization, and hosting. |
| **Observability**| `09_monitoring_architecture.md` | Logging, metrics, alerting, and APM. |
| **Scaling** | `10_scalability_architecture.md` | Strategies for horizontal scaling and performance tuning. |
| **Cross-Platform**| `11_cross_platform_architecture.md`| Code sharing between Web, Mobile, and Desktop clients. |
| **Structure** | `12_folder_structure.md` | Strict monorepo directory layouts. |
| **Standards** | `13_coding_standards.md` | TypeScript strictness, naming conventions, and linting rules. |
| **Errors** | `14_error_handling_strategy.md` | Standardized error responses and handling patterns. |
| **Testing** | `15_testing_strategy.md` | Requirements for unit, integration, and E2E coverage. |

---

## 4. Key Architectural Decisions (ADRs)

1. **MongoDB over SQL:** Chosen for schema flexibility with rapidly evolving health metrics and easy handling of complex, nested AI-generated insights. 
2. **Monorepo:** Utilized to strictly enforce shared contracts (DTOs, Validation schemas via Zod) between the frontend and backend.
3. **FastAPI for AI:** Chosen over Node.js for AI tasks due to the superior Python data science and machine learning ecosystem.

---

## 5. Scalability & Trade-offs

### HOW will it scale?
- **Stateless APIs:** The Node.js and FastAPI services are entirely stateless, allowing horizontal scaling behind a load balancer.
- **Database Indexing:** Heavy read paths (e.g., fetching monthly weight trends) are optimized via strict indexing defined in `03_database_architecture.md`.

### WHAT are the trade-offs?
- **Network Latency:** By separating the AI Service from the core API, AI requests require an additional network hop. This is accepted to ensure core system stability.
- **Data Duplication:** We employ a hybrid normalization strategy. Some data (like meal summaries) is denormalized to avoid expensive joins, trading storage space for read performance.
