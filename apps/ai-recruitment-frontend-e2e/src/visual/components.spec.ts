import { test, expect } from '@playwright/test';

test.describe('Component Visual', () => {
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

  test('job table matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    const table = page
      .locator('[data-testid="job-table"], table, .job-table')
      .first();
    await table.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(table).toHaveScreenshot('job-table.png', {
      timeout: 15000,
    });
  });

  test('resume upload area matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await page.waitForLoadState('domcontentloaded');
    const uploadArea = page
      .locator(
        '[data-testid="upload-area"], [data-testid="resume-upload"], .upload-area',
      )
      .first();
    await uploadArea.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(uploadArea).toHaveScreenshot('resume-upload-area.png', {
      timeout: 15000,
    });
  });

  test('dashboard sidebar matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const sidebar = page
      .locator('[data-testid="sidebar"], .sidebar, nav')
      .first();
    await sidebar.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png', {
      timeout: 15000,
    });
  });

  test('search input matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    const searchInput = page
      .locator(
        '[data-testid="search-input"], input[type="search"], .search-input',
      )
      .first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveScreenshot('search-input.png', {
      timeout: 15000,
    });
  });
});
