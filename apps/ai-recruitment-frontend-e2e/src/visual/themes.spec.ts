import { test, expect } from '@playwright/test';

test.describe('Theme Visual', () => {
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

  test('dark theme homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Try to toggle dark theme
    const themeToggle = page
      .locator(
        '[data-testid="theme-toggle"], [data-testid="dark-mode-toggle"], [data-testid="theme-switch"]',
      )
      .first();
    if (await themeToggle.isVisible().catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    } else {
      // If no toggle found, simulate dark mode via localStorage or class
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });
    }

    // Wait for images to load
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500); // Wait for theme transition
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('dark theme dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('light theme dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    });

    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-light.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
