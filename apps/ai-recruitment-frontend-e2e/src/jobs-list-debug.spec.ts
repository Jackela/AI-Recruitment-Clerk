import { test, expect } from '@playwright/test';

/**
 * Jobs List Debug - Check if component renders correctly
 */

test.describe('Jobs List Component Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we have a proper base URL
    const baseURL = 'http://localhost:4202';
    
    // Set base URL if not already set
    if (!page.url() || page.url() === 'about:blank') {
      await page.goto(baseURL);
    }
    // Mock the jobs API with simple test data
    await page.route('**/api/jobs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-job-1',
              title: '测试岗位1',
              status: 'completed',
              createdAt: '2025-07-23T00:00:00.000Z',
              resumeCount: 5
            },
            {
              id: 'test-job-2', 
              title: '测试岗位2',
              status: 'processing',
              createdAt: '2025-07-22T00:00:00.000Z',
              resumeCount: 2
            }
          ])
        });
      }
    });
  });

  test('Check jobs list page structure and content', async ({ page }) => {
    console.log('🔍 Testing jobs list page structure...');
    
    await page.goto('http://localhost:4202/jobs');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential async loading
    await page.waitForTimeout(2000);
    
    // Check page structure
    console.log('=== PAGE STRUCTURE ===');
    
    // Use safer approach to check for page title elements
    const pageTitleElement = page.locator('h1, h2, .page-title').first();
    const pageTitle = await pageTitleElement.isVisible() ? await pageTitleElement.textContent() : 'No title found';
    console.log('Page title:', pageTitle);
    
    const hasJobsContainer = await page.locator('.jobs-list-container').count();
    console.log('Jobs container found:', hasJobsContainer);
    
    const hasJobsGrid = await page.locator('.jobs-grid').count();
    console.log('Jobs grid found:', hasJobsGrid);
    
    const hasJobCards = await page.locator('.job-card').count();
    console.log('Job cards found:', hasJobCards);
    
    // Check if loading state is shown
    const hasLoader = await page.locator('text=加载中').count();
    console.log('Loading indicator found:', hasLoader);
    
    // Check if error is shown
    const hasError = await page.locator('.alert-danger').count();
    console.log('Error message found:', hasError);
    
    // Check full page content
    const fullContent = await page.textContent('body');
    console.log('Full page content length:', fullContent?.length || 0);
    console.log('Full content preview (first 500 chars):', fullContent?.substring(0, 500) || 'No content');
    
    // Check if specific job titles appear
    const job1Found = await page.locator('text=测试岗位1').count();
    const job2Found = await page.locator('text=测试岗位2').count();
    console.log('Job 1 title found:', job1Found);
    console.log('Job 2 title found:', job2Found);
    
    // Check for specific UI elements that should be present
    const createButton = await page.locator('text=创建新岗位').count();
    const refreshButton = await page.locator('text=刷新').count();
    console.log('Create button found:', createButton);
    console.log('Refresh button found:', refreshButton);
    
    // Debug: Check what Angular has rendered
    const arcRootContent = await page.locator('arc-root').innerHTML();
    console.log('arc-root content length:', arcRootContent.length);
    console.log('arc-root content preview:', arcRootContent.substring(0, 200));
    
    // This test is for debugging - always pass
    expect(true).toBe(true);
  });

  test('Check if NgRx store receives data correctly', async ({ page }) => {
    console.log('🔍 Testing NgRx store data flow...');
    
    // Listen for network requests
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/jobs')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/jobs')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('http://localhost:4202/jobs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('API calls made:', apiCalls);
    
    // Try to access store state if possible
    const storeAccessible = await page.evaluate(() => {
      const win = window as any;
      // Check if we can access Angular's debug context
      try {
        const elements = document.querySelectorAll('*[ng-version]');
        return elements.length > 0 ? 'Angular elements found' : 'No Angular elements';
      } catch {
        return 'Cannot access Angular context';
      }
    });
    
    console.log('Angular context check:', storeAccessible);
    
    expect(true).toBe(true);
  });
});