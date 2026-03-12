import { test, expect } from './fixtures';
import { JobsPage } from './pages';
import { setupErrorCollection } from './utils';

/**
 * Simple Jobs Page Test - Refactored to use Page Object Model
 * No API calls, just check rendering
 */

test.describe('Simple Jobs Page Test', () => {
  test('Check jobs page without any API calls', async ({ page }) => {
    console.log('🔍 Testing jobs page without API mocking...');

    // Setup error collection
    const errors = setupErrorCollection(page);

    // Initialize page object
    const jobsPage = new JobsPage(page);

    // Navigate using Page Object
    await jobsPage.navigateTo();
    await page.waitForLoadState('networkidle');

    // Use Page Object methods for verification
    const isContainerVisible = await jobsPage.isContainerVisible();
    console.log('📦 Container visible:', isContainerVisible);

    // Check page title
    const pageTitle = await jobsPage.getPageTitle();
    console.log('🏷️ Page title:', pageTitle);

    // Check job-related elements using Page Object
    const jobCount = await jobsPage.getJobCount();
    const isEmptyStateVisible = await jobsPage.isEmptyStateVisible();
    const isLoadingStateVisible = await jobsPage.isLoadingStateVisible();

    console.log('📊 Jobs grid data:');
    console.log('  - Job cards found:', jobCount);
    console.log('  - Empty state visible:', isEmptyStateVisible);
    console.log('  - Loading state visible:', isLoadingStateVisible);

    // Report errors
    console.log('💥 Console errors count:', errors.consoleErrors.length);
    console.log('🔥 Page errors count:', errors.pageErrors.length);

    if (errors.consoleErrors.length > 0) {
      console.log('📋 Console errors:', errors.consoleErrors);
    }

    if (errors.pageErrors.length > 0) {
      console.log('📋 Page errors:', errors.pageErrors);
    }

    // Verify using Page Object methods
    expect(await jobsPage.isContainerVisible()).toBe(true);
  });

  test('create job page works correctly', async ({ page }) => {
    console.log('🔍 Testing create job page...');

    // Initialize page object
    const jobsPage = new JobsPage(page);

    // Navigate to create job page using Page Object
    await jobsPage.navigateToCreateJob();
    await page.waitForLoadState('networkidle');

    // Verify form elements using Page Object methods
    const formElements = await Promise.all([
      page.getByTestId('job-title-input').count(),
      page.getByTestId('jd-textarea').count(),
      page.getByTestId('submit-button').count(),
    ]);

    console.log('📝 Form elements found:');
    console.log('  - Job title input:', formElements[0]);
    console.log('  - JD textarea:', formElements[1]);
    console.log('  - Submit button:', formElements[2]);

    // Assertions
    expect(formElements[0]).toBeGreaterThan(0);
    expect(formElements[1]).toBeGreaterThan(0);
    expect(formElements[2]).toBeGreaterThan(0);
  });
});
