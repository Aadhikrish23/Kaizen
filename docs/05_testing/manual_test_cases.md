# Manual Test Cases

**Document ID:** manual_test_cases.md
**Version:** 1.0
**Status:** Approved
**Author:** QA Team
**Last Updated:** July 2026

---

## 1. Executive Summary

### WHY Does This Document Exist?
Automated tests cannot catch everything. This document outlines the exact scenarios that must be verified by a human before a release is certified. It focuses on UX, animations, platform-specific quirks, and complex edge cases that are difficult to automate.

### WHO Uses It?
QA Engineers, Product Managers, and Developers conducting exploratory or pre-release testing.

### WHEN Is It Used?
During the final QA phase of a sprint, immediately before production deployment.

---

## 2. Core Functional Tests

### 2.1 User Onboarding
**Scenario:** A new user signs up and navigates the platform for the first time.
**Steps:**
1. Navigate to `/register`.
2. Enter valid credentials.
3. Verify the onboarding wizard appears.
4. Complete the wizard (set goals, height, weight).
5. **Expected Result:** User is redirected to `/dashboard`. The dashboard should display 0 calories consumed and prompt the user to log their first meal.

### 2.2 Offline Resilience (Mobile/PWA)
**Scenario:** A user loses internet connection while attempting to log a meal.
**Steps:**
1. Login to the application.
2. Turn off WiFi / Cellular data.
3. Attempt to log a meal.
4. **Expected Result:** The UI should gracefully display an offline warning indicator. The app should NOT crash. (Bonus: Optimistic UI updates if local-first architecture is implemented).

### 2.3 AI Coach Error Handling
**Scenario:** The OpenAI API is completely down or timing out.
**Steps:**
1. Login and navigate to the AI Coach chat.
2. In the backend, temporarily block outbound requests to `api.openai.com` (or simulate a 500 error in the FastAPI service).
3. Send a message to the coach.
4. **Expected Result:** The UI should display a polite "The coach is currently unavailable, please try again later" message after a reasonable timeout (e.g., 5 seconds). It should NOT hang indefinitely or display a raw JSON error stack trace.

---

## 3. UX and Visual Tests

### 3.1 Responsive Design Check
**Scenario:** Verify the web application works across device sizes.
**Steps:**
1. Open the dashboard.
2. Resize the browser window from 1920px (Desktop) down to 320px (Mobile).
3. **Expected Result:** Navigation should collapse into a hamburger menu. Graphs should scale down gracefully without overflowing the viewport.

### 3.2 Animation Fluidity
**Scenario:** Verify micro-interactions feel premium.
**Steps:**
1. Click the "Add Water" button multiple times rapidly.
2. **Expected Result:** The water level animation should smoothly transition upwards without jittering or frame drops. Button states (loading/disabled) should prevent duplicate network requests.

---

## 4. Security Tests

### 4.1 Token Expiration Handing
**Scenario:** The user's access token expires while they are using the app.
**Steps:**
1. Login to the application.
2. Manually edit the JWT access token in LocalStorage/Cookies to an expired string.
3. Attempt to navigate to a protected route (e.g., `/settings`).
4. **Expected Result:** The application should seamlessly use the refresh token to get a new access token in the background. The user should not be forced to log in again, and the navigation should succeed.
