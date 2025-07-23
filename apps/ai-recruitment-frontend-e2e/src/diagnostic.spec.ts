import { test, expect } from '@playwright/test';

/**
 * Diagnostic Tests to Debug Application Loading Issues
 */

test.describe('Application Diagnostics', () => {
  test('capture page content and HTML structure', async ({ page }) => {
    console.log('Navigating to application...');
    await page.goto('/');
    
    console.log('Waiting for network to settle...');
    await page.waitForLoadState('networkidle');
    
    // Capture page content
    const pageContent = await page.content();
    console.log('Page HTML length:', pageContent.length);
    console.log('Page HTML preview (first 1000 chars):', pageContent.substring(0, 1000));
    
    // Check what elements exist
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('Body HTML:', bodyHTML);
    
    // Check for any JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('Console error:', msg.text());
      }
    });
    
    // Wait a bit more to capture any delayed errors
    await page.waitForTimeout(2000);
    
    // Log any errors found
    console.log('JavaScript errors found:', errors.length);
    errors.forEach((error, index) => {
      console.log(`Error ${index + 1}:`, error);
    });
    
    // Check for common Angular elements with a longer timeout
    const appRootExists = await page.locator('app-root').count();
    const scriptTags = await page.locator('script').count();
    const styleTags = await page.locator('style, link[rel="stylesheet"]').count();
    
    console.log('app-root elements found:', appRootExists);
    console.log('Script tags found:', scriptTags);
    console.log('Style tags found:', styleTags);
    
    // Check the title
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check if main.js is loaded
    const mainJsLoaded = pageContent.includes('main.js');
    const polyfillsLoaded = pageContent.includes('polyfills.js');
    console.log('main.js loaded:', mainJsLoaded);
    console.log('polyfills.js loaded:', polyfillsLoaded);
    
    // This test always passes - it's just for diagnostics
    expect(true).toBe(true);
  });

  test('check if Angular development server is responding', async ({ page }) => {
    const response = await page.goto('/');
    console.log('Response status:', response?.status());
    console.log('Response headers:', await response?.allHeaders());
    
    // Check if we get a valid HTML response
    expect(response?.status()).toBe(200);
    
    const contentType = (await response?.allHeaders())?.['content-type'];
    console.log('Content-Type:', contentType);
    expect(contentType).toContain('text/html');
  });

  test('manually check for Angular bootstrap', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for Angular to potentially bootstrap
    await page.waitForTimeout(5000);
    
    // Check if Angular has added any of its typical classes or attributes
    const ngElements = await page.locator('[ng-version], .ng-star-inserted, [_ngcontent], [_nghost]').count();
    console.log('Angular-specific elements found:', ngElements);
    
    // Check if there's any content at all
    const allText = await page.textContent('html');
    console.log('Page text content length:', allText?.length || 0);
    console.log('Page text preview:', allText?.substring(0, 500) || 'No text content');
    
    // This test is just for information gathering
    expect(true).toBe(true);
  });
});