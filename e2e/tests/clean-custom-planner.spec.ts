import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Clean Anti-Slop Workout Planner & Custom Routine Builder', () => {
  const timestamp = Date.now();
  const email = `clean_planner_${timestamp}@kaizen.com`;
  const password = 'Password123!';

  test('User can create a custom routine from scratch, manage exercises, and load it in 1-click to Workout Tracker with zero AI slop', async ({ page }) => {
    test.setTimeout(90000);

    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register fresh user
    console.log('[1/7] Registering fresh user...');
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Alex');
    await page.fill('input[placeholder="Doe"]', 'Hunter');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 2. Check Dashboard Advisor for lack of AI slop
    console.log('[2/7] Verifying clean advisor header on dashboard...');
    await expect(page.locator('text=Training & Nutrition Advisor')).toBeVisible({ timeout: 10000 });
    const phi3Badge = page.locator('text=Phi-3 Mini');
    expect(await phi3Badge.count()).toBe(0);

    // 3. Navigate to Workout Planner
    console.log('[3/7] Navigating to Workout Planner...');
    const sidebar = page.locator('aside');
    await sidebar.getByRole('button', { name: 'Workouts' }).click();
    await page.waitForTimeout(400);

    // Click "Workout Planner" sub-tab
    const plannerSubTab = page.locator('button:has-text("Workout Planner")').first();
    await plannerSubTab.click();
    await page.waitForTimeout(600);

    // Verify clean header
    await expect(page.locator('h1:has-text("Workout Planner")')).toBeVisible({ timeout: 10000 });
    // Verify absence of AI techno-babble
    const selfImproving = page.locator('text=[SELF-IMPROVING]');
    expect(await selfImproving.count()).toBe(0);
    const adaptationStatus = page.locator('text=ADAPTATION STATUS');
    expect(await adaptationStatus.count()).toBe(0);

    // Screenshot: Clean Workout Planner view
    await page.screenshot({ path: path.join(artifactDir, '27_clean_workout_planner.png') });
    console.log('Saved 27_clean_workout_planner.png');

    // 4. Open Custom Plan Builder Modal
    console.log('[4/7] Opening Custom Plan Builder Modal...');
    const createCustomPlanBtn = page.locator('button:has-text("Create Custom Plan")');
    await expect(createCustomPlanBtn).toBeVisible();
    await createCustomPlanBtn.click();
    await page.waitForTimeout(400);

    const builderModal = page.locator('div.fixed.inset-0');
    await expect(builderModal.locator('h3:has-text("Create Custom Workout Plan")')).toBeVisible({ timeout: 10000 });

    // Name the plan
    const planNameInput = builderModal.locator('input[placeholder="e.g. 4-Day Hypertrophy Split"]');
    await planNameInput.fill('My 4-Day Custom Split');

    // Add movement to Day 1: Click "Add" on first exercise in Exercise Directory
    const firstAddBtn = builderModal.locator('button:has-text("Add")').first();
    await firstAddBtn.click();
    await page.waitForTimeout(300);

    // Screenshot: Custom Plan Builder Modal
    await page.screenshot({ path: path.join(artifactDir, '28_custom_plan_builder.png') });
    console.log('Saved 28_custom_plan_builder.png');

    // Save the custom plan
    console.log('[4/7] Saving custom plan...');
    const savePlanBtn = builderModal.locator('button:has-text("Save Custom Plan")');
    await savePlanBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal closes
    await expect(builderModal).not.toBeVisible({ timeout: 5000 });

    // 5. Verify Day 1 details and add an exercise directly via AddExerciseToDayModal
    console.log('[5/7] Adding an exercise to Day 1 via AddExerciseToDayModal...');
    const day1Btn = page.locator('button:has-text("Mon")').first();
    await day1Btn.click();
    await page.waitForTimeout(400);

    const addExBtn = page.locator('button:has-text("Add Exercise")').first();
    await addExBtn.click();
    await page.waitForTimeout(400);

    const addModal = page.locator('div.fixed.inset-0');
    await expect(addModal.locator('h3:has-text("Add Exercise to Day 1")')).toBeVisible({ timeout: 10000 });

    // Select the first exercise row from library
    const firstExerciseRow = addModal.locator('div:has-text("Select")').last();
    await firstExerciseRow.click();
    await page.waitForTimeout(300);

    // Click "Add to Day 1" button
    const addToDayBtn = addModal.locator('button:has-text("Add to Day 1")');
    await addToDayBtn.click();
    await page.waitForTimeout(800);

    // Verify add modal closes
    await expect(addModal).not.toBeVisible({ timeout: 5000 });

    // Screenshot: Active Day with Compact Exercises
    await page.screenshot({ path: path.join(artifactDir, '29_active_day_compact_exercises.png') });
    console.log('Saved 29_active_day_compact_exercises.png');

    // 6. Test 1-Click Load into Workout Tracker
    console.log('[6/7] Testing 1-click planned workout loading into Active Session...');
    const activeSessionSubTab = page.locator('button:has-text("Active Session")').first();
    await activeSessionSubTab.click();
    await page.waitForTimeout(800);

    await expect(page.locator('h2:has-text("Strength & Workout Training")')).toBeVisible({ timeout: 10000 });

    // Verify the 1-click button inside the empty state card (e.g. Load Routine: Upper Body Push)
    const loadRoutineBtn = page.locator('button:has-text("Load Routine"), button:has-text("Load Planned Routine")').first();
    await expect(loadRoutineBtn).toBeVisible({ timeout: 5000 });
    console.log('Clicking Load Routine button...');
    await loadRoutineBtn.click();
    await page.waitForTimeout(1200);

    // Verify exercise row is rendered in the set logger
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Mark set 1 as completed
    const firstSetDoneBtn = page.locator('table tbody tr').first().locator('button').first();
    await firstSetDoneBtn.click();
    await page.waitForTimeout(200);

    // Save session
    const saveSessionBtn = page.locator('button:has-text("Save Session"), button:has-text("Update Session")').first();
    await saveSessionBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Workout session recorded successfully!')).toBeVisible({ timeout: 10000 });

    // Screenshot: Workout Tracker with populated routine
    await page.screenshot({ path: path.join(artifactDir, '30_workout_tracker_populated.png') });
    console.log('Saved 30_workout_tracker_populated.png');

    console.log('[7/7] All tests completed successfully!');
  });
});
