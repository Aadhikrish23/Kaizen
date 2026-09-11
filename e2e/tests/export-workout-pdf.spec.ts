import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Workout Plan PDF Export Verification', () => {
  const timestamp = Date.now();
  const email = `pdf_tester_${timestamp}@kaizen.com`;
  const password = 'Password123!';

  test('User can export complete workout plan as a valid styled PDF document', async ({ page }) => {
    test.setTimeout(120000);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const artifactDir = 'C:\\Users\\aadhi\\.gemini\\antigravity\\brain\\b5d71a0f-2601-4a1a-ae35-846764369900';

    // 1. Register fresh user
    console.log('[1/4] Registering fresh test user...');
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John"]', 'Jordan');
    await page.fill('input[placeholder="Doe"]', 'KaizenAthlete');
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Create a password"]', password);
    await page.click('button[type="submit"]');

    // 2. Complete Onboarding
    console.log('[2/4] Completing onboarding...');
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15000 });
    await page.fill('input[placeholder="Your name"]', 'Jordan Athlete');
    await page.fill('input[type="date"]', '1995-08-20');
    await page.getByRole('button', { name: 'male', exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.fill('input[placeholder="e.g. 175"]', '182');
    await page.fill('input[placeholder="e.g. 75.5"]', '78.5');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByText('Maintain Weight', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByText('Moderately Active', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Complete Setup' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // 3. Navigate to Workouts -> Adaptive Planner
    console.log('[3/4] Navigating to Adaptive Planner...');
    await page.getByRole('button', { name: 'Workouts', exact: true }).click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Adaptive Planner")').first().click();

    // Verify planner loaded
    await expect(page.getByRole('heading', { name: 'Adaptive Workout Planner' })).toBeVisible({ timeout: 15000 });

    const exportBtn = page.locator('button:has-text("Export PDF")').first();
    await expect(exportBtn).toBeVisible();

    // Screenshot before export
    const screenshotPathBefore = path.join(screenshotsDir, '18_adaptive_planner_pdf_button.png');
    await page.screenshot({ path: screenshotPathBefore, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(screenshotPathBefore, path.join(artifactDir, '18_adaptive_planner_pdf_button.png'));
    }

    // 4. Trigger PDF Export and intercept download event
    console.log('[4/4] Triggering Export PDF and verifying download...');
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();

    const download = await downloadPromise;
    const suggestedFilename = download.suggestedFilename();
    console.log('Downloaded filename:', suggestedFilename);

    expect(suggestedFilename).toMatch(/^Kaizen-Workout-Plan-.*\.pdf$/);

    // Save download to disk
    const downloadedPdfPath = path.join(screenshotsDir, suggestedFilename);
    await download.saveAs(downloadedPdfPath);

    // Verify file exists and is a valid non-empty PDF
    expect(fs.existsSync(downloadedPdfPath)).toBe(true);
    const fileStats = fs.statSync(downloadedPdfPath);
    console.log('PDF file size:', fileStats.size, 'bytes');
    expect(fileStats.size).toBeGreaterThan(3000); // Substantial PDF document with tables & metadata

    // Check PDF header signature: "%PDF-"
    const fileBuffer = fs.readFileSync(downloadedPdfPath);
    const header = fileBuffer.subarray(0, 5).toString('utf-8');
    expect(header).toBe('%PDF-');
    console.log('PDF header magic bytes verified:', header);

    // Also copy to artifact directory for user access
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(downloadedPdfPath, path.join(artifactDir, 'Kaizen_Exported_Workout_Plan.pdf'));
    }

    // Verify UI success notification banner
    await expect(page.locator('text=Training blueprint successfully exported as')).toBeVisible({ timeout: 5000 });

    const screenshotPathAfter = path.join(screenshotsDir, '19_pdf_export_success_toast.png');
    await page.screenshot({ path: screenshotPathAfter, fullPage: true });
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(screenshotPathAfter, path.join(artifactDir, '19_pdf_export_success_toast.png'));
    }

    console.log('PDF export verification successfully completed!');
  });
});
