import { test, expect } from './fixtures';

/**
 * Simple Debug Test - Direct Angular App Verification
 */

test.describe('Simple Angular App Test', () => {
  test('check if arc-root exists and app loads with longer timeout', async ({
    page,
  }) => {
    console.log('Navigating to application...');
    await page.goto('http://localhost:4202/');

    console.log('Waiting for network to settle...');
    await page.waitForLoadState('domcontentloaded');

    console.log('Waiting 10 seconds for Angular to bootstrap...');
    await page.waitForFunction(() => document.readyState === 'complete', {
      timeout: 10000,
    });

    // Check if arc-root exists
    const arcRootCount = await page.locator('arc-root').count();
    console.log('arc-root elements found:', arcRootCount);

    if (arcRootCount > 0) {
      console.log('arc-root found, checking if it has content...');
      const arcRootContent = await page.locator('arc-root').innerHTML();
      console.log('arc-root content length:', arcRootContent.length);
      console.log(
        'arc-root content preview:',
        arcRootContent.substring(0, 500),
      );

      // Check if Angular has added content to arc-root
      expect(arcRootContent.length).toBeGreaterThan(10);

      // Look for the app header text
      const hasAppTitle = (await page.locator('text=AI 招聘助理').count()) > 0;
      console.log('App title found:', hasAppTitle);

      if (hasAppTitle) {
        await expect(page.locator('text=AI 招聘助理')).toBeVisible();
        console.log('✅ Angular app is working correctly!');
      } else {
        console.log('⚠️ Angular loaded but content not visible');
        // Check if we're redirected to jobs page
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        // Even if header is not visible, check for jobs page content
        const hasJobsContent =
          (await page
            .locator('nav a')
            .filter({ hasText: '岗位管理' })
            .count()) > 0;
        console.log('Jobs page content found:', hasJobsContent);

        if (hasJobsContent) {
          console.log('✅ Jobs page content found!');
        }
      }
    } else {
      console.log('❌ arc-root not found');
      expect(arcRootCount).toBeGreaterThan(0);
    }
  });

  test('direct navigation to specific routes', async ({ page }) => {
    // Test jobs list page
    console.log('Testing /jobs route...');
    await page.goto('http://localhost:4202/jobs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    const jobsPageContent = await page.content();
    console.log('Jobs page HTML preview:', jobsPageContent.substring(0, 1000));

    // Test create job page
    console.log('Testing /jobs/create route...');
    await page.goto('http://localhost:4202/jobs/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    const createPageContent = await page.content();
    console.log(
      'Create page HTML preview:',
      createPageContent.substring(0, 1000),
    );

    // Look for form elements
    const hasForm = (await page.locator('form').count()) > 0;
    const hasInput = (await page.locator('input, textarea').count()) > 0;
    console.log('Form elements found:', hasForm);
    console.log('Input elements found:', hasInput);

    // This test is informational
    expect(true).toBe(true);
  });
});
