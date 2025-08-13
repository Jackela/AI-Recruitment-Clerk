import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright E2E Test Suite Global Setup');
  
  const baseURL = config.webServer?.url || process.env.E2E_BASE_URL || 'http://localhost:4200';
  console.log(`🌐 Testing against: ${baseURL}`);
  
  // Create a browser instance for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be ready
    console.log('🔍 Checking application availability...');
    await page.goto(baseURL, { timeout: 60000 });
    
    // Verify basic functionality
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Create test users and data if needed
    console.log('👥 Setting up test users and data...');
    
    // Store authentication tokens or test data in global state
    process.env.E2E_ADMIN_TOKEN = await createTestUser(page, {
      email: 'e2e-admin@test.com',
      password: 'E2ETest123!',
      role: 'admin'
    });
    
    process.env.E2E_RECRUITER_TOKEN = await createTestUser(page, {
      email: 'e2e-recruiter@test.com',
      password: 'E2ETest123!',
      role: 'recruiter'
    });
    
    console.log('✅ Playwright global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Playwright global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function createTestUser(page: any, userData: any): Promise<string> {
  try {
    // Navigate to registration or use API to create test user
    // This is a simplified example - adapt based on your auth flow
    
    await page.goto('/auth/login');
    
    // Try to login first, if fails then register
    try {
      await page.fill('input[name="email"]', userData.email);
      await page.fill('input[name="password"]', userData.password);
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      // Extract token from localStorage or cookies
      const token = await page.evaluate(() => localStorage.getItem('authToken'));
      return token || 'mock-token';
      
    } catch (loginError) {
      console.log(`User ${userData.email} doesn't exist, will create during tests`);
      return 'mock-token'; // Return placeholder token
    }
    
  } catch (error) {
    console.warn(`Could not create test user ${userData.email}:`, error);
    return 'mock-token'; // Return placeholder token
  }
}

export default globalSetup;