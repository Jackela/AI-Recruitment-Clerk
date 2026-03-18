import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForPageStability } from './visual-helpers';

test.describe('Homepage Visual', () => {
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
    const header = page.locator('header, [data-testid="header"]').first();
    await header.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(header).toHaveScreenshot('homepage-header.png', {
      timeout: 15000,
    });
  });

  test('homepage hero section matches snapshot', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('main, .hero, [data-testid="hero"]').first();
    await hero.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(hero).toHaveScreenshot('homepage-hero.png', {
      timeout: 15000,
    });
  });

  test('homepage footer matches snapshot', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer, [data-testid="footer"]').first();
    await footer.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(footer).toHaveScreenshot('homepage-footer.png', {
      timeout: 15000,
    });
  });
});
