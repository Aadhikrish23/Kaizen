import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const password = 'Password123!';

  test('User can register and get redirected to onboarding', async ({ page }) => {
    await page.goto('http://localhost:5173/register');
    
    // The form uses placeholder and label structure
    await page.fill('input[placeholder="John"]', 'Test');
    await page.fill('input[placeholder="Doe"]', 'User');
    await page.fill('input[placeholder="Enter your email"]', uniqueEmail);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to onboarding since it's a new user
    await expect(page).toHaveURL(/.*\/onboarding/);
  });

  test('Protected routes redirect to login if not authenticated', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
