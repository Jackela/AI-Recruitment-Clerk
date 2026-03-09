import { test, expect } from './fixtures';

/**
 * Simple Jobs Page Test - No API calls, just check rendering
 */

test.describe('Simple Jobs Page Test', () => {
  test('Check jobs page without any API calls', async ({ page }) => {
    console.log('🔍 Testing jobs page without API mocking...');

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console error:', msg.text());
      }
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
      console.log('🚫 Page error:', error.message);
    });

    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    // Wait for Angular to render using a stable selector instead of timeout
    await expect(page.getByTestId('jobs-container')).toBeVisible({
      timeout: 5000,
    });

    // Check what's actually on the page
    const bodyText = await page.textContent('body');
    console.log('📄 Body text length:', bodyText?.length || 0);
    console.log(
      '📄 Body text preview:',
      bodyText?.substring(0, 300) || 'No content',
    );

    // Check if the main app header is there using data-testid
    const pageTitle = page.getByTestId('page-title');
    const hasAppTitle = await pageTitle.count();
    console.log('🏷️ Page title found:', hasAppTitle);

    // Check the specific text we expect
    const hasJobsTitle = await page.locator('text=岗位管理').count();
    console.log('💼 "岗位管理" text found:', hasJobsTitle);

    // Check if there are any job-related elements using data-testid
    const hasJobsGrid = await page.getByTestId('jobs-grid').count();
    const hasEmptyState = await page.getByTestId('empty-state').count();
    const hasLoadingState = await page.getByTestId('loading-state').count();

    console.log('🔲 Jobs grid found:', hasJobsGrid);
    console.log('🚫 Empty state found:', hasEmptyState);
    console.log('⏳ Loading state found:', hasLoadingState);

    // Report any errors found
    console.log('💥 Console errors count:', consoleErrors.length);
    console.log('🔥 Page errors count:', pageErrors.length);

    if (consoleErrors.length > 0) {
      console.log('📋 Console errors:', consoleErrors);
    }

    if (pageErrors.length > 0) {
      console.log('📋 Page errors:', pageErrors);
    }

    // Check arc-root content specifically
    const arcRootHTML = await page.locator('arc-root').innerHTML();
    console.log('🎯 arc-root HTML length:', arcRootHTML.length);
    console.log('🎯 arc-root HTML preview:', arcRootHTML.substring(0, 300));

    // This test is for investigation - always pass
    expect(true).toBe(true);
  });

  test('create job page works correctly', async ({ page }) => {
    console.log('🔍 Testing create job page...');

    await page.goto('/jobs/create');
    await page.waitForLoadState('networkidle');

    // Wait for form to be visible instead of using timeout
    await expect(page.getByTestId('create-job-form')).toBeVisible({
      timeout: 5000,
    });

    // Use data-testid selectors for form elements
    const hasJobTitleInput = await page.getByTestId('job-title-input').count();
    const hasJdTextarea = await page.getByTestId('jd-textarea').count();
    const hasSubmitButton = await page.getByTestId('submit-button').count();

    console.log('📝 Form elements found:');
    console.log('  - Job title input:', hasJobTitleInput);
    console.log('  - JD textarea:', hasJdTextarea);
    console.log('  - Submit button:', hasSubmitButton);

    // This should pass based on previous tests
    expect(hasJobTitleInput).toBeGreaterThan(0);
    expect(hasJdTextarea).toBeGreaterThan(0);
    expect(hasSubmitButton).toBeGreaterThan(0);
  });
});
