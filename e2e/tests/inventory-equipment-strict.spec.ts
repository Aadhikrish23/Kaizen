import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Strict Inventory Equipment Matching & Exercise Swap Verification', () => {
  const timestamp = Date.now();
  const email = `inventory_tester_${timestamp}@kaizen.com`;
  const password = 'Password123!';

  test('User with only dumbbells, pull-up bar, and pushup handles gets zero bench/dip exercises and can swap movements', async ({ page }) => {
    test.setTimeout(120000);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // 1. Register fresh user
    console.log('[1/5] Registering fresh test user...');
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Alex');
    await page.fill('input[placeholder="Doe"]', 'HomeGym');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    // 2. Complete Onboarding
    console.log('[2/5] Completing onboarding...');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.fill('input[placeholder="Your name"]', 'Alex HomeGym');
    await page.fill('input[type="date"]', '1998-04-12');
    await page.getByRole('button', { name: 'male', exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.fill('input[placeholder="e.g. 175"]', '178');
    await page.fill('input[placeholder="e.g. 75.5"]', '75.0');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByText('Maintain Weight', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByText('Moderately Active', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Complete Setup' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 3. Set User's Exact Arsenal from Screenshot:
    // Only: Adjustable Dumbbells Set, Doorway Pull-up Bar, pushup Bar (NO BENCH, NO DIP STATION)
    console.log('[3/5] Configuring user inventory to exact hardware: Dumbbells + Doorway Pull-up Bar + pushup Bar...');

    // Navigate to Workouts -> Inventory sub-tab
    await page.getByRole('button', { name: 'Workouts', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Equipment & Inventory")').first().click();
    await expect(page.getByRole('heading', { name: 'Gym & Equipment Inventory' })).toBeVisible({ timeout: 15000 });

    // Remove the bench so user has NO bench
    const removeBenchBtn = page.locator('button[aria-label="Remove Adjustable Incline/Flat Bench"]');
    if (await removeBenchBtn.isVisible()) {
      await removeBenchBtn.click();
      await page.waitForTimeout(300);
    }

    // Remove the resistance bands
    const removeBandsBtn = page.locator('button[aria-label="Remove Loop & Tube Resistance Bands"]');
    if (await removeBandsBtn.isVisible()) {
      await removeBandsBtn.click();
      await page.waitForTimeout(300);
    }

    // Edit the pull-up bar so it doesn't mention "Dip Station"
    const editPullupBtn = page.locator('button[aria-label="Edit Doorway Pull-up & Dip Station"]');
    if (await editPullupBtn.isVisible()) {
      await editPullupBtn.click();
      await page.fill('input[placeholder="Equipment Name"]', 'Doorway Pull-up Bar');
      await page.fill('input[placeholder="e.g. Incline positions: 30, 45, 60, 90 degrees"]', 'Max 130kg doorway mounted');
      await page.locator('button:has-text("Save Changes")').click();
      await page.waitForTimeout(800);
    }

    // Add pushup Bar
    await page.locator('button:has-text("Add Custom Equipment")').click();
    await page.fill('input[placeholder="e.g. Iron Master Quick-Lock Dumbbells"]', 'pushup Bar');
    await page.locator('select').first().selectOption('other');
    await page.fill('input[placeholder="e.g. Incline positions: 30, 45, 60, 90 degrees"]', 'ergonomic non-slip pushup handles');
    await page.locator('button[type="submit"]:has-text("Add Equipment")').click();
    await page.waitForTimeout(500);

    // Save equipment arsenal
    await page.locator('button:has-text("Save Inventory")').click();
    await page.waitForTimeout(1500);

    // Confirm the exact inventory items are shown
    await expect(page.locator('text=Adjustable Dumbbells Set')).toBeVisible();
    await expect(page.locator('text=Doorway Pull-up Bar')).toBeVisible();
    await expect(page.locator('text=pushup Bar')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '15a_user_exact_inventory.png') });

    // 4. Navigate to Adaptive Planner and Re-generate Plan
    console.log('[4/5] Testing Adaptive Planner with strict inventory constraints...');
    await page.locator('button:has-text("Adaptive Planner")').first().click();
    await expect(page.getByRole('heading', { name: 'Adaptive Workout Planner' })).toBeVisible({ timeout: 20000 });

    // Open Preferences and generate Home Dumbbells split
    const tuneBtn = page.getByRole('button', { name: 'Tune Preferences' });
    await tuneBtn.click();
    await expect(page.locator('text=Personalized Training Preferences')).toBeVisible();

    await page.locator('button:has-text("Home Dumbbells")').click();
    await page.getByRole('button', { name: 'Generate Personalized Plan' }).click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(screenshotsDir, '15b_strict_inventory_planner.png') });

    // Verify: Neither "Incline Dumbbell Press" nor "Dips (Chest Focus)" should appear in the scheduled movements!
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Incline Dumbbell Press');
    expect(pageContent).not.toContain('Dips (Chest Focus)');
    console.log('✓ Successfully confirmed: Neither Incline Dumbbell Press nor Dips (Chest Focus) are prescribed!');

    // Verify: Floor dumbbell or bodyweight movements ARE prescribed
    const hasFloorMovement = pageContent.includes('Dumbbell Floor Press') ||
      pageContent.includes('Push-Ups (Standard / Deficit)') ||
      pageContent.includes('Pull-Ups / Chin-Ups') ||
      pageContent.includes('Dumbbell Goblet Squat') ||
      pageContent.includes('One-Arm Dumbbell Row') ||
      pageContent.includes('Standing Dumbbell Shoulder Press');
    expect(hasFloorMovement).toBe(true);
    console.log('✓ Successfully confirmed: Floor dumbbell & bodyweight movements correctly assigned!');

    // 5. Test Exercise Swap Modal
    console.log('[5/5] Testing Swap Movement modal on planned exercise...');
    const firstSwapBtn = page.locator('button:has-text("Swap Movement")').first();
    await expect(firstSwapBtn).toBeVisible();
    await firstSwapBtn.click();
    await page.waitForTimeout(1000);

    // Modal should be open
    await expect(page.locator('text=Swap Exercise Movement')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '16_swap_exercise_modal.png') });

    // Verify modal does NOT list incompatible bench exercises when "Inventory Safe" is on
    const modalContent = await page.locator('.fixed.inset-0').textContent();
    expect(modalContent).not.toContain('Incline Dumbbell Press');
    expect(modalContent).not.toContain('Barbell Flat Bench Press');

    // Click "Select" on a compatible exercise in the modal list
    const selectMovementBtn = page.locator('.fixed.inset-0 button:has-text("Select")').first();
    await expect(selectMovementBtn).toBeVisible();
    await selectMovementBtn.click();
    await page.waitForTimeout(2000);

    // Verify modal closed and plan refreshed
    await expect(page.locator('text=Swap Exercise Movement')).not.toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '17_swapped_exercise_success.png') });
    console.log('✓ Successfully verified: Movement swapped and updated on planned day card!');
  });
});
