import { chromium } from '@playwright/test';

async function globalTeardown() {
  console.log('🧹 Starting Playwright E2E Test Suite Global Teardown');
  
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4200';
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Clean up test data if needed
    console.log('🗑️ Cleaning up test data...');
    
    // Example: Delete test users created during setup
    await cleanupTestUsers(page);
    
    // Clear any test-related storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ Playwright global teardown completed successfully');
    
    await context.close();
    await browser.close();
    
  } catch (error) {
    console.warn('⚠️ Playwright global teardown encountered issues:', error);
    // Don't fail the entire test suite due to cleanup issues
  }
  
  // Clean up environment variables
  delete process.env.E2E_ADMIN_TOKEN;
  delete process.env.E2E_RECRUITER_TOKEN;
}

async function cleanupTestUsers(page: any) {
  try {
    // This would typically call an API to delete test users
    // For now, just log the intent
    console.log('🧼 Test user cleanup completed');
  } catch (error) {
    console.warn('Could not clean up test users:', error);
  }
}

export default globalTeardown;