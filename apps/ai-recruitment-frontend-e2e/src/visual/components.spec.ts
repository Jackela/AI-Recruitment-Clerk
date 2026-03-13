import { test, expect } from '@playwright/test';

test.describe('Component Visual', () => {
  test('job table matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="job-table"], table, .job-table', {
      state: 'visible',
      timeout: 10000,
    });
    const table = await page
      .locator('[data-testid="job-table"], table, .job-table')
      .first();
    await expect(table).toHaveScreenshot('job-table.png');
  });

  test('resume upload area matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await page.waitForSelector(
      '[data-testid="upload-area"], [data-testid="resume-upload"], .upload-area',
      { state: 'visible', timeout: 10000 },
    );
    const uploadArea = await page
      .locator(
        '[data-testid="upload-area"], [data-testid="resume-upload"], .upload-area',
      )
      .first();
    await expect(uploadArea).toHaveScreenshot('resume-upload-area.png');
  });

  test('dashboard sidebar matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="sidebar"], .sidebar, nav', {
      state: 'visible',
      timeout: 10000,
    });
    const sidebar = await page
      .locator('[data-testid="sidebar"], .sidebar, nav')
      .first();
    await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png');
  });

  test('search input matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector(
      '[data-testid="search-input"], input[type="search"], .search-input',
      { state: 'visible', timeout: 10000 },
    );
    const searchInput = await page
      .locator(
        '[data-testid="search-input"], input[type="search"], .search-input',
      )
      .first();
    await expect(searchInput).toHaveScreenshot('search-input.png');
  });
});
