# Release Checklist

**Document ID:** release_checklist.md
**Version:** 1.0
**Status:** Approved
**Author:** DevOps & Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
To provide a strict, unskippable sequence of checks that must occur before any code is promoted to the production environment. This prevents outages, data corruption, and embarrassing user-facing bugs.

### WHO Uses It?
The Release Manager, DevOps Engineers, and the Lead Developer for the current sprint.

### WHEN Is It Used?
At the end of the sprint, during the final preparation phase for a production release.

---

## 2. Pre-Release Validation

- [ ] **Code Freeze:** Main branch is locked. No new feature PRs are being merged.
- [ ] **CI Pipeline Green:** The `main` branch is passing all automated builds, unit tests, and integration tests in the CI pipeline (GitHub Actions/GitLab CI).
- [ ] **E2E Tests Passing:** The automated E2E suite (Playwright/Cypress) has successfully completed against the staging environment.
- [ ] **Manual QA Sign-off:** QA has executed the critical paths in `manual_test_cases.md` and formally signed off on the release candidate.
- [ ] **Dependencies Audited:** Run `npm audit` (or equivalent) to ensure no high or critical vulnerabilities have been introduced via third-party packages.

## 3. Database Preparation

- [ ] **Migrations Reviewed:** If the release includes database schema changes, the migration scripts have been reviewed by a Senior Engineer/DBA.
- [ ] **Staging Migration Tested:** Migrations have been successfully executed against a clone of production data in the staging environment.
- [ ] **Backup Verified:** Confirm that the automated MongoDB Atlas backup snapshot has completed successfully within the last 4 hours.

## 4. Deployment Execution

- [ ] **Notify Stakeholders:** Alert the team (via Slack/Teams) that a production deployment is commencing.
- [ ] **Execute Migrations:** Run the database migrations on the production cluster.
- [ ] **Deploy Backend API:** Trigger the deployment of the Node.js Express service.
- [ ] **Deploy AI Service:** Trigger the deployment of the Python FastAPI service.
- [ ] **Deploy Web Client:** Trigger the build and CDN invalidation for the React frontend.
- [ ] **App Store Submission:** (If applicable) Submit the new React Native builds to the Apple App Store and Google Play Store.

## 5. Post-Deployment Verification (Smoke Testing)

Immediately after deployment, perform the following checks on the live production environment:

- [ ] **Health Checks:** Verify `/health` endpoints for both Express and FastAPI are returning `200 OK`.
- [ ] **Authentication:** Verify a test account can log in successfully.
- [ ] **Core Flow:** Log a test meal and verify it saves to the database.
- [ ] **AI Connection:** Ask the AI Coach a test question and verify a response is received.

## 6. Rollback Protocol

If any of the smoke tests fail:
1. Immediately halt the rollout.
2. If database schemas were altered, evaluate if a reverse migration is necessary (prefer rolling forward with a hotfix if the schema change is non-destructive).
3. Revert the Web, Backend, and AI deployments to the previous stable Git SHA.
4. Notify the team that the release has been aborted.
