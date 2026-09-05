# API Contracts

**Document ID:** api_contracts.md
**Version:** 1.0
**Status:** Approved
**Author:** Lead Software Architect
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
This document establishes the exact shape of the API, creating a strict contract between the frontend clients (React/React Native) and the backend (Express). It allows frontend and backend teams (or AI agents) to work in parallel without blocking each other.

### WHO Uses It?
Frontend engineers implementing API calls, backend engineers building the routes, and QA testing the endpoints.

### WHEN Is It Used?
During development of the MVP tracking features and authentication flows.

---

## 2. Global Standards

### Base URL
All API requests are prefixed with: `/api/v1`

### Request Headers
Authenticated routes require a valid JWT Access Token.
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Standard Response Envelope
All API responses follow a strict envelope structure.

**Success (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... } // Optional pagination/metadata
}
```

**Error (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [] // Optional validation issues
  }
}
```

---

## 3. Authentication APIs

### 3.1 Register User
**Route:** `POST /auth/register`
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64abc...",
      "email": "user@example.com",
      "firstName": "John"
    },
    "tokens": {
      "accessToken": "ey...",
      "refreshToken": "ey..."
    }
  }
}
```
**Errors:**
- `409 Conflict` (Email already exists)
- `400 Bad Request` (Validation error - weak password)

---

### 3.2 Login
**Route:** `POST /auth/login`
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
*(Same payload as Register User)*

**Errors:**
- `401 Unauthorized` (Invalid credentials)

---

### 3.3 Refresh Token
**Route:** `POST /auth/refresh`
**Auth Required:** No

**Request Body:**
```json
{
  "refreshToken": "ey..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "ey...",
    "refreshToken": "ey..."
  }
}
```

**Errors:**
- `401 Unauthorized` (Invalid or expired refresh token)

---

## 4. Health Tracking APIs

### 4.1 Log Water
**Route:** `POST /water`
**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": 250, // in ml
  "logTime": "2026-07-30T10:00:00Z" // Optional, defaults to now
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "64xyz...",
    "amount": 250,
    "logTime": "2026-07-30T10:00:00Z"
  }
}
```

---

### 4.2 Get Daily Water Summary
**Route:** `GET /water/daily`
**Auth Required:** Yes
**Query Params:** `?date=2026-07-30`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-07-30",
    "totalAmount": 1500,
    "logs": [
      { "id": "64x...", "amount": 250, "logTime": "..." }
    ]
  }
}
```

---

### 4.3 Log Meal
**Route:** `POST /meals`
**Auth Required:** Yes

**Request Body:**
```json
{
  "mealType": "lunch",
  "mealDate": "2026-07-30T12:30:00Z",
  "totalCalories": 650,
  "totalProtein": 40,
  "totalCarbs": 50,
  "totalFat": 25,
  "notes": "Chicken salad"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "64def...",
    "mealType": "lunch",
    "totalCalories": 650
  }
}
```

---

## 5. SCALE & TRADE-OFFS

### How will this scale?
By rigidly defining contracts, we enable automated client generation (e.g., Orval or OpenAPI generators) creating heavily typed React Query hooks. 

### What are the trade-offs?
- **Strictness vs Speed:** Refactoring a route response requires updating the shared DTO, the backend route, the frontend type, and potentially the automated tests. This slows down rapid unstructured prototyping, but entirely eliminates "undefined is not an object" runtime errors.
