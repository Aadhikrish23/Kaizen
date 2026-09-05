# CI/CD Workflows

**Document ID:** ci_cd_workflows.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** DevOps Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
To define the exact automated pipeline steps that take code from a developer's laptop to production. It removes manual deployment errors.

### WHO Uses It?
DevOps engineers and any developer merging a Pull Request.

### WHEN Is It Used?
Triggered automatically on every git push and PR merge.

---

## 2. CI Pipeline (GitHub Actions)

We use GitHub Actions as the CI runner for the monorepo.

### 2.1 Trigger Rules
- **On Pull Request** to `main`: Run Linting, Type Checking, and Tests.
- **On Push** to `main`: Run full suite + Trigger Deployment.

### 2.2 Pipeline Definition (`.github/workflows/ci.yml`)

```yaml
name: Kaizen CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install Node Dependencies
        run: npm ci
        
      - name: Run Linter (ESLint)
        run: npm run lint
        
      - name: Run Type Check (tsc)
        run: npm run typecheck
        
      - name: Run Unit Tests
        run: npm run test:unit
        
      # Only run heavy Integration/E2E on PRs or Main
      - name: Run Integration Tests
        run: npm run test:integration
```

---

## 3. CD Pipeline (Deployment Automation)

Because we use managed platforms (Vercel & Render) for MVP, deployment is triggered via Webhooks rather than complex Docker pushing in Actions.

### 3.1 Frontend (Vercel)
*   **Trigger:** Vercel automatically listens to the `main` branch.
*   **Build Command:** `npm run build --filter=web`
*   **Output Directory:** `apps/web/dist`

### 3.2 Backend (Render)
*   **Trigger:** Render is connected to the GitHub repo. Auto-deploy on `main` push.
*   **Build Command:** `npm ci && npm run build --filter=api`
*   **Start Command:** `npm run start --filter=api`

### 3.3 Database Migrations
*   **Execution:** Database migrations are executed during the Render build step BEFORE the server starts.
*   **Command:** `npm run migrate:up`

---

## 4. SCALE & TRADE-OFFS

### How will this scale?
Turborepo caching (`npm run build`) in CI ensures that if a PR only touches the frontend, the backend tests are skipped, saving CI minutes and speeding up merge times.

### What are the trade-offs?
Auto-deploying to production on every `main` merge (Continuous Deployment) is extremely fast but risky if tests are insufficient. The safety net relies entirely on the thoroughness of the tests defined in `test_plan.md`.
