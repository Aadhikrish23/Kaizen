import { test, expect, Page } from '@playwright/test';

const password = 'Password123!';

const registerFromLogin = async (page: Page, first: string, email: string) => {
  // Client-side navigation only (no page reload): the in-memory query cache survives a reload-free user switch
  await page.getByRole('link', { name: 'Register' }).click();
  await page.fill('input[placeholder="John"]', first);
  await page.fill('input[placeholder="Doe"]', 'Switch');
  await page.fill('input[placeholder="Enter your email"]', email);
  await page.fill('input[placeholder="Create a password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
  await page.locator('button:has-text("Skip for now")').first().click();
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
};

test.describe('User switch in the same tab', () => {
  test('user B does not see user A cached data after A logs out and B registers without a reload', async ({ page }) => {
    test.setTimeout(120000);
    const stamp = Date.now();

    // User A registers and logs a weigh-in of 71.3 kg
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Alice');
    await page.fill('input[placeholder="Doe"]', 'Switch');
    await page.fill('input[placeholder="Enter your email"]', `switch_a_${stamp}@kaizen.com`);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    await page.locator('button:has-text("Weigh-In")').first().click();
    await expect(page.getByRole('heading', { name: 'Quick Weigh-In' })).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="number"][step="0.1"]').first().fill('71.3');
    await page.locator('button[type="submit"]:has-text("Save Weigh-In")').click();
    await expect(page.getByRole('heading', { name: 'Quick Weigh-In' })).not.toBeVisible();
    await expect(page.locator('text=71.3').first()).toBeVisible({ timeout: 10000 });

    // A logs out (client-side) and lands on the login page without a reload
    await page.locator('aside button[title="Logout"]').click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });

    // B registers in the same tab; A's weigh-in must not appear anywhere on B's dashboard
    await registerFromLogin(page, 'Bob', `switch_b_${stamp}@kaizen.com`);
    await expect(page.locator('text=Sleep & Circadian')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Scale Weight').first()).toBeVisible();
    await expect(page.locator('text=71.3')).toHaveCount(0);
    await expect(page.locator('text=Alice')).toHaveCount(0);
  });
});
