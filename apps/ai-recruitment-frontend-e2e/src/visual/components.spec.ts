import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForPageStability } from './visual-helpers';

test.describe('Component Visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('job table matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    const table = page
      .locator('[data-testid="job-table"], table, .job-table')
      .first();
    await table.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(table).toHaveScreenshot('job-table.png', {
      timeout: 15000,
    });
  });

  test('resume upload area matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    const uploadArea = page
      .locator(
        '[data-testid="upload-area"], [data-testid="resume-upload"], .upload-area',
      )
      .first();
    await uploadArea.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(uploadArea).toHaveScreenshot('resume-upload-area.png', {
      timeout: 15000,
    });
  });

  test('dashboard sidebar matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page
      .locator('[data-testid="sidebar"], .sidebar, nav')
      .first();
    await sidebar.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png', {
      timeout: 15000,
    });
  });

  test('search input matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    const searchInput = page
      .locator(
        '[data-testid="search-input"], input[type="search"], .search-input',
      )
      .first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await waitForPageStability(page);
    await expect(searchInput).toHaveScreenshot('search-input.png', {
      timeout: 15000,
    });
  });
});
