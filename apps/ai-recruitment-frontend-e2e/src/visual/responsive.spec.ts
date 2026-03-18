import { test, expect } from '@playwright/test';
import { setupVisualTest, setViewportWithDeviceScale } from './visual-helpers';

test.describe('Responsive Visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('mobile viewport homepage matches snapshot', async ({ page }) => {
    await setViewportWithDeviceScale(page, 375, 667);
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('tablet viewport homepage matches snapshot', async ({ page }) => {
    await setViewportWithDeviceScale(page, 768, 1024);
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('mobile viewport jobs page matches snapshot', async ({ page }) => {
    await setViewportWithDeviceScale(page, 375, 667);
    await page.goto('/jobs');
    await expect(page).toHaveScreenshot('jobs-mobile.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('desktop viewport dashboard matches snapshot', async ({ page }) => {
    await setViewportWithDeviceScale(page, 1920, 1080);
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
