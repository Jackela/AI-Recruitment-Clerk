import { test, expect } from './fixtures';
import { JobsPage } from './pages';
import { setupErrorCollection } from './utils';
import { waitForAppHydration } from './test-utils/hydration';

/**
 * Simple Jobs Page Test - Refactored to use Page Object Model
 * No API calls, just check rendering
 * Enhanced with better hydration waiting
 */

test.describe('Simple Jobs Page Test', () => {
  test.skip('Check jobs page without any API calls', async ({ page }) => {
    console.log('🔍 Testing jobs page without API mocking...');

    // Setup error collection
    const errors = setupErrorCollection(page);

    // Initialize page object
    const jobsPage = new JobsPage(page);

    // Navigate using Page Object
    await jobsPage.navigateTo();

    // 确保应用完全加载
    await waitForAppHydration(page);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout on jobs page');
    });

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

  test.skip('create job page works correctly', async ({ page }) => {
    console.log('🔍 Testing create job page...');

    // Initialize page object
    const jobsPage = new JobsPage(page);

    // Navigate to create job page using Page Object
    await jobsPage.navigateToCreateJob();

    // 确保应用完全加载
    await waitForAppHydration(page);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout on create page');
    });

    // Verify form elements using Page Object methods with proper waits
    // 使用多种选择器确保能找到元素
    const inputSelectors = [
      '[data-testid="job-title-input"]',
      'input[formControlName="jobTitle"]',
      'input#jobTitle',
    ];
    const textareaSelectors = [
      '[data-testid="jd-textarea"]',
      'textarea[formControlName="jdText"]',
      'textarea#jdText',
    ];
    const buttonSelectors = [
      '[data-testid="submit-button"]',
      'button[type="submit"]',
    ];

    // 找到并验证每个元素
    let jobTitleInputFound = false;
    for (const selector of inputSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        jobTitleInputFound = true;
        console.log(`✅ Job title input found with selector: ${selector}`);
        break;
      }
    }
    expect(jobTitleInputFound).toBe(true);

    let jdTextareaFound = false;
    for (const selector of textareaSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        jdTextareaFound = true;
        console.log(`✅ JD textarea found with selector: ${selector}`);
        break;
      }
    }
    expect(jdTextareaFound).toBe(true);

    let submitButtonFound = false;
    for (const selector of buttonSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        submitButtonFound = true;
        console.log(`✅ Submit button found with selector: ${selector}`);
        break;
      }
    }
    expect(submitButtonFound).toBe(true);

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
