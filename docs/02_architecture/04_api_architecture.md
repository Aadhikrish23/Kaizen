# Kaizen API Architecture

**Document ID:** 04_api_architecture.md
**Version:** 1.1
**Status:** Approved for Phase 1 Development
**Author:** Principal Software Architecture Team
**Last Updated:** June 2026

---

# 1. Document Information

| Attribute      | Value                                     |
| -------------- | ----------------------------------------- |
| Document Title | API Architecture                          |
| Version        | 1.0                                       |
| Status         | Approved                                  |
| API Style      | REST                                      |
| Framework      | Express.js + TypeScript                   |
| Authentication | JWT Access + Refresh Tokens               |
| Audience       | Architects, Developers, AI Coding Agents  |
| Scope          | API Standards and Endpoint Specifications |

---

# 2. Executive Summary

Kaizen follows an API-First Architecture where all business functionality is exposed through versioned REST APIs.

The API serves:

* Web Application
* Mobile Application
* Desktop Application
* Future Integrations

Responsibilities:

* Authentication
* Authorization
* Validation
* Business Logic
* Data Orchestration
* AI Service Integration

---

# 3. API Design Principles

## Consistency

All endpoints follow consistent:

* Naming conventions
* Response structures
* Error formats

---

## Resource-Oriented Design

Examples:

```text
/users
/goals
/meals
/water
/weight
```

---

## Stateless Design

The API remains stateless.

Session state is maintained through:

```text
JWT Access Tokens
+
Refresh Tokens
```

---

## Security By Default

All business endpoints require authentication.

---

## Versioning

All routes are versioned.

```text
/api/v1
```

---

# 4. Versioning Strategy

## URL Versioning

Examples:

```text
/api/v1/auth/login
/api/v1/meals
/api/v1/goals
```

---

## Future Versions

```text
/api/v2
/api/v3
```

---

## Deprecation Policy

| Stage      | Duration          |
| ---------- | ----------------- |
| Active     | Current Version   |
| Deprecated | 6 Months          |
| Removed    | After Deprecation |

---

# 5. Authentication Strategy

## Authentication Model

Kaizen uses:

```text
Access Token
+
Refresh Token
```

---

## Access Token

Purpose:

* API Authorization

Lifetime:

```text
15 Minutes
```

---

## Refresh Token

Purpose:

* Session Continuation

Lifetime:

```text
30 Days
```

---

## Storage

### Access Token

Stored client-side.

---

### Refresh Token

Stored securely.

Database stores:

```text
Hashed Refresh Token
```

only.

---

## Authentication Header

```http
Authorization: Bearer <access-token>
```

---

# 6. Refresh Token Lifecycle

```text
Login
  |
  v

Access Token
Refresh Token

  |
  v

Access Token Expires

  |
  v

Refresh Request

  |
  v

Validate Refresh Token

  |
  v

Revoke Old Token

  |
  v

Issue New Tokens

  |
  v

Store New Refresh Token
```

---

# 7. Token Rotation Strategy

Every refresh request performs:

```text
Old Refresh Token
       |
       v

Validation
       |
       v

Revocation
       |
       v

Generate New Token
       |
       v

Store New Hash
       |
       v

Return New Tokens
```

---

## Benefits

* Replay protection
* Session security
* Stolen token mitigation

---

# 8. Authorization Strategy

## Ownership-Based Access

Users may access only their own resources.

Examples:

```text
User A
Cannot Access
User B Meals

User A
Cannot Access
User B Goals
```

---

## Authorization Layers

| Layer                | Responsibility      |
| -------------------- | ------------------- |
| JWT Middleware       | Authentication      |
| Ownership Middleware | Resource Access     |
| Service Layer        | Business Validation |

---

# 9. Standard Response Format

## Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}
```

---

## Response Fields

| Field   | Description   |
| ------- | ------------- |
| success | Status        |
| message | Human Message |
| data    | Payload       |
| meta    | Metadata      |

---

# 10. Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

---

## Standard Status Codes

| Code | Meaning      |
| ---- | ------------ |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 403  | Forbidden    |
| 404  | Not Found    |
| 409  | Conflict     |
| 429  | Rate Limited |
| 500  | Server Error |

---

# 11. Pagination Standards

## Query Parameters

```http
?page=1&limit=20
```

---

## Response Format

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5
  }
}
```

---

## Defaults

| Property | Value |
| -------- | ----- |
| page     | 1     |
| limit    | 20    |
| maxLimit | 100   |

---

# 12. Filtering Standards

Examples:

```http
/meals?mealType=BREAKFAST
/meals?startDate=2026-01-01
```

---

# 13. Sorting Standards

Examples:

```http
?sortBy=createdAt&order=desc
```

---

Default:

```text
createdAt DESC
```

---

# 14. Authentication Endpoints

# Register

| Property       | Value                 |
| -------------- | --------------------- |
| Method         | POST                  |
| Route          | /api/v1/auth/register |
| Authentication | Public                |
| Purpose        | Create Account        |

### Request

```json
{
  "email": "user@example.com",
  "password": "password",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Response

```json
{
  "userId": "string",
  "email": "user@example.com"
}
```

---

# Login

| Property       | Value              |
| -------------- | ------------------ |
| Method         | POST               |
| Route          | /api/v1/auth/login |
| Authentication | Public             |
| Purpose        | Authenticate User  |

### Request

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Response

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {}
}
```

---

# Refresh Token

| Property       | Value                      |
| -------------- | -------------------------- |
| Method         | POST                       |
| Route          | /api/v1/auth/refresh-token |
| Authentication | Refresh Token Required     |
| Purpose        | Renew Session              |

### Request

```json
{
  "refreshToken": "token"
}
```

### Response

```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

### Error Responses

```text
400 Invalid Request
401 Invalid Token
401 Revoked Token
401 Expired Token
429 Rate Limited
```

---

# Logout

| Property       | Value                 |
| -------------- | --------------------- |
| Method         | POST                  |
| Route          | /api/v1/auth/logout   |
| Authentication | Required              |
| Purpose        | Logout Current Device |

### Request

```json
{
  "refreshToken": "token"
}
```

### Response

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Error Responses

```text
401 Unauthorized
404 Session Not Found
```

---

# Logout All Devices

| Property       | Value                   |
| -------------- | ----------------------- |
| Method         | POST                    |
| Route          | /api/v1/auth/logout-all |
| Authentication | Required                |
| Purpose        | Revoke All Sessions     |

### Request

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "All sessions revoked"
}
```

### Error Responses

```text
401 Unauthorized
500 Internal Error
```

---

# Forgot Password

POST /api/v1/auth/forgot-password

---

# Reset Password

POST /api/v1/auth/reset-password

---

# 15. Logout Workflow

## Single Device Logout

```text
Logout
   |
   v

Refresh Token
   |
   v

Revoke Token
   |
   v

Session Invalidated
```

---

## Logout All Devices

```text
Logout All
      |
      v

Find User Sessions
      |
      v

Revoke All Tokens
      |
      v

All Devices Logged Out
```

---

# 16. User Endpoints

| Method | Route                  | Purpose         |
| ------ | ---------------------- | --------------- |
| GET    | /api/v1/users/me       | Profile         |
| PUT    | /api/v1/users/me       | Update Profile  |
| GET    | /api/v1/users/settings | Get Settings    |
| PUT    | /api/v1/users/settings | Update Settings |

Authentication Required: Yes

---

# 17. Goal Endpoints

| Method | Route                 |
| ------ | --------------------- |
| POST   | /api/v1/goals         |
| GET    | /api/v1/goals         |
| GET    | /api/v1/goals/:goalId |
| PUT    | /api/v1/goals/:goalId |
| DELETE | /api/v1/goals/:goalId |

Authentication Required: Yes

---

# 18. Meal Endpoints

| Method | Route                      |
| ------ | -------------------------- |
| POST   | /api/v1/meals              |
| GET    | /api/v1/meals              |
| GET    | /api/v1/meals/:mealId      |
| PUT    | /api/v1/meals/:mealId      |
| DELETE | /api/v1/meals/:mealId      |
| GET    | /api/v1/meals/foods/search |

Authentication Required: Yes

---

# 19. Water Endpoints

| Method | Route                |
| ------ | -------------------- |
| POST   | /api/v1/water        |
| GET    | /api/v1/water        |
| DELETE | /api/v1/water/:logId |

Authentication Required: Yes

---

# 20. Weight Endpoints

| Method | Route                    |
| ------ | ------------------------ |
| POST   | /api/v1/weight           |
| GET    | /api/v1/weight           |
| PUT    | /api/v1/weight/:weightId |
| DELETE | /api/v1/weight/:weightId |

Authentication Required: Yes

---

# 21. Recipe Endpoints

| Method | Route                     |
| ------ | ------------------------- |
| POST   | /api/v1/recipes           |
| GET    | /api/v1/recipes           |
| GET    | /api/v1/recipes/:recipeId |
| PUT    | /api/v1/recipes/:recipeId |
| DELETE | /api/v1/recipes/:recipeId |

Authentication Required: Yes

---

# 22. Dashboard Endpoints

| Method | Route                       |
| ------ | --------------------------- |
| GET    | /api/v1/dashboard/summary   |
| GET    | /api/v1/dashboard/nutrition |
| GET    | /api/v1/dashboard/progress  |

Authentication Required: Yes

---

# 23. Report Endpoints

| Method | Route                     |
| ------ | ------------------------- |
| POST   | /api/v1/reports/generate  |
| GET    | /api/v1/reports           |
| GET    | /api/v1/reports/:reportId |

Authentication Required: Yes

---

# 24. Achievement Endpoints

| Method | Route                     |
| ------ | ------------------------- |
| GET    | /api/v1/achievements      |
| GET    | /api/v1/achievements/user |

Authentication Required: Yes

---

# 25. Challenge Endpoints

| Method | Route                                |
| ------ | ------------------------------------ |
| GET    | /api/v1/challenges                   |
| POST   | /api/v1/challenges/:challengeId/join |
| GET    | /api/v1/challenges/user              |

Authentication Required: Yes

---

# 26. Notification Endpoints

| Method | Route                                      |
| ------ | ------------------------------------------ |
| GET    | /api/v1/notifications                      |
| PATCH  | /api/v1/notifications/:notificationId/read |
| PATCH  | /api/v1/notifications/read-all             |

Authentication Required: Yes

---

# 27. AI Service Endpoints

| Method | Route                            |
| ------ | -------------------------------- |
| POST   | /api/v1/ai/insights              |
| POST   | /api/v1/ai/recommendations/meals |
| POST   | /api/v1/ai/nutrition-analysis    |
| POST   | /api/v1/ai/goal-suggestions      |

Authentication Required: Yes

---

# 28. Rate Limiting Strategy

| Endpoint Group | Limit      |
| -------------- | ---------- |
| Authentication | 10/minute  |
| Standard APIs  | 100/minute |
| AI APIs        | 20/minute  |

---

# 29. API Security Standards

Required Controls:

* JWT Validation
* Refresh Token Validation
* Token Rotation
* Ownership Checks
* Input Validation
* Rate Limiting
* HTTPS Enforcement
* CORS Protection

---

# 30. API Lifecycle

```text
Draft
  |
Development
  |
Testing
  |
Production
  |
Deprecated
  |
Retired
```

---

# 31. Conclusion

The Kaizen API Architecture provides a secure, scalable, and maintainable REST API foundation built around an Access Token + Refresh Token authentication model. Through standardized responses, token rotation, session revocation, ownership-based authorization, and consistent endpoint design, the API layer supports all client platforms while remaining scalable for future growth, integrations, and advanced AI capabilities.
