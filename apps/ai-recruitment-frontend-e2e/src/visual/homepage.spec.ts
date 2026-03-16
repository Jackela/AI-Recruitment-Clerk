import { test, expect } from '@playwright/test';

test.describe('Homepage Visual', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations and transitions for consistent screenshots
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

  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded and stable
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    // Wait for any images to load
    await page.waitForFunction(() => {
      return Array.from(document.images).every((img) => img.complete);
    });
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('homepage header matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const header = page.locator('header, [data-testid="header"]').first();
    await header.waitFor({ state: 'visible', timeout: 10000 });
    // Wait for element to be stable (no animations)
    await page.waitForTimeout(500);
    await expect(header).toHaveScreenshot('homepage-header.png', {
      timeout: 15000,
    });
  });

  test('homepage hero section matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hero = page.locator('main, .hero, [data-testid="hero"]').first();
    await hero.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(hero).toHaveScreenshot('homepage-hero.png', {
      timeout: 15000,
    });
  });

  test('homepage footer matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const footer = page.locator('footer, [data-testid="footer"]').first();
    await footer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(footer).toHaveScreenshot('homepage-footer.png', {
      timeout: 15000,
    });
  });
});
