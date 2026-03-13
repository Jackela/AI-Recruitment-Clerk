import { test, expect } from '@playwright/test';

test.describe('Critical Pages Visual', () => {
  test('jobs page matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('jobs-page.png', {
      fullPage: true,
    });
  });

  test('dashboard page matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard-page.png', {
      fullPage: true,
    });
  });

  test('resume page matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('resume-page.png', {
      fullPage: true,
    });
  });

  test('analysis page matches snapshot', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('analysis-page.png', {
      fullPage: true,
    });
  });
});
