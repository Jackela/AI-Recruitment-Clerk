import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForPageStability } from './visual-helpers';

test.describe('Critical Pages Visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('jobs page matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForPageStability(page);
    await expect(page).toHaveScreenshot('jobs-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('dashboard page matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageStability(page);
    await expect(page).toHaveScreenshot('dashboard-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('resume page matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await waitForPageStability(page);
    await expect(page).toHaveScreenshot('resume-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('analysis page matches snapshot', async ({ page }) => {
    await page.goto('/analysis');
    await waitForPageStability(page);
    await expect(page).toHaveScreenshot('analysis-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
