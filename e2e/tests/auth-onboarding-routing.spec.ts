import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Auth and Onboarding Routing Verification', () => {
  const timestamp = Date.now();
  const email = `onboarding_test_${timestamp}@kaizen.com`;
  const password = 'Password123!';
  const fullName = 'Marcus Aurelius';

  test('New user gets pre-filled name, can complete onboarding or skip, and existing user logging in goes directly to dashboard without onboarding', async ({ page }) => {
    test.setTimeout(120000);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register fresh user
    console.log('[1/4] Registering fresh user...');
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Marcus');
    await page.fill('input[placeholder="Doe"]', 'Aurelius');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    // 2. Verify redirect to onboarding & pre-filled name
    console.log('[2/4] Verifying onboarding display & name pre-fill...');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    
    // Check name input is pre-filled with "Marcus Aurelius"
    const nameInput = page.locator('input[placeholder="Your name"]');
    await expect(nameInput).toHaveValue(fullName);
    console.log('✓ Name input correctly pre-filled with user registration name!');

    // Check "Skip for now" link is visible
    const skipBtn = page.locator('button:has-text("Skip for now")');
    await expect(skipBtn).toBeVisible();

    // Complete onboarding properly
    await page.fill('input[type="date"]', '1990-05-15');
    await page.getByRole('button', { name: 'male', exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.fill('input[placeholder="e.g. 175"]', '180');
    await page.fill('input[placeholder="e.g. 75.5"]', '76.0');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByText('Maintain Weight', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByText('Moderately Active', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Complete Setup' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    console.log('✓ Onboarding completed successfully.');

    // 3. Logout
    console.log('[3/4] Logging out...');
    await page.locator('button[title="Logout"]').first().click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });

    // 4. Log in again as this existing onboarded user
    console.log('[4/4] Logging in as existing user...');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Enter your password"]', password);
    await page.click('button[type="submit"]');

    // VERIFICATION: Must navigate DIRECTLY to /dashboard and NOT show onboarding!
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Set up your profile' })).not.toBeVisible();
    console.log('✓ SUCCESS: Existing user immediately redirected to /dashboard without onboarding prompt!');

    // Even if user attempts to navigate directly to /onboarding in browser URL:
    await page.goto('http://localhost:5173/onboarding');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    console.log('✓ SUCCESS: Directly visiting /onboarding safely redirects onboarded user to /dashboard!');

    // Wait for Dashboard UI to fully mount
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Capture visual proof of dashboard after logging in
    const screenshotPath = path.join(screenshotsDir, '20_login_direct_to_dashboard.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(screenshotPath, path.join(artifactDir, '20_login_direct_to_dashboard.png'));
    }
  });

  test('New user clicking "Skip for now" transitions immediately to dashboard and persists onboarded state', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';
    const skipEmail = `skip_tester_${Date.now()}@kaizen.com`;

    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Lucius');
    await page.fill('input[placeholder="Doe"]', 'Seneca');
    await page.fill('input[placeholder="Enter your email"]', skipEmail);
    await page.fill('input[placeholder="Create a password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    const skipBtn = page.locator('button:has-text("Skip for now")');
    await expect(skipBtn).toBeVisible();

    const screenshotSkipPath = path.join(screenshotsDir, '21_onboarding_with_skip_button.png');
    await page.screenshot({ path: screenshotSkipPath, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(screenshotSkipPath, path.join(artifactDir, '21_onboarding_with_skip_button.png'));
    }

    await skipBtn.click();

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    console.log('✓ Successfully skipped onboarding directly into dashboard!');

    // Log out and log back in
    await page.locator('button[title="Logout"]').first().click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });

    await page.fill('input[placeholder="Enter your email"]', skipEmail);
    await page.fill('input[placeholder="Enter your password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    console.log('✓ Re-login after skipping also bypasses onboarding!');
  });
});
