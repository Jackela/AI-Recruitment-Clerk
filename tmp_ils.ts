import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('PDF UAT - Real File', () => {
  test('Coach page accepts JD + real PDF and shows correct skills', async ({ page }) => {
    const root = process.cwd();
    const jdPath = path.resolve(root, 'UAT_Architect_JD.txt');
    const pdfPath = path.resolve(root, '简历.pdf');

    // Ensure test artifacts exist
    expect(fs.existsSync(jdPath)).toBeTruthy();
    expect(fs.existsSync(pdfPath)).toBeTruthy();

    const jd = fs.readFileSync(jdPath, 'utf-8');

    // Navigate to Coach page
    await page.goto('/coach');

    // Fill JD
    await page.locator('#jd').fill(jd);

    // Upload real PDF resume
    const fileInput = page.locator('#resume');
    await fileInput.setInputFiles(pdfPath);

    // Submit analysis
    await Promise.all([
      page.getByRole('button', { name: /analyze/i }).click(),
    ]);

    // Wait for Diagnostic Report to be visible
    await expect(page.getByRole('heading', { name: /diagnostic report/i })).toBeVisible({ timeout: 20000 });

    // Assertions (case-insensitive)
    const matchedSection = page.getByText(/Matched Skills/i).locator('xpath=..');
    await expect(matchedSection).toContainText(/aws/i);
    await expect(matchedSection).toContainText(/kubernetes/i);

    const missingSection = page.getByText(/Missing Skills/i).locator('xpath=..');
    await expect(missingSection).toContainText(/azure/i);
  });
});


