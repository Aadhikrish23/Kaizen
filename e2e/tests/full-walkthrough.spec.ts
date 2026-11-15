import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Kaizen Full Feature Verification', () => {
  const timestamp = Date.now();
  const email = `walkthrough_${timestamp}@kaizen.com`;
  const password = 'Password123!';

  test('Walkthrough of all 11 core features', async ({ page }) => {
    test.setTimeout(120000);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // --- 1. REGISTRATION ---
    console.log('[1/9] Navigating to /register...');
    await page.goto('http://localhost:5173/register');
    await expect(page.locator('text=Create Athlete Account')).toBeVisible();

    await page.fill('input[placeholder="John"]', 'Kaizen');
    await page.fill('input[placeholder="Doe"]', 'Tester');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.screenshot({ path: path.join(screenshotsDir, '01_register_filled.png') });
    
    await page.click('button[type="submit"]');

    // --- 2. ONBOARDING WIZARD ---
    console.log('[2/9] Navigating through 5-Step Onboarding...');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await expect(page.locator('text=Personal Baselines')).toBeVisible();

    // Step 1: Personal
    await page.fill('input[placeholder="Your name"]', 'Kaizen Tester');
    await page.fill('input[type="date"]', '1996-05-20');
    await page.getByRole('button', { name: 'male', exact: true }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '02_onboarding_step1.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Body
    await expect(page.locator('text=Calibration Phase 2 of 5')).toBeVisible();
    await page.fill('input[placeholder="e.g. 175"]', '180');
    await page.fill('input[placeholder="e.g. 75.5"]', '77.5');
    await page.screenshot({ path: path.join(screenshotsDir, '03_onboarding_step2.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Goal
    await expect(page.locator('text=Calibration Phase 3 of 5')).toBeVisible();
    await page.getByText('Maintain Weight', { exact: true }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '04_onboarding_step3.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 4: Activity Level
    await expect(page.locator('text=Calibration Phase 4 of 5')).toBeVisible();
    await page.getByText('Moderately Active', { exact: true }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '05_onboarding_step4.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 5: Targets
    await expect(page.locator('text=Calibration Phase 5 of 5')).toBeVisible();
    const calTarget = page.locator('input[placeholder="e.g. 2000"]');
    if (!(await calTarget.inputValue())) {
      await calTarget.fill('2200');
    }
    const proteinTarget = page.locator('input[placeholder="e.g. 150"]');
    if (!(await proteinTarget.inputValue())) {
      await proteinTarget.fill('160');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '06_onboarding_step5.png') });
    await page.getByRole('button', { name: 'Complete Setup' }).click();

    // --- 3. DASHBOARD OVERVIEW ---
    console.log('[3/9] Verifying Main Dashboard & 4 Pillars...');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Live Telemetry')).toBeVisible();

    // Check 4 pillars
    await expect(page.getByRole('heading', { name: 'Strength & Training' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nutrition & Energy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hydration Level' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scale Weight' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '07_dashboard_pillars.png') });

    // AI Coach Interaction
    console.log('Testing AI Coach in Dashboard...');
    await expect(page.getByRole('heading', { name: 'Training & Nutrition Advisor' })).toBeVisible();
    const coachInput = page.locator('input[placeholder="Ask a question about nutrition, exercises, or recovery..."]');
    await coachInput.fill('What is the best post-workout nutrition?');
    await page.locator('button:has(svg.lucide-send)').click();
    await expect(page.locator('div.max-w-\\[85\\%\\]').last()).toBeVisible({ timeout: 20000 });
    console.log('AI Coach replied successfully.');

    // Kaizen Readiness Score Card
    await expect(page.getByRole('heading', { name: 'Kaizen Readiness' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '08_dashboard_ai_gamification.png') });

    // --- 4. HYDRATION TRACKING ---
    console.log('[4/9] Testing Hydration Tracking...');
    await page.getByRole('button', { name: 'Hydration' }).click();
    await expect(page.locator('text=Hydration & Electrolyte Index')).toBeVisible();
    const quickAdd = page.locator('button:has-text("+250")').first();
    if (await quickAdd.isVisible()) {
      await quickAdd.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '09_hydration_tab.png') });

    // --- 5. NUTRITION TRACKING & RECIPE EXPLORER ---
    console.log('[5/9] Testing Nutrition Tracker & Recipe Discovery...');
    await page.getByRole('button', { name: 'Nutrition' }).click();
    await expect(page.locator('text=Nutrition & Energy Balance')).toBeVisible({ timeout: 15000 });

    // Open Discover Recipes Modal
    const discoverBtn = page.getByRole('button', { name: 'Discover Recipes' });
    await expect(discoverBtn).toBeVisible();
    await discoverBtn.click();
    await expect(page.getByRole('heading', { name: 'Recipe Discovery' })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, '10a_recipe_explorer_modal.png') });
    // Close modal
    await page.getByRole('button', { name: 'Close recipes' }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '10_nutrition_tab.png') });

    // --- 6. WORKOUTS HUB (SESSION, PLANNER & INVENTORY UNDER WORKOUTS) ---
    console.log('[6/9] Testing Workouts Hub & Sub-modules...');
    await page.getByRole('button', { name: 'Workouts', exact: true }).click();
    await page.waitForTimeout(1000);

    // 6a. Equipment & Inventory Sub-tab
    console.log('[6a/9] Testing Equipment & Inventory under Workouts...');
    await page.locator('button:has-text("Equipment & Inventory")').first().click();
    await expect(page.getByRole('heading', { name: 'Gym & Equipment Inventory' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Quick Setup Presets')).toBeVisible();

    // Apply a preset (new users have no equipment until they choose)
    // New users start with an empty, unconfirmed inventory: choose the Home Dumbbell Starter preset explicitly
    await page.locator('div:has(> div > h4:has-text("Home Dumbbell Starter")) > button').click();
    await page.waitForTimeout(1000);

    // Test Equipment Editing feature
    console.log('Testing Equipment Editing...');
    const editBtn = page.locator('button[title="Edit equipment item"]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await expect(page.locator('text=Edit Equipment')).toBeVisible();

    // Edit available weights
    const weightsInput = page.locator('input[placeholder="e.g. 2.5, 5, 7.5, 10, 15, 20"]');
    await weightsInput.fill('2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5');
    await page.locator('button:has-text("Save Changes")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=22.5 kg')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '11_inventory_view.png') });

    // 6b. Adaptive Workout Planner Sub-tab
    console.log('[6b/9] Testing Adaptive Workout Planner under Workouts...');
    await page.locator('button:has-text("Adaptive Planner")').first().click();
    await expect(page.getByRole('heading', { name: 'Adaptive Workout Planner' })).toBeVisible({ timeout: 15000 });
    
    // Open Preferences & Tune Questionnaire
    const tuneBtn = page.getByRole('button', { name: 'Tune Preferences' });
    await tuneBtn.click();
    await expect(page.locator('text=Personalized Training Preferences')).toBeVisible();

    // Select 4 Days and 45m and Upper / Lower
    await page.locator('button:has-text("4 Days")').click();
    await page.locator('button:has-text("45m")').click();
    await page.locator('button:has-text("Upper / Lower")').click();
    await page.locator('button:has-text("Hypertrophy")').click();

    // Generate plan
    await page.getByRole('button', { name: 'Generate Personalized Plan' }).click();
    await page.waitForTimeout(1500);

    // Verify 7-day schedule
    await expect(page.locator('text=Weekly Cycle Structure')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '11a_adaptive_planner.png') });

    // Open Live Demo Video Modal
    console.log('Testing Exercise Live Demo Video Modal...');
    const demoBtn = page.locator('button[title="Watch live form video demo"]').first();
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();
    await expect(page.locator('text=Form Breakdown & Execution Cues')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotsDir, '11b_exercise_video_modal.png') });
    await page.locator('div.fixed button:has-text("Close")').last().click();
    await expect(page.locator('text=Form Breakdown & Execution Cues')).not.toBeVisible();

    // Start Day 1's workout, loading it into the Active Session Tracker
    console.log("Starting today's workout from the planner...");
    const startBtn = page.getByRole('button', { name: 'Start This Workout' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await page.waitForTimeout(1500);

    // 6c. Active Session Tracker Sub-tab
    console.log('[6c/9] Testing Active Session Tracker under Workouts...');
    await page.locator('button:has-text("Active Session")').first().click();
    await expect(page.locator('text=Strength & Workout Training')).toBeVisible({ timeout: 15000 });
    
    // Mark all sets as completed
    const circleButtons = page.locator('button:has(svg.lucide-circle)');
    const totalToClick = await circleButtons.count();
    for (let i = 0; i < totalToClick; i++) {
      const firstUnchecked = page.locator('button:has(svg.lucide-circle)').first();
      if (await firstUnchecked.isVisible()) {
        await firstUnchecked.click();
        await page.waitForTimeout(50);
      }
    }

    // Save or Update Session
    const saveWorkoutBtn = page.locator('button:has-text("Update Session"), button:has-text("Save Session")').first();
    await expect(saveWorkoutBtn).toBeVisible();
    await saveWorkoutBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, '11c_workout_tracker.png') });

    // --- 7. SCALE WEIGHT & MEASUREMENTS ---
    console.log('[7/9] Testing Scale Weight & Body Measurements...');
    await page.getByRole('button', { name: 'Scale Weight' }).click();
    await expect(page.locator('text=Body Composition')).toBeVisible();
    
    // Log Weight
    await page.fill('input[placeholder="0.0"]', '77.8');
    await page.getByRole('button', { name: 'Save Weight' }).click();
    await page.waitForTimeout(1000);

    // Switch to Measurements sub-tab
    await page.screenshot({ path: path.join(screenshotsDir, '11b_weight_page_loaded.png') });
    await page.locator('button:has-text("Measurements")').click();
    await expect(page.getByRole('heading', { name: 'Body Measurements' })).toBeVisible({ timeout: 10000 });
    
    // Dismiss any browser alerts
    page.on('dialog', async d => await d.accept());

    await page.fill('input[name="chestCm"]', '104');
    await page.fill('input[name="waistCm"]', '83');
    await page.fill('input[name="armsCm"]', '38');
    await page.locator('button:has-text("Save Measurements")').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, '12_weight_measurements.png') });

    // --- 8. ANALYTICS HUB ---
    console.log('[8/9] Testing Analytics Hub & Recharts...');
    await page.getByRole('button', { name: 'Analytics' }).click();
    await expect(page.locator('text=Performance Telemetry & Analytics')).toBeVisible();

    // Verify all 4 Recharts cards
    await expect(page.getByRole('heading', { name: 'Caloric Intake' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Body Composition Trend' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Training Volume Load' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Macronutrient Balance Ratio' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '13_analytics_dashboard.png') });

    // Test filter dropdown
    await page.locator('select').selectOption('14');
    await page.waitForTimeout(1000);
    await page.locator('select').selectOption('30');
    await page.waitForTimeout(1000);

    // --- 9. PROFILE SETTINGS ---
    console.log('[9/9] Testing Profile Settings...');
    await page.locator('a:has-text("Profile Settings")').click();
    await expect(page).toHaveURL(/.*\/settings\/profile/);
    await expect(page.getByRole('heading', { name: 'Athlete Profile & Calibration' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '14_profile_settings.png') });

    console.log('>>> COMPLETE BROWSER VERIFICATION SUCCESSFUL! <<<');
  });
});
