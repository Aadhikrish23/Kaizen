# Frontend Implementation Specifications

**Document ID:** frontend_implementation_specs.md
**Version:** 1.0
**Status:** Approved for Implementation
**Author:** Principal Software Architecture Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
The high-level `05_frontend_architecture.md` states we use React, Vite, and Tailwind. This document provides the *exact implementation details* required to actually build the UI, completely eliminating decision fatigue for frontend engineers regarding state, routing, and component design.

### WHO Uses It?
Frontend Engineers and AI coding agents building the Web and Mobile clients.

### WHEN Is It Used?
Throughout the entire development lifecycle, specifically heavily referenced during Sprint 1 (Scaffold) and Sprint 2 (UI Implementation).

---

## 2. State Management Architecture

We strictly separate Server State from Local UI State to prevent massive, unmaintainable global stores.

### 2.1 Server State (React Query)
- **Tool:** `@tanstack/react-query`
- **Responsibility:** Fetching, caching, synchronizing, and updating data from the Express API.
- **Rules:**
  - DO NOT store API responses in Zustand or `useState`.
  - Stale Time default: `5 minutes` (prevents over-fetching).
  - Cache Time default: `30 minutes`.
  - Mutations must invalidate relevant query keys immediately upon success.
- **Example Key Structure:**
  - `['user', 'profile']`
  - `['meals', 'daily', '2026-07-30']`

### 2.2 Local UI State (Zustand)
- **Tool:** `zustand`
- **Responsibility:** Ephemeral UI state that doesn't persist to the database (e.g., Theme toggles, Sidebar open/closed, multi-step wizard state before submission).
- **Rules:**
  - Keep stores small and modular (e.g., `useSidebarStore`, `useThemeStore`).
  - DO NOT use Zustand for forms (use `react-hook-form`).

---

## 3. Component Hierarchy (Atomic Design)

Components must be organized following a modified Atomic Design pattern inside `apps/web/src/components/`.

### 3.1 Hierarchy Levels
1. **Elements (Atoms):** `/elements` - Highly reusable primitives (e.g., `Button.tsx`, `Input.tsx`, `Card.tsx`). Must have no business logic and rely solely on props.
2. **Widgets (Molecules/Organisms):** `/widgets` - Combinations of elements forming a distinct UI piece (e.g., `MealEntryForm.tsx`, `WaterProgressTracker.tsx`). Can contain local state and form logic.
3. **Layouts:** `/layouts` - Structural containers (e.g., `DashboardLayout.tsx`, `AuthLayout.tsx`).
4. **Views (Pages):** `/views` - Route-level components that compose layouts and widgets. This is where React Query hooks are executed and data is passed down.

### 3.2 Main Dashboard Component Tree Example
```text
DashboardView
├── DashboardLayout
│   ├── Sidebar
│   │   ├── NavigationLinks
│   │   └── UserProfileSnippet
│   └── Topbar
│       └── NotificationBell
├── DailySummaryWidget
│   ├── CalorieRingProgress (Element)
│   └── MacroBarCharts (Element)
└── TrackingGrid
    ├── WaterTrackingWidget
    │   └── IncrementButton
    └── RecentMealsWidget
        └── MealCard (Element)
```

---

## 4. Navigation & Routing Flow

Routing is handled by `react-router-dom` (Web) and `react-navigation` (Mobile).

### 4.1 Route Map (Web)
*   **Public Routes:**
    *   `/` -> Landing Page
    *   `/login` -> LoginView
    *   `/register` -> RegisterView
*   **Protected Routes (Requires valid JWT in memory):**
    *   `/dashboard` -> DashboardView (Main tracking hub)
    *   `/meals` -> MealHistoryView
    *   `/coach` -> AICoachChatView
    *   `/settings` -> UserSettingsView

### 4.2 Route Guards
A higher-order component (`<ProtectedRoute>`) wraps all protected routes. It checks the React Query cache for the user session. If null or 401, it redirects to `/login` and clears any stale local state.

---

## 5. UI Specifications & Design Tokens

Tailwind CSS is used exclusively. No custom `.css` files are permitted outside of the root `index.css` setup.

### 5.1 Color Palette (Tailwind `tailwind.config.js`)
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#f0fdf4', // Light background accents
        500: '#22c55e', // Main brand color (Kaizen Green)
        900: '#14532d', // Dark text accents
      },
      surface: {
        light: '#ffffff', // Card backgrounds in light mode
        dark: '#1e293b', // Card backgrounds in dark mode
      },
      danger: '#ef4444', // Errors / Destructive actions
    }
  }
}
```

### 5.2 Typography
- **Font Family:** 'Inter', sans-serif (Optimized for data-dense dashboards).
- **Headings:** Bold (700), tight tracking.
- **Body:** Regular (400), relaxed line height.

### 5.3 Micro-Interactions (Aesthetics)
Kaizen must feel premium and responsive.
- **Hover States:** All interactive elements must have a subtle background or opacity shift (`hover:bg-primary-500/90`).
- **Transitions:** Use `transition-all duration-200 ease-in-out` on buttons and cards.
- **Feedback:** Use Toast notifications (via `react-hot-toast`) for success/error feedback on every mutation.
