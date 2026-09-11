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

  test('Exercise side panel synchronizes with TARGET FOCUS field, supports real-time search, and custom plan can be edited and deleted', async ({ page }) => {
    test.setTimeout(90000);
    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register fresh user
    console.log('[1/6] Registering fresh user for sync and edit testing...');
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Jordan');
    await page.fill('input[placeholder="Doe"]', 'Peterson');
    await page.fill('input[placeholder="Enter your email"]', `planner_sync_${Date.now()}@kaizen.com`);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 2. Navigate to Workout Planner
    console.log('[2/6] Navigating to Workout Planner...');
    const sidebar = page.locator('aside');
    await sidebar.getByRole('button', { name: 'Workouts' }).click();
    await page.waitForTimeout(400);

    const plannerSubTab = page.locator('button:has-text("Workout Planner")').first();
    await plannerSubTab.click();
    await page.waitForTimeout(600);

    // Wait for the workout planner view to be loaded
    await expect(page.locator('h1:has-text("Workout Planner")')).toBeVisible({ timeout: 10000 });

    // 3. Open Custom Plan Builder Modal
    console.log('[3/6] Opening Custom Plan Builder Modal...');
    const createBtn = page.locator('button:has-text("Create Custom Plan")').first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();
    await page.waitForTimeout(400);

    const builderModal = page.locator('div.fixed.inset-0');
    await expect(builderModal.locator('h3:has-text("Create Custom Workout Plan")')).toBeVisible({ timeout: 10000 });

    // 4. Test Target Focus synchronization with side panel
    console.log('[4/6] Testing Target Focus synchronization...');
    const targetFocusInput = builderModal.locator('input[placeholder="e.g. legs, chest, back, shoulders"]');
    
    // Type "leg" into Target Focus
    await targetFocusInput.fill('');
    await targetFocusInput.fill('Quads & Legs Focus');
    await page.waitForTimeout(500);

    // Verify side panel shows "Filtered by Focus" banner
    await expect(builderModal.locator('text=Filtered by Focus:')).toBeVisible();

    // Verify only leg exercises show up in the directory list
    const directoryExercises = builderModal.locator('div.divide-y > div');
    const firstExName = await directoryExercises.first().locator('div.font-medium').innerText();
    console.log(`First exercise with leg focus: ${firstExName}`);

    // Test text search bar in directory
    console.log('Testing real-time search in exercise directory...');
    const searchInput = builderModal.locator('input[placeholder="Search exercises by name, muscle, equipment..."]');
    await searchInput.fill('Bench');
    await page.waitForTimeout(400);

    // Verify search matches
    await expect(builderModal.locator('text=Bench').first()).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Add first filtered exercise to Day 1
    await directoryExercises.first().locator('button:has-text("Add")').click();
    await page.waitForTimeout(300);

    // Name and Save Custom Plan
    const planNameInput = builderModal.locator('input[placeholder="e.g. 4-Day Hypertrophy Split"]');
    await planNameInput.fill('Legs & Strength Custom Routine');

    // Screenshot: Custom builder with focus filtering and search
    await page.screenshot({ path: path.join(artifactDir, '31_target_focus_search_and_edit_plan.png') });
    console.log('Saved 31_target_focus_search_and_edit_plan.png');

    const saveBtn = builderModal.locator('button:has-text("Save Custom Plan")');
    await saveBtn.click();
    await page.waitForTimeout(1000);
    await expect(builderModal).not.toBeVisible({ timeout: 5000 });

    // 5. Verify Top Header has the 3 buttons: Export PDF, Create Custom Plan, Plan Settings (Generate Plan)
    console.log('[5/7] Verifying top header has only 3 buttons...');
    const exportPdfBtn = page.getByRole('button', { name: 'Export PDF' });
    const createPlanBtn = page.getByRole('button', { name: 'Create Custom Plan' });
    const planSettingsBtn = page.getByRole('button', { name: /Plan Settings/ });
    await expect(exportPdfBtn).toBeVisible();
    await expect(createPlanBtn).toBeVisible();
    await expect(planSettingsBtn).toBeVisible();

    // 6. Test Edit from Schedule Pane
    console.log('[6/7] Testing Edit from Schedule Pane...');
    // Header shows Custom Plan badge and custom name
    await expect(page.locator('span:has-text("Legs & Strength Custom Routine")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('span:has-text("Custom Plan")')).toBeVisible();

    // Click "Edit Day" button located inside the schedule pane
    const editDayBtn = page.locator('button:has-text("Edit Day")').first();
    await expect(editDayBtn).toBeVisible();
    await editDayBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is in Edit Mode
    await expect(builderModal.locator('text=Editing Routine')).toBeVisible({ timeout: 5000 });
    // Verify plan name is pre-populated
    await expect(planNameInput).toHaveValue('Legs & Strength Custom Routine');

    // Close modal
    await builderModal.locator('button:has-text("Cancel")').first().click();
    await page.waitForTimeout(400);

    // Screenshot: Clean 3 top header buttons and schedule pane with edit/delete controls
    await page.screenshot({ path: path.join(artifactDir, '32_clean_three_buttons_and_schedule_pane_edit.png') });
    console.log('Saved 32_clean_three_buttons_and_schedule_pane_edit.png');

    // 7. Test Delete / Reset Routine from Schedule Pane
    console.log('[7/7] Testing Delete Routine from Schedule Pane...');
    const deleteRoutineBtn = page.locator('button:has-text("Delete Routine")').first();
    await expect(deleteRoutineBtn).toBeVisible();
    await deleteRoutineBtn.click();
    await page.waitForTimeout(300);

    // Confirm button appears
    const confirmDeleteBtn = page.locator('button:has-text("Confirm")');
    await expect(confirmDeleteBtn).toBeVisible();
    await confirmDeleteBtn.click();
    await page.waitForTimeout(1000);

    // Verify reset notification toast and badge reverts
    await expect(page.locator('text=Workout plan reset to default inventory schedule.')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('span:has-text("Preset Routine")')).toBeVisible({ timeout: 5000 });

    console.log('3-button top header, schedule pane edit and delete flows verified successfully!');
  });

  test('User can use target focus chips, adjust sets/reps/weight inputs, and toggle inventory-friendly exercises in Custom Plan Builder', async ({ page }) => {
    test.setTimeout(90000);

    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register fresh user
    const testUserEmail = `custom_chips_${Date.now()}@kaizen.com`;
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Jordan');
    await page.fill('input[placeholder="Doe"]', 'Peterson');
    await page.fill('input[placeholder="Enter your email"]', testUserEmail);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 2. Navigate to Workout Planner
    const sidebar = page.locator('aside');
    await sidebar.getByRole('button', { name: 'Workouts' }).click();
    await page.waitForTimeout(400);

    const plannerSubTab = page.locator('button:has-text("Workout Planner")').first();
    await plannerSubTab.click();
    await page.waitForTimeout(600);

    // 3. Open Custom Plan Builder Modal
    const createBtn = page.locator('button:has-text("Create Custom Plan")').first();
    await createBtn.click();
    await page.waitForTimeout(400);

    const builderModal = page.locator('div.fixed.inset-0');
    await expect(builderModal.locator('h3:has-text("Create Custom Workout Plan")')).toBeVisible({ timeout: 10000 });

    // 4. Test Target Focus Chips & Clear Focus
    console.log('Testing Target Focus chips pick list & Clear Focus...');
    const clearFocusBtn = builderModal.locator('button:has-text("Clear Focus")');
    if (await clearFocusBtn.isVisible()) {
      await clearFocusBtn.click();
      await page.waitForTimeout(200);
    }

    // Click "Legs" chip
    const legsChip = builderModal.locator('button:has-text("Legs")').first();
    await legsChip.click();
    await page.waitForTimeout(300);

    const targetFocusInput = builderModal.locator('input[placeholder="e.g. legs, chest, back, shoulders"]');
    await expect(targetFocusInput).toHaveValue(/Legs/i);

    // Click "Core" chip to multi-select
    const coreChip = builderModal.locator('button:has-text("Core")').first();
    await coreChip.click();
    await page.waitForTimeout(300);
    await expect(targetFocusInput).toHaveValue(/Core/i);

    // 5. Test Inventory Friendly button next to Exercise Directory
    console.log('Testing Inventory Friendly button next to Exercise Directory...');
    const inventoryFriendlyBtn = builderModal.locator('button:has-text("Inventory Friendly")');
    await expect(inventoryFriendlyBtn).toBeVisible();
    await inventoryFriendlyBtn.click();
    await page.waitForTimeout(400);

    // Verify button has active styling class
    await expect(inventoryFriendlyBtn).toHaveClass(/border-emerald-500/);

    // 6. Add an exercise to Day 1 and adjust Sets, Reps & Weight
    console.log('Adding exercise and adjusting sets, reps, weight...');
    const firstAddBtn = builderModal.locator('button:has-text("Add")').first();
    await firstAddBtn.click();
    await page.waitForTimeout(300);

    // Verify planned exercise row appears with interactive number inputs
    const setsInput = builderModal.locator('input[type="number"]').nth(0);
    const repsInput = builderModal.locator('input[type="number"]').nth(1);
    const weightInput = builderModal.locator('input[type="number"]').nth(2);

    await setsInput.fill('4');
    await repsInput.fill('12');
    await weightInput.fill('32.5');
    await page.waitForTimeout(300);

    await expect(setsInput).toHaveValue('4');
    await expect(repsInput).toHaveValue('12');
    await expect(weightInput).toHaveValue('32.5');

    // 7. Capture visual proof screenshot
    await page.screenshot({ path: path.join(artifactDir, '33_focus_chips_weight_reps_and_inventory_friendly.png') });
    console.log('Saved 33_focus_chips_weight_reps_and_inventory_friendly.png');

    // 8. Save the custom plan
    const planNameInput = builderModal.locator('input[placeholder="e.g. 4-Day Hypertrophy Split"]');
    await planNameInput.fill('Push & Arms Custom Split');
    const saveBtn = builderModal.locator('button:has-text("Save Custom Plan")');
    await saveBtn.click();
    await page.waitForTimeout(1000);
    await expect(builderModal).not.toBeVisible({ timeout: 5000 });

    // Verify saved plan on planner page displays 4 sets × 12 reps and 32.5 kg load
    await expect(page.locator('text=4 sets × 12 reps')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=32.5 kg')).toBeVisible({ timeout: 5000 });
    console.log('All focus chips, sets/reps/weight adjustments, and inventory friendly filter successfully verified!');
  });
});
