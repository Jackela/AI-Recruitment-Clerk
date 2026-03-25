import { test, expect } from './fixtures';
import { JobsPage, DashboardPage } from './pages';
import { setupJobsApiMocking, TEST_JOB_DATA } from './fixtures';
import { gotoAndWait, setupErrorCollection } from './utils';
import { waitForAppHydration } from './test-utils/hydration';

/**
 * Core User Flow - Job Creation to Report Viewing
 * Refactored to use Page Object Model with improved waiting strategies
 */

const BASE_URL = '/';
const LANDING_PATH = '/jobs';
const DEFAULT_TIMEOUT = 30000;

test.describe('Core User Flow - Job Creation to Report Viewing', () => {
  test('Complete job creation happy path (frontend only)', async ({ page }) => {
    // Setup error collection
    const errors = setupErrorCollection(page);

    // Setup API mocking
    await setupJobsApiMocking(page);

    // Initialize page objects
    const jobsPage = new JobsPage(page);
    const dashboardPage = new DashboardPage(page);

    // Navigate to landing page with proper hydration
    await gotoAndWait(page, BASE_URL, { waitForNetworkIdle: true });
    await page.waitForURL(
      (location) => location.pathname.startsWith(LANDING_PATH),
      {
        timeout: DEFAULT_TIMEOUT,
      },
    );

    // 确保应用完全加载
    await waitForAppHydration(page);
    await jobsPage.waitForPageLoad();

    // Navigate to job creation
    await jobsPage.navigateToCreateJob();

    // Fill and submit form
    await jobsPage.fillJobForm(TEST_JOB_DATA);
    await jobsPage.submitJobForm();

    // Form should still be visible after submission (based on app behavior)
    await expect(page.getByTestId('create-job-form')).toBeVisible({
      timeout: 10000,
    });

    // Navigate to reports
    await dashboardPage.navigateToReports();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout when navigating to reports');
    });
    await expect(page).toHaveURL(/\/reports/);

    // Navigate back to home
    await gotoAndWait(page, BASE_URL, { waitForNetworkIdle: true });
    await page.waitForURL(
      (location) => location.pathname.startsWith(LANDING_PATH),
      {
        timeout: DEFAULT_TIMEOUT,
      },
    );
    await waitForAppHydration(page);
    await jobsPage.waitForPageLoad();

    // Log any errors
    logErrors(errors);
  });

  test('Quick smoke test - navigation essentials', async ({ page }) => {
    const jobsPage = new JobsPage(page);
    const dashboardPage = new DashboardPage(page);

    // Test landing page
    await gotoAndWait(page, BASE_URL, { waitForNetworkIdle: true });
    await page.waitForURL(
      (location) => location.pathname.startsWith(LANDING_PATH),
      {
        timeout: DEFAULT_TIMEOUT,
      },
    );
    await waitForAppHydration(page);
    await jobsPage.waitForPageLoad();

    // Test job creation page navigation
    await jobsPage.navigateToCreateJob();
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout when navigating to create job');
    });

    // Test reports page navigation
    await dashboardPage.navigateToReports();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout when navigating to reports');
    });
    await expect(page).toHaveURL(/\/reports/);
  });

  test('Job creation form accessibility basics', async ({ page }) => {
    const jobsPage = new JobsPage(page);

    await gotoAndWait(page, `${BASE_URL}jobs/create`, {
      waitForNetworkIdle: true,
    });
    await waitForAppHydration(page);
    await jobsPage.waitForPageLoad();

    // Check form elements using Page Object
    const inputs = page.locator(
      '[data-testid="job-title-input"], [data-testid="jd-textarea"], input[formControlName], textarea[formControlName]',
    );

    // 等待至少有一些输入元素可见
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });

    const sampleCount = Math.min(await inputs.count(), 3);
    for (let i = 0; i < sampleCount; i++) {
      const hasLabel = await inputs.nth(i).evaluate((element) => {
        const id = element.id;
        const labelled =
          (id && document.querySelector(`label[for="${id}"]`)) ||
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby');
        return Boolean(labelled);
      });
      expect(hasLabel).toBe(true);
    }
  });
});

// Helper function to log errors
function logErrors(errors: {
  consoleErrors: string[];
  pageErrors: string[];
}): void {
  if (errors.consoleErrors.length > 0) {
    console.log('💥 Console errors:', errors.consoleErrors);
  }
  if (errors.pageErrors.length > 0) {
    console.log('🔥 Page errors:', errors.pageErrors);
  }
}
