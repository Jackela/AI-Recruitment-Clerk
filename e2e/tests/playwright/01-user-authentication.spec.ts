import { test, expect } from '@playwright/test';

/**
 * Critical Workflow #1: User Authentication & Registration
 * Tests the complete user authentication flow from registration to login
 */
test.describe('User Authentication Workflow', () => {
  const testUser = {
    email: `playwright-test-${Date.now()}@example.com`,
    password: 'PlaywrightTest123!',
    firstName: 'Test',
    lastName: 'User',
    company: 'Test Company'
  };

  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should complete user registration flow', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Register');
    await expect(page).toHaveURL(/.*\/register/);

    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="company"]', testUser.company);

    // Accept terms and conditions
    await page.check('input[name="acceptTerms"]');

    // Submit registration
    await page.click('button[type="submit"]');

    // Verify successful registration
    await expect(page.locator('.success-message')).toContainText('Registration successful');
    
    // Should redirect to dashboard or confirmation page
    await page.waitForURL(/.*\/(dashboard|confirm-email)/, { timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*\/login/);

    // Fill login form
    await page.fill('input[name="email"]', 'admin@ai-recruitment.com');
    await page.fill('input[name="password"]', 'admin123');

    // Submit login
    await page.click('button[type="submit"]');

    // Verify successful login
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('nav')).toContainText('Dashboard');
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.click('text=Login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toContainText(/invalid.*credentials/i);
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ai-recruitment.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Then logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    
    // Should redirect to home/login page
    await expect(page).toHaveURL(/.*\/(login|home|$)/);
  });

  test('should validate form fields', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.field-error')).toHaveCount(5, { timeout: 5000 });
    
    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');
    
    await expect(page.locator('input[name="email"] + .error')).toContainText(/valid email/i);
    
    // Test password validation
    await page.fill('input[name="password"]', '123');
    await page.blur('input[name="password"]');
    
    await expect(page.locator('input[name="password"] + .error')).toContainText(/password.*requirements/i);
  });
});