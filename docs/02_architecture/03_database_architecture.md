Here is the complete regenerated `03_database_architecture.md` with the approved `refreshTokens` collection and production-ready authentication/session architecture included.

# Kaizen Database Architecture

**Document ID:** 03_database_architecture.md
**Version:** 1.1
**Status:** Approved for Phase 1 Development
**Author:** Principal Software Architecture Team
**Last Updated:** June 2026

---

# 1. Document Information

| Attribute         | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Document Title    | Database Architecture                                      |
| Version           | 1.0                                                        |
| Status            | Approved                                                   |
| Database Platform | MongoDB Atlas                                              |
| Database Model    | Document-Oriented                                          |
| Audience          | Architects, Developers, DevOps Engineers, AI Coding Agents |
| Scope             | Data Architecture and Collection Design                    |

---

# 2. Executive Summary

The Kaizen database architecture is built on MongoDB Atlas using a document-oriented model optimized for:

* Health tracking
* User analytics
* Goal management
* Time-series data
* AI-generated insights
* Reporting
* Multi-device authentication

The architecture prioritizes:

* Fast reads
* Efficient aggregations
* Flexible schemas
* Horizontal scalability
* Long-term maintainability

---

# 3. Database Design Principles

## User-Centric Design

Most collections are owned by a user and reference users through:

```text
userId
```

---

## Hybrid Normalization Strategy

### Normalized Collections

* users
* userSettings
* foodDatabase
* achievements
* challenges

---

### Denormalized Collections

* meals
* mealEntries
* reports
* userStats

This minimizes expensive lookups.

---

## Immutable Historical Data

Historical records should not be modified except for user corrections.

Examples:

* meals
* waterLogs
* weightLogs

---

## Auditability

All collections should include:

```text
createdAt
updatedAt
```

where applicable.

---

# 4. Collection Relationship Diagram

```text
users
 │
 ├── userSettings
 │
 ├── goals
 │
 ├── meals
 │      │
 │      └── mealEntries
 │
 ├── waterLogs
 │
 ├── weightLogs
 │
 ├── reports
 │
 ├── notifications
 │
 ├── userAchievements
 │
 ├── userStats
 │
 └── refreshTokens

foodDatabase
 │
 ├── mealEntries
 │
 └── recipeIngredients

recipes
 │
 └── recipeIngredients

achievements
 │
 └── userAchievements

challenges
 │
 └── userAchievements
```

---

# 5. Collection Specifications

# users

## Purpose

Stores user account and authentication information.

### Fields

| Field         | Type     |
| ------------- | -------- |
| _id           | ObjectId |
| email         | String   |
| passwordHash  | String   |
| firstName     | String   |
| lastName      | String   |
| profileImage  | String   |
| gender        | String   |
| dateOfBirth   | Date     |
| isVerified    | Boolean  |
| accountStatus | String   |
| createdAt     | Date     |
| updatedAt     | Date     |

### Required Fields

```text
email
passwordHash
firstName
accountStatus
```

### Indexes

```text
email (unique)
accountStatus
createdAt
```

---

# userSettings

## Purpose

Stores user preferences and application settings.

### Fields

| Field               | Type     |
| ------------------- | -------- |
| _id                 | ObjectId |
| userId              | ObjectId |
| dailyCalorieGoal    | Number   |
| dailyWaterGoal      | Number   |
| weightUnit          | String   |
| heightUnit          | String   |
| notificationEnabled | Boolean  |
| theme               | String   |
| createdAt           | Date     |
| updatedAt           | Date     |

### Indexes

```text
userId (unique)
```

---

# goals

## Purpose

Stores health goals.

### Fields

| Field        | Type     |
| ------------ | -------- |
| _id          | ObjectId |
| userId       | ObjectId |
| title        | String   |
| type         | String   |
| targetValue  | Number   |
| currentValue | Number   |
| startDate    | Date     |
| targetDate   | Date     |
| status       | String   |
| createdAt    | Date     |

### Indexes

```text
userId
status
type
```

---

# foodDatabase

## Purpose

Master nutrition database.

### Fields

| Field       | Type     |
| ----------- | -------- |
| _id         | ObjectId |
| foodName    | String   |
| servingSize | Number   |
| servingUnit | String   |
| calories    | Number   |
| protein     | Number   |
| carbs       | Number   |
| fat         | Number   |
| fiber       | Number   |

### Indexes

```text
foodName (text)
calories
```

---

# meals

## Purpose

Represents a meal event.

### Fields

| Field         | Type     |
| ------------- | -------- |
| _id           | ObjectId |
| userId        | ObjectId |
| mealType      | String   |
| totalCalories | Number   |
| totalProtein  | Number   |
| totalCarbs    | Number   |
| totalFat      | Number   |
| mealDate      | Date     |
| notes         | String   |
| createdAt     | Date     |

### Indexes

```text
userId
mealDate
(userId, mealDate)
```

---

# mealEntries

## Purpose

Individual food items inside meals.

### Fields

| Field    | Type     |
| -------- | -------- |
| _id      | ObjectId |
| mealId   | ObjectId |
| foodId   | ObjectId |
| quantity | Number   |
| calories | Number   |
| protein  | Number   |
| carbs    | Number   |
| fat      | Number   |

### Indexes

```text
mealId
foodId
```

---

# waterLogs

## Purpose

Tracks hydration.

### Fields

| Field     | Type     |
| --------- | -------- |
| _id       | ObjectId |
| userId    | ObjectId |
| amount    | Number   |
| logTime   | Date     |
| createdAt | Date     |

### Indexes

```text
(userId, logTime)
```

---

# weightLogs

## Purpose

Tracks weight history.

### Fields

| Field      | Type     |
| ---------- | -------- |
| _id        | ObjectId |
| userId     | ObjectId |
| weight     | Number   |
| recordedAt | Date     |
| notes      | String   |

### Indexes

```text
(userId, recordedAt)
```

---

# recipes

## Purpose

Stores reusable recipes.

### Fields

| Field         | Type     |
| ------------- | -------- |
| _id           | ObjectId |
| title         | String   |
| description   | String   |
| servings      | Number   |
| totalCalories | Number   |
| createdBy     | ObjectId |
| isPublic      | Boolean  |

### Indexes

```text
title
isPublic
```

---

# recipeIngredients

## Purpose

Recipe ingredient mappings.

### Fields

| Field    | Type     |
| -------- | -------- |
| _id      | ObjectId |
| recipeId | ObjectId |
| foodId   | ObjectId |
| quantity | Number   |

### Indexes

```text
recipeId
foodId
```

---

# achievements

## Purpose

Master achievement catalog.

### Fields

| Field       | Type     |
| ----------- | -------- |
| _id         | ObjectId |
| code        | String   |
| title       | String   |
| description | String   |
| icon        | String   |
| category    | String   |
| points      | Number   |

### Indexes

```text
code (unique)
category
```

---

# userAchievements

## Purpose

Achievement unlock records.

### Fields

| Field         | Type     |
| ------------- | -------- |
| _id           | ObjectId |
| userId        | ObjectId |
| achievementId | ObjectId |
| earnedAt      | Date     |

### Indexes

```text
(userId, achievementId)
```

---

# challenges

## Purpose

Stores challenge definitions.

### Fields

| Field        | Type     |
| ------------ | -------- |
| _id          | ObjectId |
| title        | String   |
| description  | String   |
| startDate    | Date     |
| endDate      | Date     |
| rewardPoints | Number   |

### Indexes

```text
startDate
endDate
```

---

# reports

## Purpose

Generated report snapshots.

### Fields

| Field       | Type     |
| ----------- | -------- |
| _id         | ObjectId |
| userId      | ObjectId |
| reportType  | String   |
| periodStart | Date     |
| periodEnd   | Date     |
| reportData  | Object   |
| generatedAt | Date     |

### Indexes

```text
(userId, generatedAt)
reportType
```

---

# notifications

## Purpose

Stores user notifications.

### Fields

| Field            | Type     |
| ---------------- | -------- |
| _id              | ObjectId |
| userId           | ObjectId |
| title            | String   |
| message          | String   |
| notificationType | String   |
| isRead           | Boolean  |
| createdAt        | Date     |

### Indexes

```text
(userId, isRead)
```

---

# userStats

## Purpose

Stores aggregated statistics.

### Fields

| Field                | Type     |
| -------------------- | -------- |
| _id                  | ObjectId |
| userId               | ObjectId |
| totalMeals           | Number   |
| totalWaterConsumed   | Number   |
| currentStreak        | Number   |
| longestStreak        | Number   |
| achievementsUnlocked | Number   |
| lastCalculatedAt     | Date     |

### Indexes

```text
userId (unique)
```

---

# refreshTokens

## Purpose

Stores hashed refresh tokens for secure session management.

Supports:

* Multi-device login
* Token rotation
* Session tracking
* Device logout
* Logout all devices

---

## Fields

| Field      | Type        |
| ---------- | ----------- |
| _id        | ObjectId    |
| userId     | ObjectId    |
| tokenHash  | String      |
| deviceInfo | String      |
| ipAddress  | String      |
| userAgent  | String      |
| expiresAt  | Date        |
| createdAt  | Date        |
| revokedAt  | Date | Null |

---

## Required Fields

```text
userId
tokenHash
expiresAt
createdAt
```

---

## Validation Rules

| Field     | Rule               |
| --------- | ------------------ |
| userId    | Valid ObjectId     |
| tokenHash | Hash only          |
| expiresAt | Future Date        |
| ipAddress | Valid IP           |
| userAgent | Max 512 Characters |
| revokedAt | Nullable           |

---

## Relationships

```text
users (1)
   |
   └── refreshTokens (N)
```

---

## Index Strategy

### Standard Indexes

```text
userId
expiresAt
revokedAt
```

### Compound Index

```text
(userId, revokedAt)
```

### TTL Index

```text
expiresAt
```

Expired tokens are automatically removed.

---

## Example Document

```json
{
  "_id": "65abc123",
  "userId": "64user123",
  "tokenHash": "7f2a8e0f...",
  "deviceInfo": "Chrome Windows",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0",
  "expiresAt": "2026-07-01T00:00:00Z",
  "createdAt": "2026-06-01T00:00:00Z",
  "revokedAt": null
}
```

---

## Security Considerations

### Never Store Raw Tokens

```text
Refresh Token
      |
      v

Hash
      |
      v

Database
```

---

### Device Tracking

Each session stores:

* Device
* Browser
* IP Address

---

## Refresh Token Rotation

```text
Refresh Request
       |
       v

Validate Token
       |
       v

Revoke Existing Token
       |
       v

Issue New Token
       |
       v

Store New Hash
```

---

## Logout Flow

### Single Device

```text
Current Refresh Token
          |
          v

Set revokedAt
          |
          v

Session Invalidated
```

---

### Logout All Devices

```text
User
 |
 v

Find All User Tokens
 |
 v

Set revokedAt
 |
 v

All Sessions Revoked
```

---

# 6. Global Indexing Strategy

## High-Traffic Collections

Compound indexes optimized for:

```text
Meals
Water Logs
Weight Logs
Reports
Notifications
Refresh Tokens
```

---

## Text Search

```text
foodDatabase.foodName
recipes.title
```

---

# 7. Query Optimization Strategy

## Dashboard Queries

Use:

```text
userStats
```

instead of expensive aggregations.

---

## Reporting

Store report snapshots.

Avoid regenerating reports unnecessarily.

---

## Nutrition Queries

Use indexed date-based lookups.

---

# 8. Aggregation Strategy

## Daily

* Calories
* Water
* Meal counts

---

## Weekly

* Goal progress
* Weight trends

---

## Monthly

* Nutrition summaries
* AI reports
* Achievement summaries

---

## Materialized Collections

```text
userStats
reports
```

---

# 9. Data Retention Strategy

## Permanent Collections

```text
users
goals
meals
mealEntries
waterLogs
weightLogs
userAchievements
```

---

## TTL Collections

```text
refreshTokens
```

removed automatically after expiration.

---

## Report Retention

Minimum:

```text
24 Months
```

---

# 10. Backup Strategy

## Atlas Backups

Frequency:

```text
Daily
```

Retention:

```text
35 Days
```

---

## Recovery Targets

| Metric | Target       |
| ------ | ------------ |
| RPO    | < 15 Minutes |
| RTO    | < 1 Hour     |

---

# 11. Future Scaling Considerations

## Phase 1

```text
10,000 Active Users
```

Single Atlas cluster.

---

## Phase 2

```text
Read Replicas
```

for analytics.

---

## Phase 3

```text
Sharding by userId
```

for large-scale growth.

---

## Phase 4

```text
MongoDB
     +
Analytics Warehouse
```

for advanced reporting.

---

# 12. Database Governance Rules

## Developers Must

* Use indexes appropriately
* Use ObjectId references
* Validate data at API layer
* Store hashes instead of secrets

---

## Developers Must Not

* Store plaintext passwords
* Store raw refresh tokens
* Duplicate user profile data
* Create unindexed high-volume queries

---

# 13. Conclusion

The Kaizen database architecture provides a scalable, secure, and analytics-friendly foundation optimized for health tracking workloads. The addition of the refreshTokens collection introduces production-grade session management, refresh token rotation, multi-device authentication, and secure logout capabilities while preserving performance, maintainability, and future scalability.
