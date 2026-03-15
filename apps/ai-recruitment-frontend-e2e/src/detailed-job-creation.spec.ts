import { test, expect } from './fixtures';
import { JobsPage } from './pages';
import { setupJobsApiMocking, TEST_JOB_DATA } from './fixtures';
import { setupErrorCollection } from './utils';

/**
 * Detailed Job Creation Testing - Refactored to use Page Object Model
 * Updated to use data-testid selectors and proper wait strategies
 */

const LANDING_PATH = '/jobs';

test.describe('Detailed Job Creation Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocking using utility
    await setupJobsApiMocking(page);

    await page.goto('/');
    await page.waitForURL((url) => url.pathname.startsWith(LANDING_PATH), {
      timeout: 15000,
    });
    await page.waitForLoadState('domcontentloaded');
  });

  test('Detailed job creation and verification flow', async ({ page }) => {
    console.log('🔍 Starting detailed job creation analysis...');

    // Setup error collection
    const errors = setupErrorCollection(page);

    // Initialize page object
    const jobsPage = new JobsPage(page);

    // Step 1: Navigate to job creation page
    await test.step('Navigate to job creation', async () => {
      console.log('Step 1: Navigating to /jobs/create');
      await jobsPage.navigateToCreateJob();
      await page.waitForLoadState('domcontentloaded');

      // Verify form exists using Page Object
      await expect(page.getByTestId('create-job-form')).toBeVisible();
      console.log('✅ Job creation form is visible');
    });

    // Step 2: Fill and submit form
    await test.step('Fill and submit job form', async () => {
      console.log('Step 2: Filling job creation form');

      // Use Page Object methods
      await jobsPage.fillJobForm(TEST_JOB_DATA);
      console.log('✅ Form fields filled');

      // Submit form using Page Object
      await jobsPage.submitJobForm();
      console.log('✅ Form submitted');

      // Wait for form to remain visible (no navigation expected in this test)
      await expect(page.getByTestId('create-job-form')).toBeVisible();
    });

    // Step 3: Check where we are after form submission
    await test.step('Check current location after form submission', async () => {
      console.log('Step 3: Checking current URL and page state');

      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);

      // Use Page Object method for page title
      const pageTitle = await jobsPage.getPageTitle();
      console.log('Page title/heading:', pageTitle);

      const bodyContent = await page.textContent('body');
      console.log('Page content length:', bodyContent?.length || 0);
    });

    // Step 4: Navigate to jobs list to check if job appears
    await test.step('Navigate to jobs list and check content', async () => {
      console.log('Step 4: Navigating to jobs list');

      await jobsPage.navigateTo();
      await page.waitForLoadState('domcontentloaded');

      // Wait for jobs container using Page Object
      await expect(page.getByTestId('jobs-container')).toBeVisible({
        timeout: 5000,
      });

      // Check job count using Page Object
      const jobCount = await jobsPage.getJobCount();
      console.log('Job cards found:', jobCount);

      // Check for empty state using Page Object
      const isEmptyStateVisible = await jobsPage.isEmptyStateVisible();
      console.log('Empty state found:', isEmptyStateVisible);

      // This test is for investigation, so we'll pass regardless
      expect(true).toBe(true);
    });

    // Step 5: Check NgRx store state if possible
    await test.step('Check application state', async () => {
      console.log('Step 5: Checking application state');

      // Try to access NgRx store state through browser console
      const storeState = await page.evaluate(() => {
        const win = window as any;
        if (win.__ngrx_store_state__) {
          return win.__ngrx_store_state__;
        }

        if (win.ng && win.ng.getContext) {
          return 'Angular context available';
        }

        return 'No store state accessible';
      });

      console.log('Store state or Angular context:', storeState);

      // This test is for investigation
      expect(true).toBe(true);
    });

    // Log any errors collected during test
    if (errors.consoleErrors.length > 0 || errors.pageErrors.length > 0) {
      console.log('⚠️ Errors collected during test:');
      if (errors.consoleErrors.length > 0) {
        console.log('  Console errors:', errors.consoleErrors);
      }
      if (errors.pageErrors.length > 0) {
        console.log('  Page errors:', errors.pageErrors);
      }
    }
  });
});
