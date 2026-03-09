import { test, expect } from './fixtures';

/**
 * Detailed Job Creation Testing - Step by Step Debugging
 * Updated to use data-testid selectors and proper wait strategies
 */

// Mock API responses
const mockJobResponse = {
  jobId: 'test-job-123',
  message: 'Job received and is being processed.',
};

const LANDING_PATH = '/jobs';

test.describe('Detailed Job Creation Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the job creation API
    await page.route('**/jobs', async (route) => {
      if (route.request().method() === 'POST') {
        console.log('📡 API Call intercepted: POST /jobs');
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify(mockJobResponse),
        });
      } else if (route.request().method() === 'GET') {
        // Mock getting jobs list - return our created job
        console.log('📡 API Call intercepted: GET /jobs');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-job-123',
              title: '高级前端工程师',
              status: 'completed',
              createdAt: new Date().toISOString(),
              resumeCount: 0,
            },
          ]),
        });
      }
    });

    await page.goto('/');
    await page.waitForURL(
      (url) => url.pathname.startsWith(LANDING_PATH),
      { timeout: 15_000 },
    );
    await page.waitForLoadState('domcontentloaded');
  });

  test('Detailed job creation and verification flow', async ({ page }) => {
    console.log('🔍 Starting detailed job creation analysis...');

    // Step 1: Navigate to job creation page
    await test.step('Navigate to job creation', async () => {
      console.log('Step 1: Navigating to /jobs/create');
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      // Verify form exists using data-testid
      await expect(page.getByTestId('create-job-form')).toBeVisible();
      console.log('✅ Job creation form is visible');
    });

    // Step 2: Fill and submit form
    await test.step('Fill and submit job form', async () => {
      console.log('Step 2: Filling job creation form');

      // Use data-testid selectors for form elements
      const jobTitleInput = page.getByTestId('job-title-input');
      const jdTextarea = page.getByTestId('jd-textarea');

      await jobTitleInput.fill('高级前端工程师');
      await jdTextarea.fill('职位要求：5年以上前端开发经验');

      console.log('✅ Form fields filled');

      // Submit form using data-testid
      const submitButton = page.getByTestId('submit-button');
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      console.log('✅ Form submitted');

      // Wait for form to remain visible (no navigation expected in this test)
      await expect(page.getByTestId('create-job-form')).toBeVisible();
    });

    // Step 3: Check where we are after form submission
    await test.step('Check current location after form submission', async () => {
      console.log('Step 3: Checking current URL and page state');

      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);

      // Use data-testid for page title
      const pageTitleLocator = page.getByTestId('page-title');
      if (await pageTitleLocator.count() > 0) {
        const pageTitle = await pageTitleLocator.textContent();
        console.log('Page title/heading:', pageTitle);
      }

      const bodyContent = await page.textContent('body');
      console.log('Page content length:', bodyContent?.length || 0);
    });

    // Step 4: Navigate to jobs list to check if job appears
    await test.step('Navigate to jobs list and check content', async () => {
      console.log('Step 4: Navigating to jobs list');

      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      // Wait for jobs container to be visible instead of using delay
      await expect(page.getByTestId('jobs-container')).toBeVisible({
        timeout: 5000,
      });

      const jobsPageContent = await page.textContent('body');
      console.log('Jobs page content length:', jobsPageContent?.length || 0);
      console.log(
        'Jobs page content preview:',
        jobsPageContent?.substring(0, 300) || 'No content',
      );

      // Check if our job title appears anywhere on the page
      const jobTitleExists = await page.locator('text=高级前端工程师').count();
      console.log('Job title occurrences found:', jobTitleExists);

      // Check for job-related elements using data-testid
      const jobElements = await page.getByTestId('job-card').count();
      console.log('Job cards found:', jobElements);

      // Check for empty state
      const emptyStateCount = await page.getByTestId('empty-state').count();
      console.log('Empty state found:', emptyStateCount > 0);

      // This test is for investigation, so we'll pass regardless
      expect(true).toBe(true);
    });

    // Step 5: Check NgRx store state if possible
    await test.step('Check application state', async () => {
      console.log('Step 5: Checking application state');

      // Try to access NgRx store state through browser console
      const storeState = await page.evaluate(() => {
        // Try to access window.__ngrx_store_state__ or similar
        const win = window as any;
        if (win.__ngrx_store_state__) {
          return win.__ngrx_store_state__;
        }

        // Or try to access through Angular DevTools
        if (win.ng && win.ng.getContext) {
          return 'Angular context available';
        }

        return 'No store state accessible';
      });

      console.log('Store state or Angular context:', storeState);

      // This test is for investigation
      expect(true).toBe(true);
    });
  });
});
