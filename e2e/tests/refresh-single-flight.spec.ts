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

    // The access token "expires". Requests that carry it are held for 1.5 s before they reach the server, so the requests fired by
    // the quick tab switches below are all in flight together and get their 401 at (almost) the same moment: a real burst.
    await page.route('**/api/v1/**', async (route) => {
      const req = route.request();
      if (req.method() !== 'OPTIONS' && !req.url().includes('/auth/') && req.headers()['authorization'] === 'Bearer expired-token') {
        await new Promise((r) => setTimeout(r, 1500));
      }
      await route.continue();
    });
    await page.evaluate(() => localStorage.setItem('kaizen_access_token', 'expired-token'));
    const sidebar = page.locator('aside');
    for (const tab of ['Nutrition', 'Hydration', 'Sleep Cycle', 'Scale Weight']) {
      await sidebar.getByRole('button', { name: tab }).click();
    }

    await expect.poll(() => unauthorized.length, { timeout: 20000 }).toBeGreaterThanOrEqual(3); // really parallel 401s
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('kaizen_access_token')), { timeout: 20000 })
      .not.toBe('expired-token');
    await page.waitForTimeout(2500); // let every retry settle

    expect(refreshCalls).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('kaizen_access_token'))).toBeTruthy();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(sidebar).toBeVisible(); // still the signed-in layout
    await sidebar.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.locator('text=Sleep & Circadian')).toBeVisible({ timeout: 15000 }); // data renders with the new token
    await expect(page.locator('text=Scale Weight').first()).toBeVisible();
  });
});
