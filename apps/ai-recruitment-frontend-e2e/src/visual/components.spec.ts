import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForPageStability } from './visual-helpers';

test.describe('Component Visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('job table matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForPageStability(page);
    // Use full page screenshot like pages.spec.ts for reliability
    await expect(page).toHaveScreenshot('job-grid.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('resume upload area matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await waitForPageStability(page);
    const uploadForm = page
      .locator('[data-testid="resume-upload-form"], .upload-form, form')
      .first();
    await expect(uploadForm).toHaveScreenshot('resume-upload-form.png', {
      timeout: 15000,
    });
  });

  test('dashboard sidebar matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageStability(page);
    const sidebar = page
      .locator(
        '[data-testid="app-sidebar"], [data-testid="sidebar"], .app-navigation, nav',
      )
      .first();
    await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png', {
      timeout: 15000,
    });
  });

  test('create job button matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForPageStability(page);
    const createButton = page
      .locator('[data-testid="create-job-button"]')
      .first();
    await expect(createButton).toHaveScreenshot('create-job-button.png', {
      timeout: 15000,
    });
  });
});
