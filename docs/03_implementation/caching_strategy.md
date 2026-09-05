# Caching Strategy Implementation

**Document ID:** caching_strategy.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
To prevent database overloading and minimize latency. This document defines exactly what is cached, where it is cached, and when the cache is invalidated.

### WHO Uses It?
Backend Engineers and AI Agents implementing the Express and FastAPI services, and Frontend Engineers configuring React Query.

### WHEN Is It Used?
During the implementation of data-fetching routes (Sprint 2 and 3).

---

## 2. Frontend Caching (React Query)

The primary caching layer for the application lives on the client device via React Query. This prevents unnecessary network requests for data that changes infrequently.

### 2.1 Configuration Rules
*   **Stale Time (Default):** 5 minutes. Data is served instantly from cache without a background refetch for 5 minutes.
*   **Cache Time (Default):** 30 minutes. Unused data is kept in memory for 30 minutes before being garbage collected.
*   **Specific Exceptions:**
    *   `Daily User Profile`: Stale Time = 1 hour (rarely changes).
    *   `Daily AI Insight`: Stale Time = 24 hours (generated once a day).
    *   `Today's Meals`: Stale Time = 0 minutes (Always refetch in background to ensure sync across multiple devices).

### 2.2 Cache Invalidation
Any `POST`, `PUT`, or `DELETE` mutation must immediately invalidate the corresponding query keys to trigger a refetch.
```typescript
// Example: Invalidate daily meals after a new meal is logged
queryClient.invalidateQueries({ queryKey: ['meals', 'daily', today] });
```

---

## 3. Backend Caching (Express API)

For Phase 1 MVP, we intentionally avoid deploying a separate Redis cluster to minimize infrastructure complexity. Caching is handled in-memory using `node-cache`.

### 3.1 What is Cached?
*   **Static Reference Data:** (e.g., standard serving sizes, predefined app configuration). TTL: 24 hours.
*   **High-Volume Read Endpoints:** If a specific endpoint becomes a bottleneck, wrap it in a caching middleware.

### 3.2 What is NEVER Cached?
*   **Personal Health Data (Meals, Water, Weight):** Read directly from MongoDB. The frontend React Query cache mitigates read volume. MongoDB indexes handle query speed.
*   **Authentication Tokens:** Verified instantly against the database.

---

## 4. AI Service Caching (FastAPI)

The OpenAI API is expensive and slow. Caching is mandatory for the AI service.

### 4.1 Implementation
*   **Mechanism:** In-memory dictionary or SQLite cache within the Python environment.
*   **Key:** Hash of `(userId + targetDate + mealDataString)`.
*   **TTL:** 24 hours.
*   **Logic:** Before calling OpenAI to generate a Daily Insight, the FastAPI service checks the cache. If an insight was already generated for this exact dataset today, return the cached string immediately.

---

## 5. SCALE & TRADE-OFFS

### How will this scale?
As we scale beyond 10,000 active users, the in-memory Node cache will become inefficient (as it is not shared across horizontal instances). At that scale marker, we will rip out `node-cache` and replace it with a centralized Redis cluster (Phase 3).

### What are the trade-offs?
Not using Redis immediately saves roughly $50/month and removes a moving piece from the deployment pipeline, but means each server instance maintains its own cache, reducing overall cache hit rates in a multi-instance deployment.
