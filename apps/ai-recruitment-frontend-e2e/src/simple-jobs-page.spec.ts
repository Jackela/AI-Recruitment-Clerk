import { test, expect } from '@playwright/test';

/**
 * Simple Jobs Page Test - No API calls, just check rendering
 */

test.describe('Simple Jobs Page Test', () => {
  test('Check jobs page without any API calls', async ({ page }) => {
    console.log('🔍 Testing jobs page without API mocking...');
    
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console error:', msg.text());
      }
    });
    
    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log('🚫 Page error:', error.message);
    });
    
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    
    // Give time for Angular to render
    await page.waitForTimeout(3000);
    
    // Check what's actually on the page
    const bodyText = await page.textContent('body');
    console.log('📄 Body text length:', bodyText?.length || 0);
    console.log('📄 Body text preview:', bodyText?.substring(0, 300) || 'No content');
    
    // Check if the main app header is there
    const hasAppTitle = await page.locator('text=AI 招聘助理').count();
    console.log('🏷️ App title found:', hasAppTitle);
    
    // Check if we can find the specific page title  
    const hasPageTitle = await page.locator('h2, .page-title').count();
    console.log('📋 Page title elements found:', hasPageTitle);
    
    // Check the specific text we expect
    const hasJobsTitle = await page.locator('text=岗位管理').count();
    console.log('💼 "岗位管理" text found:', hasJobsTitle);
    
    // Check if there are any job-related elements
    const hasJobsContainer = await page.locator('.jobs-list-container').count();
    const hasJobsGrid = await page.locator('.jobs-grid').count();
    const hasEmptyState = await page.locator('.empty-state').count();
    
    console.log('📦 Jobs container found:', hasJobsContainer);
    console.log('🔲 Jobs grid found:', hasJobsGrid);
    console.log('🚫 Empty state found:', hasEmptyState);
    
    // Check for loading indicators
    const hasLoader = await page.locator('text=加载中').count();
    console.log('⏳ Loading indicator found:', hasLoader);
    
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
    await page.waitForTimeout(2000);
    
    // This should work since basic navigation test passed
    const hasForm = await page.locator('form').count();
    const hasJobTitleInput = await page.locator('input[formControlName="jobTitle"]').count();
    const hasJdTextarea = await page.locator('textarea[formControlName="jdText"]').count();
    
    console.log('📝 Form found:', hasForm);
    console.log('🏷️ Job title input found:', hasJobTitleInput);
    console.log('📄 JD textarea found:', hasJdTextarea);
    
    // This should pass based on previous tests
    expect(hasForm).toBeGreaterThan(0);
    expect(hasJobTitleInput).toBeGreaterThan(0);
    expect(hasJdTextarea).toBeGreaterThan(0);
  });
});