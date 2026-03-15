import { test, expect } from '@playwright/test';

test.describe('Homepage Visual', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
    });
  });

  test('homepage header matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('header, [data-testid="header"]')
      .first()
      .waitFor({ state: 'visible' });
    const header = page.locator('header, [data-testid="header"]').first();
    await expect(header).toHaveScreenshot('homepage-header.png');
  });

  test('homepage hero section matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('main, .hero, [data-testid="hero"]')
      .first()
      .waitFor({ state: 'visible' });
    const hero = page.locator('main, .hero, [data-testid="hero"]').first();
    await expect(hero).toHaveScreenshot('homepage-hero.png');
  });

  test('homepage footer matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('footer, [data-testid="footer"]')
      .first()
      .waitFor({ state: 'visible' });
    const footer = page.locator('footer, [data-testid="footer"]').first();
    await expect(footer).toHaveScreenshot('homepage-footer.png');
  });
});
