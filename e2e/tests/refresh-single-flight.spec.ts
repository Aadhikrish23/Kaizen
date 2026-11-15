import { test, expect } from '@playwright/test';

const password = 'Password123!';

test.describe('Access token expiry with many parallel requests', () => {
  test('one shared refresh, the user stays signed in and the data renders', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Sam');
    await page.fill('input[placeholder="Doe"]', 'Refresh');
    await page.fill('input[placeholder="Enter your email"]', `refresh_${Date.now()}@kaizen.com`);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Sleep & Circadian')).toBeVisible({ timeout: 15000 });

    // Count refresh calls and the 401s that triggered them
    const refreshCalls: string[] = [];
    const unauthorized: string[] = [];
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/auth/refresh')) refreshCalls.push(r.url()); });
    page.on('response', (r) => {
      if (r.status() === 401 && r.url().includes('/api/v1/') && !r.url().includes('/auth/refresh')) unauthorized.push(r.url());
    });

    // The access token "expires": it is no longer valid, and the next navigation fires many API requests in parallel
    await page.evaluate(() => localStorage.setItem('kaizen_access_token', 'expired-token'));
    await page.locator('button[title="Previous Day"]').click();

    await expect.poll(() => unauthorized.length, { timeout: 15000 }).toBeGreaterThanOrEqual(2); // really parallel 401s
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('kaizen_access_token')), { timeout: 15000 })
      .not.toBe('expired-token');
    await page.waitForTimeout(2000); // let every retry settle

    expect(refreshCalls).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('kaizen_access_token'))).toBeTruthy();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('text=Sleep & Circadian')).toBeVisible();
    await expect(page.locator('text=Scale Weight').first()).toBeVisible();
    await expect(page.locator('button[title="Previous Day"]')).toBeVisible(); // still the signed-in layout
  });
});
