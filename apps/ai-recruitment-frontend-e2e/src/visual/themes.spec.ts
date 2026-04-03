import { test, expect } from '@playwright/test';
import { setupVisualTest, setTheme } from './visual-helpers';

test.describe('Theme Visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page, { theme: 'light' });
  });

  test('dark theme homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'dark');
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('dark theme dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await setTheme(page, 'dark');
    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('light theme dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await setTheme(page, 'light');
    await expect(page).toHaveScreenshot('dashboard-light.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
