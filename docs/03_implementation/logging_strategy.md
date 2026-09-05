# Logging Strategy

**Document ID:** logging_strategy.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
To standardize how the application records events. Consistent, structured logging is the only way to debug a distributed system in production.

### WHO Uses It?
All engineers writing backend or AI code.

### WHEN Is It Used?
Constantly. Every significant business action, error, or network request must be logged.

---

## 2. Implementation Specifications

### 2.1 The Tooling
*   **Library:** `winston` (Node.js) / `logging` (Python).
*   **Format:** STRICTLY JSON (`winston.format.json()`) in production. Pretty-print in development.
*   **Transport:** stdout (Standard Output). We do not write to files. The hosting provider (Render) captures stdout and forwards it to our log aggregator (e.g., Datadog or Papertrail).

### 2.2 The Logger Configuration (Express)

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'kaizen-api-service' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' 
        ? winston.format.simple() 
        : winston.format.json()
    })
  ],
});
```

---

## 3. What to Log (and What NOT to Log)

### 3.1 Required Metadata
Every log entry must include:
- `timestamp` (Auto-injected by Winston)
- `level` (info, warn, error)
- `message` (Human readable description)
- `userId` (If the request is authenticated)
- `requestId` (UUID generated on incoming request via middleware to trace flows)

### 3.2 Prohibited Data (PII/PHI)
**NEVER LOG:**
- Passwords (raw or hashed)
- JWT Tokens
- Raw health data (e.g., Do not log `User logged 300lbs weight`. Log `User created weight entry ID: 123`).

### 3.3 Standard Log Levels
*   `error`: System failures (DB disconnected, OpenAI 500 error). Triggers an alert in Sentry.
*   `warn`: Recoverable errors (Rate limits, Invalid user inputs 400s).
*   `info`: Standard business actions (User registered, Job started, Job finished).
*   `debug`: Extremely verbose tracing (Only enabled during local dev).

---

## 4. SCALE & TRADE-OFFS

### How will this scale?
By strictly adhering to JSON output on `stdout`, we decouple the application from the logging destination. We can switch from Render's built-in logs to Datadog to Splunk without modifying a single line of application code.

### What are the trade-offs?
JSON logging is harder for humans to read in a raw terminal, requiring developers to rely on log parsing tools or switch to pretty-print during local development.
