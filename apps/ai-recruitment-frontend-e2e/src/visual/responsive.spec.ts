import { test, expect } from '@playwright/test';

test.describe('Responsive Visual', () => {
  test('mobile viewport homepage matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('tablet viewport homepage matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
    });
  });

  test('mobile viewport jobs page matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('jobs-mobile.png', {
      fullPage: true,
    });
  });

  test('desktop viewport dashboard matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
    });
  });
});
