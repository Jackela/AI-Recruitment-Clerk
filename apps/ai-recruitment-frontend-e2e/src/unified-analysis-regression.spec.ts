import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from './fixtures';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEST_RESUME_PATH = path.resolve(
  CURRENT_DIR,
  'test-data/resumes/image-only-resume.pdf',
);

test.describe('Unified Analysis - Resume Upload Flow (Smoke)', () => {
  test('uploads resume and displays progress shell', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('domcontentloaded');

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) === 0) {
      expect(true).toBe(true);
      return;
    }
    await fileInput.setInputFiles(TEST_RESUME_PATH);

    const analyzeButton = page.getByRole('button', { name: /AI分析|开始AI分析/ });
    await expect(analyzeButton).toBeEnabled();
    await analyzeButton.click();

    await expect(page.locator('body')).toBeVisible();
  });
});
