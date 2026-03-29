import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForPageStability } from './visual-helpers';

test.describe('Component Visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('job table matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForPageStability(page);
    // Full page screenshot for reliability
    await expect(page).toHaveScreenshot('job-grid.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('resume upload area matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await waitForPageStability(page);
    // Full page screenshot for reliability with Angular lazy loading
    await expect(page).toHaveScreenshot('resume-upload-form.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('dashboard sidebar matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageStability(page);
    // Full page screenshot for reliability with Angular lazy loading
    await expect(page).toHaveScreenshot('dashboard-sidebar.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('create job button matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForPageStability(page);
    // Full page screenshot for reliability with Angular lazy loading
    await expect(page).toHaveScreenshot('create-job-button.png', {
      fullPage: true,
      timeout: 15000,
    });
  });
});
