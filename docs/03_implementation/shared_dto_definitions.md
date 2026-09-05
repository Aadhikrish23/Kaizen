# Shared DTO & Type Definitions

**Document ID:** shared_dto_definitions.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
This document defines the exact TypeScript interfaces and Zod schemas that will live inside the `packages/shared-types` and `packages/shared-validation` workspaces in the monorepo. It removes ambiguity for both Frontend and Backend engineers regarding the exact shape of data crossing the network.

### WHO Uses It?
Frontend Engineers mapping API responses, Backend Engineers strongly typing request bodies, and AI coding agents scaffolding the shared packages.

### WHEN Is It Used?
During Sprint 1 and Sprint 2 when scaffolding the foundational types and Tracking APIs.

---

## 2. Core Domain Models (Interfaces)

These interfaces represent the pure shape of our domain entities, stripped of database-specific wrapper fields (like Mongoose's `__v`).

### 2.1 User
```typescript
export interface IUser {
  id: string; // Mapped from MongoDB _id
  email: string;
  firstName: string;
  lastName?: string;
  profileImage?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string; // ISO 8601 Date string (YYYY-MM-DD)
  isVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'deleted';
  createdAt: string; // ISO 8601 Datetime
  updatedAt: string; // ISO 8601 Datetime
}
```

### 2.2 Meal
```typescript
export interface IMeal {
  id: string;
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  totalCalories: number;
  totalProtein: number; // in grams
  totalCarbs: number; // in grams
  totalFat: number; // in grams
  mealDate: string; // ISO 8601 Datetime
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 WaterLog
```typescript
export interface IWaterLog {
  id: string;
  userId: string;
  amount: number; // in ml
  logTime: string; // ISO 8601 Datetime
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 AI Insight
```typescript
export interface IAIInsight {
  id: string;
  userId: string;
  targetDate: string; // ISO 8601 Date (YYYY-MM-DD)
  summaryText: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  actionableTip: string;
  createdAt: string;
}
```

---

## 3. Request / Response DTOs (Data Transfer Objects)

These define the exact shape of payloads sent over the wire.

### 3.1 Authentication
```typescript
// Request: POST /api/v1/auth/register
export interface RegisterRequestDTO {
  email: string;
  passwordRaw: string;
  firstName: string;
  lastName?: string;
}

// Request: POST /api/v1/auth/login
export interface LoginRequestDTO {
  email: string;
  passwordRaw: string;
}

// Response: Authentication Success
export interface AuthResponseDTO {
  success: boolean;
  data: {
    user: Pick<IUser, 'id' | 'email' | 'firstName' | 'profileImage'>;
    tokens: {
      accessToken: string;
      refreshToken: string;
    }
  }
}
```

### 3.2 Tracking (Meals)
```typescript
// Request: POST /api/v1/meals
export type CreateMealRequestDTO = Pick<IMeal, 'mealType' | 'totalCalories' | 'totalProtein' | 'totalCarbs' | 'totalFat' | 'mealDate' | 'notes'>;

// Response: GET /api/v1/meals?date=YYYY-MM-DD
export interface GetMealsResponseDTO {
  success: boolean;
  data: {
    date: string;
    totalDailyCalories: number;
    meals: IMeal[];
  }
}
```

---

## 4. Zod Validation Schemas

These schemas ensure runtime type safety at the API boundary (Backend middleware) and form validation (Frontend).

```typescript
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  passwordRaw: z.string().min(8, 'Password must be at least 8 characters long.'),
  firstName: z.string().min(2, 'First name is required.'),
  lastName: z.string().optional(),
});

export const CreateMealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  totalCalories: z.number().int().min(1, 'Calories must be greater than 0.'),
  totalProtein: z.number().int().min(0).default(0),
  totalCarbs: z.number().int().min(0).default(0),
  totalFat: z.number().int().min(0).default(0),
  mealDate: z.string().datetime(), // Enforces ISO 8601
  notes: z.string().max(500).optional(),
});

export const CreateWaterLogSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be greater than 0 ml.'),
  logTime: z.string().datetime().optional(), // Defaults to Date.now() on backend if omitted
});
```
