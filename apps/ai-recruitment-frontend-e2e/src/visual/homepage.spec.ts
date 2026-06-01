import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForPageStability } from './visual-helpers';

test.describe('Homepage Visual @visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await waitForPageStability(page);
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('homepage header matches snapshot', async ({ page }) => {
    await page.goto('/');
    await waitForPageStability(page);
    // Full page screenshot for reliability with Angular lazy loading
    await expect(page).toHaveScreenshot('homepage-header.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('homepage hero section matches snapshot', async ({ page }) => {
    await page.goto('/');
    await waitForPageStability(page);
    // Full page screenshot for reliability with Angular lazy loading
    await expect(page).toHaveScreenshot('homepage-hero.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('homepage footer matches snapshot', async ({ page }) => {
    await page.goto('/');
    await waitForPageStability(page);
    // Full page screenshot for reliability with Angular lazy loading
    await expect(page).toHaveScreenshot('homepage-footer.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
