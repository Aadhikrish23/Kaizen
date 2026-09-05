# Database Schema Implementation Guide

**Document ID:** database_schema.md
**Version:** 1.0
**Status:** Approved
**Author:** Lead Software Architect
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
While `03_database_architecture.md` provides the high-level theoretical design, this document provides the exact implementation details required for developers. It bridges the gap between architecture and code by defining the Mongoose schemas, strict TypeScript types, and Zod validation constraints.

### WHO Uses It?
Backend engineers, AI coding agents, and database administrators implementing the data layer.

### WHEN Is It Used?
During the implementation of the backend API, when creating Mongoose models, and when writing database migration scripts.

---

## 2. Core Implementation Strategy

### Schema Definitions (Mongoose)
We use Mongoose as our ODM (Object Data Modeling) library in Node.js. 
- All schemas MUST have `timestamps: true` enabled by default to automatically manage `createdAt` and `updatedAt`.
- All `_id` fields are cast to `ObjectId`.
- We disable `__v` (versionKey) on responses unless explicitly required for optimistic concurrency control.

### Type Definitions (TypeScript)
Mongoose models must strictly mirror the interfaces defined in the `shared-types` package to ensure full end-to-end type safety between the database and the client.

### Validation (Zod)
While Mongoose provides schema validation at the database boundary, Zod schemas (defined in `shared-validation`) are used at the API boundary to catch bad data *before* it hits the database layer.

---

## 3. Schema Implementation Details (MVP Focus)

Below are the exact Mongoose schema definitions for the core MVP entities.

### 3.1. User Schema (`users`)

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '@kaizen/shared-types';

export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true 
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    firstName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    lastName: { 
      type: String, 
      trim: true 
    },
    profileImage: { 
      type: String 
    },
    gender: { 
      type: String, 
      enum: ['male', 'female', 'other', 'prefer_not_to_say'] 
    },
    dateOfBirth: { 
      type: Date 
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    accountStatus: { 
      type: String, 
      enum: ['active', 'suspended', 'deleted'], 
      default: 'active' 
    }
  },
  { 
    timestamps: true 
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ accountStatus: 1 });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
```

### 3.2. Refresh Token Schema (`refreshTokens`)

```typescript
const RefreshTokenSchema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    tokenHash: { 
      type: String, 
      required: true 
    },
    deviceInfo: { 
      type: String 
    },
    ipAddress: { 
      type: String 
    },
    userAgent: { 
      type: String 
    },
    expiresAt: { 
      type: Date, 
      required: true 
    },
    revokedAt: { 
      type: Date, 
      default: null 
    }
  },
  { 
    timestamps: true 
  }
);

// Indexes
RefreshTokenSchema.index({ userId: 1, revokedAt: 1 });
// TTL Index to automatically delete expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model('RefreshToken', RefreshTokenSchema);
```

### 3.3. Meal Schema (`meals`)

```typescript
const MealSchema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    mealType: { 
      type: String, 
      enum: ['breakfast', 'lunch', 'dinner', 'snack'], 
      required: true 
    },
    totalCalories: { 
      type: Number, 
      default: 0 
    },
    totalProtein: { 
      type: Number, 
      default: 0 
    },
    totalCarbs: { 
      type: Number, 
      default: 0 
    },
    totalFat: { 
      type: Number, 
      default: 0 
    },
    mealDate: { 
      type: Date, 
      required: true 
    },
    notes: { 
      type: String 
    }
  },
  { 
    timestamps: true 
  }
);

// Indexes
MealSchema.index({ userId: 1, mealDate: -1 });

export const MealModel = mongoose.model('Meal', MealSchema);
```

### 3.4. Water Log Schema (`waterLogs`)

```typescript
const WaterLogSchema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true,
      min: 1 // minimum amount in ml
    },
    logTime: { 
      type: Date, 
      required: true,
      default: Date.now
    }
  },
  { 
    timestamps: true 
  }
);

// Indexes
WaterLogSchema.index({ userId: 1, logTime: -1 });

export const WaterLogModel = mongoose.model('WaterLog', WaterLogSchema);
```

---

## 4. Migration Patterns

### Concept
MongoDB is schemaless at the database level, but Mongoose enforces schema at the application level. If we add a new required field, older documents will fail validation when retrieved and saved.

### Execution
- We use a lightweight migration script runner (e.g., `migrate-mongo`).
- Migrations are stored in `services/api/migrations/`.
- Migrations run automatically during the CI/CD deployment pipeline before the new backend code spins up.
- **NEVER** write a migration that locks an entire massive collection (e.g., updating 10 million rows in one transaction). Use batched updates or lazy data migrations on read.

---

## 5. SCALE & TRADE-OFFS

### How will this scale?
- **TTL Indexes:** Features like `refreshTokens` use TTL indexes (`expireAfterSeconds: 0`) to automatically purge expired tokens directly at the database level, preventing database bloat without background cron jobs.
- **Compound Indexes:** By indexing `(userId, date)`, queries fetching a user's weekly history will scan the absolute minimum number of documents.

### What are the trade-offs?
- **Denormalization vs Integrity:** We are storing `totalCalories` on the `meals` collection rather than calculating it on-the-fly by joining `mealEntries`. This makes reads incredibly fast, but requires that the application layer is highly disciplined about updating the `totalCalories` on the parent meal whenever a `mealEntry` is added, updated, or removed.
