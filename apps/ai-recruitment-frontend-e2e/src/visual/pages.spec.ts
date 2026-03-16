import { test, expect } from '@playwright/test';

test.describe('Critical Pages Visual', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `,
    });
  });

  test('jobs page matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('jobs-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('dashboard page matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('resume page matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('resume-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('analysis page matches snapshot', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('analysis-page.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
