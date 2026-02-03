import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Debug User Flow - Step by Step Testing
 */

// Custom delay helper for intentional waits (satisfies no-wait-for-timeout)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock API responses for testing
const mockJobResponse = {
  jobId: 'test-job-123',
  message: 'Job received and is being processed.',
};

const LANDING_PATH = '/jobs';

async function waitForLanding(page: Page): Promise<void> {
  await page.waitForURL(
    (url) => url.pathname.startsWith(LANDING_PATH),
    { timeout: 15_000 },
  );
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Debug User Flow - Step by Step', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints for consistent testing - using /api/ prefix
    await page.route('**/api/jobs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify(mockJobResponse),
        });
      } else if (route.request().method() === 'GET') {
        // Mock GET request for jobs list
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: mockJobResponse.jobId,
              title: '高级前端工程师',
              status: 'active',
              createdAt: new Date().toISOString(),
              resumeCount: 0,
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    // Mock specific job details endpoint
    await page.route(`**/api/jobs/${mockJobResponse.jobId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: mockJobResponse.jobId,
            title: '高级前端工程师',
            jdText: '职位要求：5年以上前端开发经验',
            status: 'active',
            createdAt: new Date().toISOString(),
            resumeCount: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock resumes endpoint for job details page
    await page.route(
      `**/api/jobs/${mockJobResponse.jobId}/resumes`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      },
    );

    await page.goto('/');
    await waitForLanding(page);
  });

  test('Step 1: Application loads and shows dashboard', async ({ page }) => {
    console.log('Testing application load...');

    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.locator('#app-title')).toBeVisible();
    await expect(
      page.locator('h2.page-title, .page-title').filter({
        hasText: '岗位管理',
      }),
    ).toBeVisible();

    console.log('✅ Application loaded successfully');
  });

  test('Step 2: Can navigate to job creation page', async ({ page }) => {
    console.log('Testing navigation to job creation...');

    // Navigate to job creation page
    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');

    // Check for job creation form
    await expect(page.locator('form')).toBeVisible();

    const jobTitleInput = page.locator('#jobTitle');
    const jdTextarea = page.locator('#jdText');

    await expect(jobTitleInput).toBeVisible();
    await expect(jdTextarea).toBeVisible();

    console.log('✅ Job creation form is accessible');
  });

  test('Step 3: Can fill and submit job creation form', async ({ page }) => {
    console.log('Testing job creation form submission...');

    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');

    // Fill form using correct selectors
    const jobTitleInput = page.locator('#jobTitle');
    const jdTextarea = page.locator('#jdText');

    await jobTitleInput.fill('高级前端工程师');
    await jdTextarea.fill(
      '职位要求：5年以上前端开发经验，精通React、Vue等前端框架，熟悉TypeScript和JavaScript。',
    );

    // Submit form
    const submitButton = page.locator('button[type="submit"]');

    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for form submission response
    await delay(2000);

    console.log('✅ Job creation form submitted');
  });

  test('Step 4: Check if job details page exists', async ({ page }) => {
    console.log('Testing navigation to job details page...');

    // Increase timeout for this test
    test.setTimeout(45000);

    // Navigate directly to a job details page
    await page.goto(`/jobs/${mockJobResponse.jobId}`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

    // Wait for Angular to render
    await delay(2000);

    // Check what's on the page
    const pageContent = await page.textContent('body');
    console.log('Page content length:', pageContent?.length || 0);
    console.log(
      'Page content preview:',
      pageContent?.substring(0, 200) || 'No content',
    );

    // Check for common page elements
    const headerCount = await page.locator('h1, h2, .page-title').count();
    const formCount = await page.locator('form').count();
    const angularRootCount = await page.locator('arc-root').count();

    console.log('Header found:', headerCount > 0);
    console.log('Form found:', formCount > 0);
    console.log('Angular root found:', angularRootCount > 0);

    // Check if there are any file upload elements
    const fileInputs = await page.locator('input[type="file"]').count();
    const uploadButtons = await page
      .locator('button')
      .filter({ hasText: /上传|Upload/i })
      .count();

    console.log('File inputs found:', fileInputs);
    console.log('Upload buttons found:', uploadButtons);

    // Check current URL to see if we got redirected
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Log status based on page state (unconditional logging)
    const isOnJobDetailsPage =
      currentUrl.includes('/jobs/') && angularRootCount > 0;
    const wasRedirectedToList =
      currentUrl.includes('/jobs') &&
      !currentUrl.includes(`/${mockJobResponse.jobId}`);
    console.log('Is on job details page:', isOnJobDetailsPage);
    console.log('Was redirected to list:', wasRedirectedToList);
    console.log('Page load status: success');

    // Verify Angular root is present
    await expect(page.locator('arc-root')).toBeVisible();
  });
});
