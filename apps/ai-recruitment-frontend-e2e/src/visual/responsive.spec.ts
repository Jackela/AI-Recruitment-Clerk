import { test, expect } from '@playwright/test';

test.describe('Responsive Visual', () => {
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

  test('mobile viewport homepage matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('tablet viewport homepage matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('mobile viewport jobs page matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('jobs-mobile.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('desktop viewport dashboard matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
