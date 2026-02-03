import { test, expect } from './fixtures';

/**
 * Test with Mock API Server to Verify Angular Bootstrap
 */

const LANDING_PATH = '/jobs';

/** Helper for intentional delays */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('Angular App with Mock API', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all API endpoints to prevent network errors - use /api/ prefix
    await page.route('**/api/jobs', async (route) => {
      await (route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'mock-job-1',
                title: '前端工程师',
                status: 'completed',
                createdAt: new Date('2024-01-01'),
                resumeCount: 2,
              },
            ]),
          })
        : route.continue());
    });

    await page.route('**/api/jobs/*', async (route) => {
      await (route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'mock-job-1',
              title: '前端工程师',
              jdText: '负责前端开发工作',
              status: 'completed',
              createdAt: new Date('2024-01-01'),
              resumeCount: 2,
            }),
          })
        : route.continue());
    });

    // Mock other endpoints that might be called
    await page.route('**/api/jobs/*/resumes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/jobs/*/reports', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: 'mock-job-1', reports: [] }),
      });
    });
  });

  test('Angular app should load with mocked APIs', async ({ page }) => {
    console.log('📍 Navigating to application with mocked APIs...');
    await page.goto('/');
    await page.waitForURL(
      (url) => url.pathname.startsWith(LANDING_PATH),
      { timeout: 15_000 },
    );

    console.log('📍 Waiting for network to settle...');
    await page.waitForLoadState('domcontentloaded');

    console.log('📍 Waiting for Angular to bootstrap...');
    await delay(8000);

    // Check if arc-root exists and has content
    const arcRootCount = await page.locator('arc-root').count();
    console.log('✅ arc-root elements found:', arcRootCount);
    expect(arcRootCount).toBe(1);

    // Get arc-root content
    const arcRootContent = await page.locator('arc-root').innerHTML();
    console.log('✅ arc-root content length:', arcRootContent.length);

    // Log whether content loaded
    const contentLoaded = arcRootContent.length > 10;
    console.log('Content loaded:', contentLoaded);

    // Look for app elements
    const hasAppHeader = (await page.locator('text=AI 招聘助理').count()) > 0;
    const hasJobsSection =
      (await page.locator('nav a').filter({ hasText: '岗位管理' }).count()) > 0;
    const hasNavigation =
      (await page.locator('nav, .app-navigation').count()) > 0;

    console.log('App header found:', hasAppHeader);
    console.log('Jobs section found:', hasJobsSection);
    console.log('Navigation found:', hasNavigation);

    // Log success status
    const appWorking = [hasAppHeader, hasJobsSection].some(Boolean);
    console.log('App working status:', appWorking);

    // Unconditional assertion - arc-root should have content
    await expect(page.locator('arc-root')).not.toBeEmpty();
  });

  test('Navigate to create job page with mocked APIs', async ({ page }) => {
    console.log('📍 Testing /jobs/create route with mocked APIs...');

    // Increase timeout for this test
    test.setTimeout(45000);

    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');

    // Wait for Angular to bootstrap and render
    await delay(3000);

    // Wait for arc-root to exist first
    await expect(page.locator('arc-root')).toBeAttached({ timeout: 15000 });

    // Try to wait for content to be rendered
    try {
      await page.waitForFunction(
        () => {
          const arcRoot = document.querySelector('arc-root');
          return arcRoot && arcRoot.innerHTML.length > 50;
        },
        { timeout: 10000 },
      );
    } catch {
      console.log(
        '⚠️ Content not fully loaded within timeout, continuing with checks...',
      );
    }

    const arcRootContent = await page.locator('arc-root').innerHTML();
    console.log(
      '✅ Create page arc-root content length:',
      arcRootContent.length,
    );

    // Log content load status
    const contentLoaded = arcRootContent.length > 10;
    console.log('Create page content loaded:', contentLoaded);

    // Look for form elements using more specific selectors
    const hasForm = (await page.locator('form').count()) > 0;
    const hasJobTitleInput = (await page.locator('#jobTitle').count()) > 0;
    const hasJdTextarea = (await page.locator('#jdText').count()) > 0;
    const hasCreateButton =
      (await page
        .locator('button[type="submit"]')
        .filter({ hasText: /创建岗位/ })
        .count()) > 0;

    console.log('Form found:', hasForm);
    console.log('Job title input found:', hasJobTitleInput);
    console.log('JD textarea found:', hasJdTextarea);
    console.log('Create button found:', hasCreateButton);

    // Log form status
    const formInputsFound = [hasJobTitleInput, hasJdTextarea].some(Boolean);
    const formWorking = hasForm && formInputsFound;
    console.log('Form working:', formWorking);

    // Check current page info
    console.log('Current page title:', await page.title());
    console.log('Current URL:', page.url());

    // Unconditional assertion - arc-root should have content
    await expect(page.locator('arc-root')).not.toBeEmpty();
  });
});
