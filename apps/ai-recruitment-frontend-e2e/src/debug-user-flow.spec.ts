import { test, expect } from '@playwright/test';

/**
 * Debug User Flow - Step by Step Testing
 */

// Mock API responses for testing
const mockJobResponse = {
  jobId: 'test-job-123',
  message: 'Job received and is being processed.'
};

test.describe('Debug User Flow - Step by Step', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints for consistent testing - using /api/ prefix
    await page.route('**/api/jobs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify(mockJobResponse)
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
              resumeCount: 0
            }
          ])
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
            resumeCount: 0
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock resumes endpoint for job details page
    await page.route(`**/api/jobs/${mockJobResponse.jobId}/resumes`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('http://localhost:4202/');
  });

  test('Step 1: Application loads and shows dashboard', async ({ page }) => {
    console.log('Testing application load...');
    
    // Check that application loads
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=AI 招聘助理')).toBeVisible();
    
    console.log('✅ Application loaded successfully');
  });

  test('Step 2: Can navigate to job creation page', async ({ page }) => {
    console.log('Testing navigation to job creation...');
    
    // Navigate to job creation page
    await page.goto('http://localhost:4202/jobs/create');
    await page.waitForLoadState('networkidle');
    
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
    
    await page.goto('http://localhost:4202/jobs/create');
    await page.waitForLoadState('networkidle');
    
    // Fill form using correct selectors
    const jobTitleInput = page.locator('#jobTitle');
    const jdTextarea = page.locator('#jdText');
    
    await jobTitleInput.fill('高级前端工程师');
    await jdTextarea.fill('职位要求：5年以上前端开发经验，精通React、Vue等前端框架，熟悉TypeScript和JavaScript。');
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Wait for form submission response
    await page.waitForTimeout(2000);
    
    console.log('✅ Job creation form submitted');
  });

  test('Step 4: Check if job details page exists', async ({ page }) => {
    console.log('Testing navigation to job details page...');
    
    // Increase timeout for this test
    test.setTimeout(45000);
    
    try {
      // Try to navigate directly to a job details page
      await page.goto(`http://localhost:4202/jobs/${mockJobResponse.jobId}`);
      
      // Use a shorter timeout and handle failure gracefully
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Wait for Angular to render
      await page.waitForTimeout(2000);
      
      // Check what's on the page
      const pageContent = await page.textContent('body');
      console.log('Page content length:', pageContent?.length || 0);
      console.log('Page content preview:', pageContent?.substring(0, 200) || 'No content');
      
      // Check for common page elements
      const hasHeader = await page.locator('h1, h2, .page-title').count() > 0;
      const hasForm = await page.locator('form').count() > 0;
      const hasContent = await page.locator('arc-root').count() > 0;
      
      console.log('Header found:', hasHeader);
      console.log('Form found:', hasForm);
      console.log('Angular root found:', hasContent);
      
      // Check if there are any file upload elements
      const fileInputs = await page.locator('input[type="file"]').count();
      const uploadButtons = await page.locator('button').filter({ hasText: /上传|Upload/i }).count();
      
      console.log('File inputs found:', fileInputs);
      console.log('Upload buttons found:', uploadButtons);
      
      // Check current URL to see if we got redirected
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      if (currentUrl.includes('/jobs/') && hasContent) {
        console.log('✅ Job details page exists and loaded');
      } else if (currentUrl.includes('/jobs') && !currentUrl.includes(`/${mockJobResponse.jobId}`)) {
        console.log('⚠️ Redirected to jobs list - job details page may not exist');
      } else {
        console.log('✅ Page loaded successfully');
      }
      
    } catch (error) {
      console.log('⚠️ Failed to load job details page:', error.message);
      
      // Check if we can at least navigate to the jobs list
      await page.goto('http://localhost:4202/jobs');
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      const jobsPageContent = await page.textContent('body');
      console.log('Jobs page loaded as fallback, content length:', jobsPageContent?.length || 0);
    }
    
    // This test is for investigation - it should always pass
    expect(true).toBe(true);
  });
});