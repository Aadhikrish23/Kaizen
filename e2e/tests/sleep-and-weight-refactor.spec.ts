import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Sleep Cycle Tracker & Scale Weight UI Restructuring', () => {
  const timestamp = Date.now();
  const email = `sleep_test_${timestamp}@kaizen.com`;
  const password = 'Password123!';

  test('Sidebar has Sleep Cycle and removes Scale Weight, Quick Weigh-In works, and Sleep Tracker logs ultradian cycles', async ({ page }) => {
    test.setTimeout(120000);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register and navigate to dashboard
    console.log('[1/6] Registering fresh user...');
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Aadhi');
    await page.fill('input[placeholder="Doe"]', 'Krish');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 2. Verify Sidebar Navigation
    console.log('[2/6] Verifying sidebar navigation structure...');
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('button', { name: 'Sleep Cycle' })).toBeVisible({ timeout: 10000 });
    
    // Ensure "Scale Weight" is NOT in the sidebar navigation
    const scaleWeightInSidebar = sidebar.locator('button:has-text("Scale Weight")');
    expect(await scaleWeightInSidebar.count()).toBe(0);

    // 3. Test Sleep Cycle Tracker Module
    console.log('[3/6] Navigating to Sleep Cycle tracker...');
    await sidebar.getByRole('button', { name: 'Sleep Cycle' }).click();
    await page.waitForTimeout(600);

    // Verify Sleep Tracker view headers & components
    await expect(page.locator('text=Log Sleep Session')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Ultradian Sleep Cycle Architecture')).toBeVisible();
    await expect(page.locator('text=Circadian Bedtime Planner')).toBeVisible();

    // Fill in sleep session (22:30 to 06:30 = 8h 00m)
    console.log('[3/6] Logging sleep session: 22:30 -> 06:30, 5 stars quality...');
    const bedtimeInput = page.locator('input[type="time"]').nth(0);
    const wakeTimeInput = page.locator('input[type="time"]').nth(1);

    await bedtimeInput.fill('22:30');
    await wakeTimeInput.fill('06:30');

    // Click 5 stars
    await page.locator('button:has-text("5 ★")').click();

    // Notes
    await page.fill('#sleep-notes', 'Melatonin 3mg, 67F cool room, 0 caffeine');

    // Save
    await page.locator('button[type="submit"]:has-text("Save Sleep Log")').click();
    await page.waitForTimeout(1000);

    // Verify logged indicators
    await expect(page.locator('text=8h 0m').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=5.3').first()).toBeVisible();

    // Test Circadian Bedtime Planner
    const circadianWakeInput = page.locator('input[type="time"]').nth(2);
    await circadianWakeInput.fill('06:00');
    await page.waitForTimeout(600);
    await expect(page.locator('text=Optimal Window')).toBeVisible();

    // Take screenshot 23_sleep_cycle_tracker
    const sleepShot = path.join(screenshotsDir, '23_sleep_cycle_tracker.png');
    await page.screenshot({ path: sleepShot, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(sleepShot, path.join(artifactDir, '23_sleep_cycle_tracker.png'));
    }
    console.log('Saved 23_sleep_cycle_tracker.png');

    // 4. Return to Dashboard and Verify Pillars
    console.log('[4/6] Navigating back to Dashboard overview...');
    await sidebar.getByRole('button', { name: 'Dashboard' }).click();
    await page.waitForTimeout(600);

    // Verify Sleep & Circadian card shows duration
    await expect(page.locator('text=Sleep & Circadian')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=8h 0m').first()).toBeVisible();

    // Verify Scale Weight tile exists on dashboard
    await expect(page.locator('text=Scale Weight')).toBeVisible();

    const dashShot = path.join(screenshotsDir, '24_dashboard_sleep_and_weight_tiles.png');
    await page.screenshot({ path: dashShot, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(dashShot, path.join(artifactDir, '24_dashboard_sleep_and_weight_tiles.png'));
    }
    console.log('Saved 24_dashboard_sleep_and_weight_tiles.png');

    // 5. Test Quick Weigh-In Modal from Dashboard
    console.log('[5/6] Opening Quick Weigh-In modal from Dashboard tile...');
    await page.locator('button:has-text("Weigh-In")').first().click();
    await page.waitForTimeout(500);

    // Verify modal is open
    await expect(page.getByRole('heading', { name: 'Quick Weigh-In' })).toBeVisible({ timeout: 10000 });

    // Set weight to 74.5 kg
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();
    await weightInput.fill('74.5');

    // Nudge with +0.1 button
    await page.locator('button:has-text("+0.1")').click();
    await expect(weightInput).toHaveValue('74.6');

    // Reset back to 74.5
    await page.locator('button:has-text("-0.1")').click();
    await expect(weightInput).toHaveValue('74.5');

    await page.fill('#weigh-in-notes', 'Fasted morning weigh-in');

    const modalShot = path.join(screenshotsDir, '25_quick_weigh_in_modal.png');
    await page.screenshot({ path: modalShot });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(modalShot, path.join(artifactDir, '25_quick_weigh_in_modal.png'));
    }
    console.log('Saved 25_quick_weigh_in_modal.png');

    // Submit modal
    await page.locator('button[type="submit"]:has-text("Save Weigh-In")').click();
    await page.waitForTimeout(1500);

    // Verify modal closed and dashboard shows 74.5 kg
    await expect(page.getByRole('heading', { name: 'Quick Weigh-In' })).not.toBeVisible();
    await expect(page.locator('text=74.5').first()).toBeVisible({ timeout: 10000 });

    // 6. Test Profile Settings Body Composition section
    console.log('[6/6] Navigating to Profile Settings...');
    await sidebar.locator('a[href="/settings/profile"]').click();
    await page.waitForTimeout(800);

    await expect(page.locator('text=Body Composition & Scale Weight')).toBeVisible({ timeout: 10000 });
    
    // Fill in Height, Current Weight, & Target Weight to trigger live BMI calculation
    await page.fill('input[placeholder="175"]', '178');
    await page.fill('input[placeholder="75.5"]', '74.5');
    await page.fill('input[placeholder="70.0"]', '70.0');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Computed Body Mass Index (BMI)')).toBeVisible({ timeout: 5000 });

    const profileShot = path.join(screenshotsDir, '26_profile_settings_body_composition.png');
    await page.screenshot({ path: profileShot, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(profileShot, path.join(artifactDir, '26_profile_settings_body_composition.png'));
    }
    console.log('Saved 26_profile_settings_body_composition.png');
  });
});
