import { test, expect, Page, BrowserContext } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Enhanced User Authentication & Permission Management E2E Tests
 * 
 * Covers:
 * - Multi-factor authentication (MFA)
 * - Role-based access control (RBAC)
 * - Session management
 * - Permission boundaries
 * - Security edge cases
 */

interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'hr_manager' | 'recruiter' | 'guest';
  organization?: string;
  mfaEnabled?: boolean;
}

// Test data factory
const createTestUser = (role: TestUser['role'], mfaEnabled = false): TestUser => ({
  email: `playwright-${role}-${Date.now()}@test.com`,
  password: 'TestPass123!@#',
  role,
  organization: role !== 'admin' ? 'Test Organization' : undefined,
  mfaEnabled
});

// Page Object Model for Authentication
class AuthenticationPage {
  constructor(private page: Page) {}

  async navigateToLogin() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToRegister() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  async login(user: TestUser) {
    await this.page.fill('[data-testid=\"email-input\"]', user.email);
    await this.page.fill('[data-testid=\"password-input\"]', user.password);
    await this.page.click('[data-testid=\"login-button\"]');
    
    // Handle MFA if enabled
    if (user.mfaEnabled) {
      await this.handleMFA();
    }
  }

  async register(user: TestUser) {
    await this.page.fill('[data-testid=\"email-input\"]', user.email);
    await this.page.fill('[data-testid=\"password-input\"]', user.password);
    await this.page.fill('[data-testid=\"confirm-password-input\"]', user.password);
    await this.page.fill('[data-testid=\"first-name-input\"]', 'Test');
    await this.page.fill('[data-testid=\"last-name-input\"]', 'User');
    
    if (user.organization) {
      await this.page.fill('[data-testid=\"organization-input\"]', user.organization);
    }
    
    // Select role
    await this.page.selectOption('[data-testid=\"role-select\"]', user.role);
    
    // Accept terms
    await this.page.check('[data-testid=\"terms-checkbox\"]');
    
    await this.page.click('[data-testid=\"register-button\"]');
  }

  async handleMFA() {
    // Wait for MFA prompt
    await this.page.waitForSelector('[data-testid=\"mfa-code-input\"]');
    
    // For testing, use a predictable code or mock
    await this.page.fill('[data-testid=\"mfa-code-input\"]', '123456');
    await this.page.click('[data-testid=\"verify-mfa-button\"]');
  }

  async logout() {
    await this.page.click('[data-testid=\"user-menu-button\"]');
    await this.page.click('[data-testid=\"logout-button\"]');
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid=\"user-menu-button\"]', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentUserRole(): Promise<string | null> {
    const roleElement = this.page.locator('[data-testid=\"user-role\"]');
    return await roleElement.textContent();
  }
}

// Dashboard Page Object
class DashboardPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async hasAccessToSection(section: string): Promise<boolean> {
    const selector = `[data-testid=\"${section}-section\"]`;
    try {
      await this.page.waitForSelector(selector, { timeout: 2000 });
      return await this.page.isVisible(selector);
    } catch {
      return false;
    }
  }

  async canPerformAction(action: string): Promise<boolean> {
    const selector = `[data-testid=\"${action}-action\"]`;
    try {
      const element = this.page.locator(selector);
      return await element.isEnabled();
    } catch {
      return false;
    }
  }
}

test.describe('Enhanced Authentication & Permission Management', () => {
  let authPage: AuthenticationPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthenticationPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Inject accessibility testing
    await injectAxe(page);
  });

  test.describe('User Registration & Login Flow', () => {
    test('should complete comprehensive registration flow', async ({ page }) => {
      const testUser = createTestUser('hr_manager');
      
      await authPage.navigateToRegister();
      
      // Check accessibility
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
      
      await authPage.register(testUser);
      
      // Verify registration success
      await expect(page.locator('[data-testid=\"success-message\"]')).toContainText('Registration successful');
      
      // Should redirect to email verification or dashboard
      await page.waitForURL(/.*\\/(verify-email|dashboard)/, { timeout: 10000 });
    });

    test('should handle login with different user roles', async ({ page }) => {
      const roles: TestUser['role'][] = ['admin', 'hr_manager', 'recruiter'];
      
      for (const role of roles) {
        const testUser = createTestUser(role);
        
        // Register user first (in real scenario, this would be pre-seeded)
        await authPage.navigateToRegister();
        await authPage.register(testUser);
        
        // Wait for registration to complete
        await page.waitForTimeout(2000);
        
        // Now test login
        await authPage.navigateToLogin();
        await authPage.login(testUser);
        
        // Verify successful login
        expect(await authPage.isLoggedIn()).toBe(true);
        
        // Verify correct role assignment
        await dashboardPage.navigateTo();
        const currentRole = await authPage.getCurrentUserRole();
        expect(currentRole).toContain(role.replace('_', ' '));
        
        // Logout for next iteration
        await authPage.logout();
      }
    });

    test('should enforce password complexity requirements', async ({ page }) => {
      const testUser = createTestUser('recruiter');
      
      await authPage.navigateToRegister();
      
      // Test weak passwords
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'Password',
        'Password123'
      ];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('[data-testid=\"password-input\"]', weakPassword);
        await page.blur('[data-testid=\"password-input\"]');
        
        // Should show password requirement error
        await expect(page.locator('[data-testid=\"password-error\"]')).toBeVisible();
      }
      
      // Test strong password
      await page.fill('[data-testid=\"password-input\"]', testUser.password);
      await page.blur('[data-testid=\"password-input\"]');
      
      // Error should disappear
      await expect(page.locator('[data-testid=\"password-error\"]')).not.toBeVisible();
    });
  });

  test.describe('Multi-Factor Authentication (MFA)', () => {
    test('should handle MFA setup and verification', async ({ page }) => {
      const testUser = createTestUser('admin', true);
      
      // Register and login
      await authPage.navigateToRegister();
      await authPage.register(testUser);
      
      await authPage.navigateToLogin();
      await authPage.login(testUser);
      
      // Navigate to security settings
      await page.goto('/settings/security');
      
      // Enable MFA
      await page.click('[data-testid=\"enable-mfa-button\"]');
      
      // Verify QR code display
      await expect(page.locator('[data-testid=\"mfa-qr-code\"]')).toBeVisible();
      
      // Enter verification code
      await page.fill('[data-testid=\"mfa-setup-code\"]', '123456');
      await page.click('[data-testid=\"verify-mfa-setup\"]');
      
      // Verify MFA is enabled
      await expect(page.locator('[data-testid=\"mfa-status\"]')).toContainText('Enabled');
      
      // Test MFA during login
      await authPage.logout();
      await authPage.navigateToLogin();
      await authPage.login(testUser);
      
      // Should be logged in after MFA
      expect(await authPage.isLoggedIn()).toBe(true);
    });

    test('should handle MFA failure and recovery', async ({ page }) => {
      const testUser = createTestUser('admin', true);
      
      await authPage.navigateToLogin();
      
      // Initial login
      await page.fill('[data-testid=\"email-input\"]', testUser.email);
      await page.fill('[data-testid=\"password-input\"]', testUser.password);
      await page.click('[data-testid=\"login-button\"]');
      
      // Enter wrong MFA code
      await page.waitForSelector('[data-testid=\"mfa-code-input\"]');
      await page.fill('[data-testid=\"mfa-code-input\"]', '000000');
      await page.click('[data-testid=\"verify-mfa-button\"]');
      
      // Should show error
      await expect(page.locator('[data-testid=\"mfa-error\"]')).toContainText('Invalid verification code');
      
      // Should allow retry
      await page.fill('[data-testid=\"mfa-code-input\"]', '123456');
      await page.click('[data-testid=\"verify-mfa-button\"]');
      
      // Should be logged in
      expect(await authPage.isLoggedIn()).toBe(true);
    });
  });

  test.describe('Role-Based Access Control (RBAC)', () => {
    test('should enforce admin permissions', async ({ page }) => {
      const adminUser = createTestUser('admin');
      
      await authPage.navigateToRegister();
      await authPage.register(adminUser);
      await authPage.navigateToLogin();
      await authPage.login(adminUser);
      
      await dashboardPage.navigateTo();
      
      // Admin should have access to all sections
      expect(await dashboardPage.hasAccessToSection('user-management')).toBe(true);
      expect(await dashboardPage.hasAccessToSection('system-settings')).toBe(true);
      expect(await dashboardPage.hasAccessToSection('analytics')).toBe(true);
      expect(await dashboardPage.hasAccessToSection('job-management')).toBe(true);
      
      // Admin should be able to perform all actions
      expect(await dashboardPage.canPerformAction('create-user')).toBe(true);
      expect(await dashboardPage.canPerformAction('delete-user')).toBe(true);
      expect(await dashboardPage.canPerformAction('modify-system')).toBe(true);
    });

    test('should enforce HR manager permissions', async ({ page }) => {
      const hrUser = createTestUser('hr_manager');
      
      await authPage.navigateToRegister();
      await authPage.register(hrUser);
      await authPage.navigateToLogin();
      await authPage.login(hrUser);
      
      await dashboardPage.navigateTo();
      
      // HR Manager should have limited access
      expect(await dashboardPage.hasAccessToSection('job-management')).toBe(true);
      expect(await dashboardPage.hasAccessToSection('analytics')).toBe(true);
      expect(await dashboardPage.hasAccessToSection('user-management')).toBe(false);
      expect(await dashboardPage.hasAccessToSection('system-settings')).toBe(false);
      
      // Limited actions
      expect(await dashboardPage.canPerformAction('create-job')).toBe(true);
      expect(await dashboardPage.canPerformAction('view-analytics')).toBe(true);
      expect(await dashboardPage.canPerformAction('create-user')).toBe(false);
      expect(await dashboardPage.canPerformAction('modify-system')).toBe(false);
    });

    test('should enforce recruiter permissions', async ({ page }) => {
      const recruiterUser = createTestUser('recruiter');
      
      await authPage.navigateToRegister();
      await authPage.register(recruiterUser);
      await authPage.navigateToLogin();
      await authPage.login(recruiterUser);
      
      await dashboardPage.navigateTo();
      
      // Recruiter should have minimal access
      expect(await dashboardPage.hasAccessToSection('job-management')).toBe(true);
      expect(await dashboardPage.hasAccessToSection('analytics')).toBe(false);
      expect(await dashboardPage.hasAccessToSection('user-management')).toBe(false);
      expect(await dashboardPage.hasAccessToSection('system-settings')).toBe(false);
      
      // Basic actions only
      expect(await dashboardPage.canPerformAction('view-jobs')).toBe(true);
      expect(await dashboardPage.canPerformAction('process-resumes')).toBe(true);
      expect(await dashboardPage.canPerformAction('create-job')).toBe(false);
      expect(await dashboardPage.canPerformAction('delete-job')).toBe(false);
    });
  });

  test.describe('Session Management', () => {
    test('should handle session timeout', async ({ page, context }) => {
      const testUser = createTestUser('hr_manager');
      
      await authPage.navigateToRegister();
      await authPage.register(testUser);
      await authPage.navigateToLogin();
      await authPage.login(testUser);
      
      // Simulate session timeout by manipulating cookies
      await context.clearCookies();
      
      // Try to access protected resource
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\\/login/);
      
      // Should show session timeout message
      await expect(page.locator('[data-testid=\"session-timeout-message\"]')).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ browser }) => {
      const testUser = createTestUser('admin');
      
      // Create two contexts (simulate two browser sessions)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const authPage1 = new AuthenticationPage(page1);
      const authPage2 = new AuthenticationPage(page2);
      
      // Register user in first session
      await authPage1.navigateToRegister();
      await authPage1.register(testUser);
      
      // Login from both sessions
      await authPage1.navigateToLogin();
      await authPage1.login(testUser);
      
      await authPage2.navigateToLogin();
      await authPage2.login(testUser);
      
      // Both should be logged in
      expect(await authPage1.isLoggedIn()).toBe(true);
      expect(await authPage2.isLoggedIn()).toBe(true);
      
      // Logout from one session
      await authPage1.logout();
      
      // First session should be logged out
      expect(await authPage1.isLoggedIn()).toBe(false);
      
      // Second session should still be active (unless single session policy)
      expect(await authPage2.isLoggedIn()).toBe(true);
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should prevent SQL injection in login fields', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Try SQL injection in email field
      await page.fill('[data-testid=\"email-input\"]', \"admin'; DROP TABLE users; --\");
      await page.fill('[data-testid=\"password-input\"]', 'password');
      await page.click('[data-testid=\"login-button\"]');
      
      // Should show invalid credentials, not crash
      await expect(page.locator('[data-testid=\"error-message\"]')).toContainText(/invalid.*credentials/i);
    });

    test('should prevent XSS attacks in user input', async ({ page }) => {
      const testUser = createTestUser('hr_manager');
      
      await authPage.navigateToRegister();
      
      // Try XSS in first name field
      await page.fill('[data-testid=\"first-name-input\"]', '<script>alert(\"XSS\")</script>');
      await page.fill('[data-testid=\"email-input\"]', testUser.email);
      await page.fill('[data-testid=\"password-input\"]', testUser.password);
      await page.fill('[data-testid=\"confirm-password-input\"]', testUser.password);
      await page.fill('[data-testid=\"last-name-input\"]', 'User');
      await page.selectOption('[data-testid=\"role-select\"]', testUser.role);
      await page.check('[data-testid=\"terms-checkbox\"]');
      
      await page.click('[data-testid=\"register-button\"]');
      
      // Should sanitize input and not execute script
      // We'll check that no alert dialog appears
      page.on('dialog', () => {
        throw new Error('XSS attack succeeded - alert dialog detected');
      });
      
      // Wait for potential XSS execution
      await page.waitForTimeout(1000);
    });

    test('should enforce rate limiting on login attempts', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid=\"email-input\"]', 'test@example.com');
        await page.fill('[data-testid=\"password-input\"]', 'wrongpassword');
        await page.click('[data-testid=\"login-button\"]');
        
        await page.waitForTimeout(1000);
      }
      
      // Should show rate limit message
      await expect(page.locator('[data-testid=\"rate-limit-message\"]')).toBeVisible();
      
      // Should prevent further login attempts temporarily
      await page.fill('[data-testid=\"email-input\"]', 'test@example.com');
      await page.fill('[data-testid=\"password-input\"]', 'correctpassword');
      await page.click('[data-testid=\"login-button\"]');
      
      await expect(page.locator('[data-testid=\"rate-limit-message\"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus email field
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password field
      await page.keyboard.type('password');
      
      await page.keyboard.press('Tab'); // Focus login button
      await page.keyboard.press('Enter'); // Submit form
      
      // Should process form submission
      await expect(page.locator('[data-testid=\"error-message\"]')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Check ARIA attributes
      await expect(page.locator('[data-testid=\"email-input\"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid=\"password-input\"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid=\"login-button\"]')).toHaveAttribute('role', 'button');
      
      // Check form accessibility
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });
  });
});