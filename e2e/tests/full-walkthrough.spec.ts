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
    await expect(page.locator('text=Create Account')).toBeVisible();

    await page.fill('input[placeholder="John"]', 'Kaizen');
    await page.fill('input[placeholder="Doe"]', 'Tester');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.screenshot({ path: path.join(screenshotsDir, '01_register_filled.png') });
    
    await page.click('button[type="submit"]');

    // --- 2. ONBOARDING WIZARD ---
    console.log('[2/9] Navigating through 5-Step Onboarding...');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await expect(page.locator('text=Set up your profile')).toBeVisible();

    // Step 1: Personal
    await page.fill('input[placeholder="Your name"]', 'Kaizen Tester');
    await page.fill('input[type="date"]', '1996-05-20');
    await page.getByRole('button', { name: 'male', exact: true }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '02_onboarding_step1.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Body
    await expect(page.locator('text=Step 2 of 5')).toBeVisible();
    await page.fill('input[placeholder="e.g. 175"]', '180');
    await page.fill('input[placeholder="e.g. 75.5"]', '77.5');
    await page.screenshot({ path: path.join(screenshotsDir, '03_onboarding_step2.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Goal
    await expect(page.locator('text=Step 3 of 5')).toBeVisible();
    await page.getByText('Maintain Weight', { exact: true }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '04_onboarding_step3.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 4: Activity Level
    await expect(page.locator('text=Step 4 of 5')).toBeVisible();
    await page.getByText('Moderately Active', { exact: true }).click();
    await page.screenshot({ path: path.join(screenshotsDir, '05_onboarding_step4.png') });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 5: Targets
    await expect(page.locator('text=Step 5 of 5')).toBeVisible();
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
    await expect(page.locator('text=Kaizen Daily Overview')).toBeVisible();
    
    // Check 4 pillars
    await expect(page.getByRole('heading', { name: 'Strength & Workout' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nutrition & Energy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hydration Intake' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scale Weight' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '07_dashboard_pillars.png') });

    // AI Coach Interaction
    console.log('Testing AI Coach in Dashboard...');
    await expect(page.getByRole('heading', { name: 'Kaizen AI Coach' })).toBeVisible();
    const coachInput = page.locator('input[placeholder="Ask a health question..."]');
    await coachInput.fill('What is the best post-workout nutrition?');
    await page.locator('button:has(svg.lucide-send)').click();
    await expect(page.locator('text=I see you asked about')).toBeVisible({ timeout: 10000 });
    console.log('AI Coach replied successfully.');

    // Gamification Card
    await expect(page.getByRole('heading', { name: 'Your Journey' })).toBeVisible();
    await expect(page.getByText('Kaizen Health Score')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '08_dashboard_ai_gamification.png') });

    // --- 4. HYDRATION TRACKING ---
    console.log('[4/9] Testing Hydration Tracking...');
    await page.getByRole('button', { name: 'Hydration' }).click();
    await expect(page.locator('text=Hydration Tracking')).toBeVisible();
    const quickAdd = page.locator('button:has-text("+250")').first();
    if (await quickAdd.isVisible()) {
      await quickAdd.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '09_hydration_tab.png') });

    // --- 5. NUTRITION TRACKING ---
    console.log('[5/9] Testing Nutrition Tracker...');
    await page.getByRole('button', { name: 'Nutrition' }).click();
    await expect(page.locator('text=Nutrition & Calories')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '10_nutrition_tab.png') });

    // --- 6. WORKOUT TRACKING ---
    console.log('[6/9] Testing Workout Tracker...');
    await page.getByRole('button', { name: 'Workouts' }).click();
    await expect(page.locator('text=Strength & Workout Training')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '11_workouts_tab.png') });

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
    await expect(page.locator('text=Data & Analytics')).toBeVisible();

    // Verify all 4 Recharts cards
    await expect(page.getByRole('heading', { name: 'Caloric Intake' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Body Weight' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workout Volume' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Macro Balance' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '14_profile_settings.png') });

    console.log('>>> COMPLETE BROWSER VERIFICATION SUCCESSFUL! <<<');
  });
});
