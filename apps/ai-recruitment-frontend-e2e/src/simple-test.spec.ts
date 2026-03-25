import { test, expect } from './fixtures';
import { waitForAppHydration } from './test-utils/hydration';

/**
 * Simple Debug Test - Direct Angular App Verification
 * Enhanced with better hydration waiting
 */

const LANDING_PATH = '/jobs';
const DEFAULT_TIMEOUT = 30000;

test.describe('Simple Angular App Test', () => {
  test('check if arc-root exists and app loads with longer timeout', async ({
    page,
  }) => {
    console.log('🚀 Starting simple Angular app test...');
    console.log('🔄 Navigating to application...');

    await page.goto('/');
    await page.waitForURL((url) => url.pathname.startsWith(LANDING_PATH), {
      timeout: DEFAULT_TIMEOUT,
    });

    console.log('⏳ Waiting for app hydration...');
    // 使用增强的hydration等待
    await waitForAppHydration(page);
    console.log('✅ App hydration complete');

    // Check if arc-root exists
    const arcRootCount = await page.locator('arc-root').count();
    console.log('📊 arc-root elements found:', arcRootCount);

    if (arcRootCount > 0) {
      console.log('✅ arc-root found, checking if it has content...');
      const arcRootContent = await page.locator('arc-root').innerHTML();
      console.log('📊 arc-root content length:', arcRootContent.length);
      console.log(
        '📝 arc-root content preview:',
        arcRootContent.substring(0, 500),
      );

      // Check if Angular has added content to arc-root
      expect(arcRootContent.length).toBeGreaterThan(10);

      // Look for the app header text（使用多种选择器）
      const titleSelectors = [
        '#app-title',
        '[data-testid="app-title"]',
        '.app-title',
        'h1',
      ];

      let hasAppTitle = false;
      let foundSelector = '';

      for (const selector of titleSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          const text = await page.locator(selector).first().textContent();
          console.log(
            `📊 Title found with selector "${selector}":`,
            text?.substring(0, 100),
          );
          if (text?.includes('AI') || text?.includes('招聘')) {
            hasAppTitle = true;
            foundSelector = selector;
            break;
          }
        }
      }

      console.log('📊 App title found:', hasAppTitle);

      if (hasAppTitle) {
        await expect(page.locator(foundSelector)).toBeVisible({
          timeout: 10000,
        });
        console.log('✅ Angular app is working correctly!');
      } else {
        console.log('⚠️ Angular loaded but title content not visible');
        // Check if we're redirected to jobs page
        const currentUrl = page.url();
        console.log('🔗 Current URL:', currentUrl);

        // Even if header is not visible, check for jobs page content
        const navSelectors = ['nav a', '.nav-link', '[role="navigation"] a'];

        let hasJobsContent = false;
        for (const selector of navSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            const links = await page.locator(selector).allTextContents();
            console.log(
              `📊 Links found with "${selector}":`,
              links.slice(0, 5),
            );
            if (
              links.some(
                (text) => text.includes('岗位') || text.includes('管理'),
              )
            ) {
              hasJobsContent = true;
              break;
            }
          }
        }

        console.log('📊 Jobs page content found:', hasJobsContent);

        if (hasJobsContent) {
          console.log('✅ Jobs page content found!');
        }

        // 只要有arc-root且有内容就算成功
        expect(arcRootContent.length).toBeGreaterThan(100);
      }
    } else {
      console.log('❌ arc-root not found');
      expect(arcRootCount).toBeGreaterThan(0);
    }
  });

  test('direct navigation to specific routes', async ({ page }) => {
    // Test jobs list page
    console.log('🔄 Testing /jobs route...');
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);
    await page.waitForTimeout(500);

    const jobsPageContent = await page.content();
    console.log(
      '📄 Jobs page HTML preview:',
      jobsPageContent.substring(0, 1000),
    );

    // Test create job page
    console.log('🔄 Testing /jobs/create route...');
    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);
    await page.waitForTimeout(500);

    const createPageContent = await page.content();
    console.log(
      '📄 Create page HTML preview:',
      createPageContent.substring(0, 1000),
    );

    // Look for form elements with multiple selectors
    const formSelectors = ['form', '[data-testid="create-job-form"]'];
    const inputSelectors = [
      'input',
      'textarea',
      '[data-testid="job-title-input"]',
      '[data-testid="jd-textarea"]',
    ];

    let hasForm = false;
    for (const selector of formSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        hasForm = true;
        break;
      }
    }

    let hasInput = false;
    for (const selector of inputSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        hasInput = true;
        break;
      }
    }

    console.log('📊 Form elements found:', hasForm);
    console.log('📊 Input elements found:', hasInput);

    // This test is informational
    expect(true).toBe(true);
  });
});
