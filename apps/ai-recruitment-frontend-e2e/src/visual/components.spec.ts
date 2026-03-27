import { test, expect } from '@playwright/test';
import { setupVisualTest, waitForAngularStable } from './visual-helpers';

test.describe('Component Visual', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
  });

  test('job table matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForAngularStable(page);
    // Wait for jobs-grid to be visible (it's rendered after loading completes)
    const jobGrid = page.locator('[data-testid="jobs-grid"]');
    await jobGrid.waitFor({ state: 'visible', timeout: 15000 });
    await expect(jobGrid).toHaveScreenshot('job-grid.png', {
      timeout: 15000,
    });
  });

  test('resume upload area matches snapshot', async ({ page }) => {
    await page.goto('/resume');
    await waitForAngularStable(page);
    const uploadForm = page
      .locator('[data-testid="resume-upload-form"], .upload-form, form')
      .first();
    await uploadForm.waitFor({ state: 'visible', timeout: 15000 });
    await expect(uploadForm).toHaveScreenshot('resume-upload-form.png', {
      timeout: 15000,
    });
  });

  test('dashboard sidebar matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAngularStable(page);
    const sidebar = page
      .locator(
        '[data-testid="app-sidebar"], [data-testid="sidebar"], .app-navigation, nav',
      )
      .first();
    await sidebar.waitFor({ state: 'visible', timeout: 15000 });
    await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png', {
      timeout: 15000,
    });
  });

  test('create job button matches snapshot', async ({ page }) => {
    await page.goto('/jobs');
    await waitForAngularStable(page);
    const createButton = page
      .locator('[data-testid="create-job-button"]')
      .first();
    await createButton.waitFor({ state: 'visible', timeout: 15000 });
    await expect(createButton).toHaveScreenshot('create-job-button.png', {
      timeout: 15000,
    });
  });
});
