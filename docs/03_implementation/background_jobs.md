# Background Jobs & Cron Workflows

**Document ID:** background_jobs.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
To define how asynchronous, long-running, or scheduled tasks are executed without blocking the main HTTP request-response cycle.

### WHO Uses It?
Backend Engineers building the AI orchestration and DevOps Engineers setting up the infrastructure.

### WHEN Is It Used?
During Sprint 3 (AI Integration) and whenever delayed tasks are required.

---

## 2. Infrastructure Architecture (Phase 1)

For the MVP, we avoid deploying heavy message brokers (like RabbitMQ or Kafka) or dedicated worker dynos (Celery) to keep costs low and deployment simple.

### 2.1 Tooling
*   **Task Queue:** `bullmq` (Node.js) backed by a lightweight managed Redis instance (or MongoDB using `agenda` if Redis is completely avoided). 
*   **Decision:** We will use `agenda` (MongoDB-backed) to keep infrastructure limited to exactly Node + Python + MongoDB.

### 2.2 Flow
1. API receives a request (e.g., "Generate Daily Insight").
2. API enqueues a job in the MongoDB `agendaJobs` collection.
3. API immediately returns `202 Accepted` to the client.
4. A background worker process (running inside the Express app container for MVP) picks up the job, executes it, and updates the database.

---

## 3. Scheduled Workflows (Cron)

### 3.1 The "Daily AI Insight" Workflow
**Goal:** Generate a motivational summary for every active user based on yesterday's data.

**Schedule:** Every day at 02:00 AM UTC.

**Execution Steps (Agenda Job):**
1. Query MongoDB for all users who logged data in the last 24 hours.
2. Batch users into groups of 50.
3. For each batch, send the raw meal/water data to the FastAPI Service.
4. FastAPI processes the batch via OpenAI and returns the insights.
5. Save the generated insights into the MongoDB `insights` collection.
6. (Future: Trigger a push notification).

### 3.2 Token Cleanup Workflow
**Goal:** Prevent the `refreshTokens` collection from growing infinitely with revoked tokens.

**Schedule:** Note: We do NOT use a cron job for this. We use MongoDB TTL Indexes (`expireAfterSeconds: 0` on the `expiresAt` field). The database engine handles this automatically without application overhead.

---

## 4. Error Handling & Retries

Background jobs are susceptible to network timeouts (especially when calling OpenAI).

### 4.1 Retry Strategy
*   **Max Retries:** 3
*   **Backoff:** Exponential (Wait 1 min, then 5 mins, then 15 mins).
*   **Failure State:** If a job fails 3 times, mark it as `FAILED` in the database and emit an ERROR log to Sentry for developer review. DO NOT continuously retry failed AI generations, as this will burn API credits.

---

## 5. SCALE & TRADE-OFFS

### How will this scale?
Running the Agenda worker inside the main Express process is fine for 1,000 users. As traffic grows, we will deploy a *separate* Render instance running the exact same Node.js codebase, but with the HTTP server disabled, operating strictly as a background worker.

### What are the trade-offs?
Using MongoDB for a job queue (`agenda`) is slower than using Redis (`bullmq`). However, it prevents us from having to manage, secure, and pay for a Redis cluster on Day 1.
