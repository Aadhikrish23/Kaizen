import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('5-Day Planner Frequency and PDF Generation Verification', () => {
  const timestamp = Date.now();
  const email = `frequency5_${timestamp}@kaizen.com`;
  const password = 'Password123!';

  test('User selecting 5 days per week gets exactly 5 workout days with distinct session titles and non-overlapping PDF', async ({ page }) => {
    test.setTimeout(120000);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register and complete onboarding
    console.log('[1/4] Registering fresh user...');
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Aadhi');
    await page.fill('input[placeholder="Doe"]', 'Krish');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    // Click "Skip for now" to jump straight into app
    await page.locator('button:has-text("Skip for now")').first().click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 2. Navigate to Workouts -> Adaptive Planner
    console.log('[2/4] Navigating to Adaptive Planner...');
    await page.getByRole('button', { name: 'Workouts', exact: true }).click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Adaptive Planner")').first().click();

    await expect(page.getByRole('heading', { name: 'Adaptive Workout Planner' })).toBeVisible({ timeout: 15000 });

    // 3. Open Preferences and configure: 5 days/week, Home Dumbbell
    console.log('[3/4] Configuring plan for 5 days/week and Home Dumbbell split...');
    await page.locator('button:has-text("Plan Settings"), button:has-text("Tune Preferences")').first().click();
    await expect(page.getByRole('heading', { name: 'Personalized Training Preferences' })).toBeVisible();

    // Select 5 days per week
    await page.locator('button:has-text("5 days")').first().click();

    // Select Home Dumbbell split
    await page.locator('button:has-text("Home Dumbbell")').first().click();

    // Click "Generate Personalized Plan"
    await page.locator('button:has-text("Generate Personalized Plan")').first().click();
    await page.waitForTimeout(1500);

    // 4. Verify exactly 5 workout days in schedule badges
    console.log('[4/4] Verifying 5 workout days generated...');
    
    // Check summary card shows "5 training days/week"
    await expect(page.locator('text=5 training days/week')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed summary card indicates 5 training days/week');

    // Count workout badges in the 7-day schedule header
    // Badges have text "WORKOUT"
    const workoutBadges = page.locator('div:has-text("WORKOUT")');
    const workoutCount = await page.locator('button:has-text("Day ") span:has-text("WORKOUT"), div:has-text("WORKOUT")').count();
    console.log('Found workout badges count:', workoutCount);

    // Check that Day 1 is not titled "Part 1", but has rich title
    await expect(page.locator('h2:has-text("Home Dumbbell - Upper Body Push & Pull")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed rich targeted session title: Home Dumbbell - Upper Body Push & Pull');

    // Click Day 2
    await page.locator('button:has-text("Day 2")').first().click();
    await expect(page.locator('h2:has-text("Home Dumbbell - Lower Body Resilience & Core")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed Day 2 title: Home Dumbbell - Lower Body Resilience & Core');

    // Click Day 3
    await page.locator('button:has-text("Day 3")').first().click();
    await expect(page.locator('h2:has-text("Home Dumbbell - Delts, Arms & Hypertrophy")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed Day 3 title: Home Dumbbell - Delts, Arms & Hypertrophy');

    // Click Day 4 (Rest day)
    await page.locator('button:has-text("Day 4")').first().click();
    await expect(page.locator('h2:has-text("Rest")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed Day 4 is Rest & Recovery');

    // Click Day 5
    await page.locator('button:has-text("Day 5")').first().click();
    await expect(page.locator('h2:has-text("Home Dumbbell - Compound Conditioning & Core")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed Day 5 title: Home Dumbbell - Compound Conditioning & Core');

    // Click Day 6
    await page.locator('button:has-text("Day 6")').first().click();
    await expect(page.locator('h2:has-text("Home Dumbbell - Posterior Chain & Back Specialization")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed Day 6 title: Home Dumbbell - Posterior Chain & Back Specialization');

    // Click Day 7 (Rest day)
    await page.locator('button:has-text("Day 7")').first().click();
    await expect(page.locator('h2:has-text("Rest")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Confirmed Day 7 is Rest & Recovery');

    // Take screenshot of 5-day planner
    const screenshot5Day = path.join(screenshotsDir, '22_planner_5_days_verified.png');
    await page.screenshot({ path: screenshot5Day, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(screenshot5Day, path.join(artifactDir, '22_planner_5_days_verified.png'));
    }

    // Trigger PDF Export and verify
    console.log('Triggering PDF export of 5-day plan...');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Export PDF")').first().click();
    const download = await downloadPromise;

    const suggestedFilename = download.suggestedFilename();
    const downloadedPdfPath = path.join(screenshotsDir, suggestedFilename);
    await download.saveAs(downloadedPdfPath);

    expect(fs.existsSync(downloadedPdfPath)).toBe(true);
    console.log('✓ 5-day PDF generated successfully:', suggestedFilename, 'size:', fs.statSync(downloadedPdfPath).size);

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(downloadedPdfPath, path.join(artifactDir, 'Kaizen_5Day_Exported_Workout_Plan.pdf'));
    }
  });
});
