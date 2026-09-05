import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const uniqueEmail = \	estuser_\@example.com\;
  const password = 'Password123!';

  test('User can register and get redirected to dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/register');
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('http://localhost:5173/dashboard');
    // We should see some tracking UI
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('User can logout and login again', async ({ page }) => {
    // 1. Go to login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // 2. Expect Dashboard
    await expect(page).toHaveURL('http://localhost:5173/dashboard');

    // 3. Logout
    await page.click('button:has-text("Logout")'); // Assuming we have a logout button

    // 4. Expect to be redirected to login
    await expect(page).toHaveURL('http://localhost:5173/login');
  });

  test('Protected routes redirect to login if not authenticated', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await expect(page).toHaveURL('http://localhost:5173/login');
  });
});
