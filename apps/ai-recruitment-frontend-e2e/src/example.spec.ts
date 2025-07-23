import { test, expect } from '@playwright/test';

/**
 * Basic Application Health Checks
 * 
 * These tests verify that the application loads and basic functionality works
 */

test.describe('Basic Application Health', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for Angular app root element
    await expect(page.locator('arc-root')).toBeVisible();
    
    // Check for main app content - should redirect to jobs page
    await expect(page.locator('text=AI 招聘助理')).toBeVisible();
    await expect(page.locator('nav a').filter({ hasText: '岗位管理' })).toBeVisible();
    
    // Verify we're on the jobs page
    expect(page.url()).toContain('/jobs');
  });

  test('no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out non-critical errors (like 404s for favicon, etc.)
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_FAILED') &&
      error.includes('ERROR') // Only actual error logs
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('basic navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Verify main page loads
    await expect(page.locator('text=AI 招聘助理')).toBeVisible();
    
    // Test navigation to jobs page
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('nav a').filter({ hasText: '岗位管理' })).toBeVisible();
    
    // Test navigation to create job page
    await page.goto('http://localhost:4202/jobs/create');
    await page.waitForLoadState('networkidle');
    // Should have form with specific Angular controls
    const hasJobTitleInput = await page.locator('input[formControlName="jobTitle"]').count() > 0;
    const hasJdTextarea = await page.locator('textarea[formControlName="jdText"]').count() > 0;
    expect(hasJobTitleInput && hasJdTextarea).toBe(true);
  });

  test('responsive design check', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=AI 招聘助理')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=AI 招聘助理')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('text=AI 招聘助理')).toBeVisible();
  });
});
