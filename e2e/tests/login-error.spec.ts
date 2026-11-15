import { test, expect } from '@playwright/test';

const password = 'Password123!';

test.describe('Login errors', () => {
  test('a wrong password shows the real server message and neither refreshes the session nor signs anyone out', async ({ page }) => {
    test.setTimeout(120000);
    const email = `login_err_${Date.now()}@kaizen.com`;

    // Create the account, then log out so we are on the login page
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Eve');
    await page.fill('input[placeholder="Doe"]', 'Login');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await page.locator('aside button[title="Logout"]').click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });

    // A sentinel token: the old refresh-failure path removed the token and signed the UI out; the fix must leave it alone
    await page.evaluate(() => localStorage.setItem('kaizen_access_token', 'sentinel-token'));
    const refreshCalls: string[] = [];
    const loginResponses: number[] = [];
    page.on('request', (r) => { if (r.url().includes('/auth/refresh')) refreshCalls.push(r.url()); });
    page.on('response', (r) => { if (r.url().includes('/auth/login')) loginResponses.push(r.status()); });

    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[type="password"]', 'definitely-the-wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/.*\/login/);
    await page.waitForTimeout(1000); // a refresh loop or sign-out would show up by now
    expect(refreshCalls).toEqual([]);
    expect(loginResponses).toEqual([401]); // exactly one login attempt, no retry
    expect(await page.evaluate(() => localStorage.getItem('kaizen_access_token'))).toBe('sentinel-token');

    // The correct password still works afterwards
    await page.evaluate(() => localStorage.removeItem('kaizen_access_token'));
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/(dashboard|onboarding)/, { timeout: 15000 });
  });
});
