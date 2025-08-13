import { test, expect } from '@playwright/test';

/**
 * Critical Workflow #6: Security & Integration Testing
 * Tests security features, GDPR compliance, and cross-service integration
 */
test.describe('Security & Integration Workflow', () => {

  test.describe('Authentication Security', () => {
    test('should enforce strong password requirements', async ({ page }) => {
      await page.goto('/register');
      
      // Test weak password
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', '123');
      await page.blur('input[name="password"]');
      
      await expect(page.locator('.password-error')).toContainText(/password.*requirements/i);
      
      // Test stronger password
      await page.fill('input[name="password"]', 'StrongPass123!');
      await expect(page.locator('.password-strength')).toContainText(/strong/i);
    });

    test('should implement rate limiting on login attempts', async ({ page }) => {
      await page.goto('/login');
      
      const invalidCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', invalidCredentials.email);
        await page.fill('input[name="password"]', invalidCredentials.password);
        await page.click('button[type="submit"]');
        
        if (i < 5) {
          await expect(page.locator('.error-message')).toBeVisible();
        }
      }
      
      // Should be rate limited after 5 attempts
      await expect(page.locator('.rate-limit-message')).toContainText(/too many.*attempts/i);
    });

    test('should support multi-factor authentication', async ({ page }) => {
      // Login with a user who has MFA enabled
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Should be redirected to MFA verification
      await expect(page).toHaveURL(/.*\/auth\/mfa-verify/);
      
      // Test MFA code input
      await page.fill('input[name="mfaCode"]', '123456');
      await page.click('button[type="submit"]');
      
      // Should show error for invalid code
      await expect(page.locator('.mfa-error')).toContainText(/invalid.*code/i);
      
      // Test MFA setup for new user
      await page.goto('/profile/security');
      await page.click('button[data-action="enable-mfa"]');
      
      // Should show QR code and setup instructions
      await expect(page.locator('.mfa-qr-code')).toBeVisible();
      await expect(page.locator('.mfa-setup-instructions')).toBeVisible();
    });
  });

  test.describe('GDPR Compliance', () => {
    test('should handle consent management', async ({ page }) => {
      // New user should see consent banner
      await page.goto('/');
      
      await expect(page.locator('.consent-banner')).toBeVisible();
      
      // Test accept all cookies
      await page.click('button[data-consent="accept-all"]');
      await expect(page.locator('.consent-banner')).toBeHidden();
      
      // Test customize consent
      await page.goto('/privacy/consent');
      
      await expect(page.locator('.consent-management')).toBeVisible();
      
      // Test individual consent toggles
      await page.click('input[name="analytics-consent"]');
      await page.click('input[name="marketing-consent"]');
      
      await page.click('button[data-action="save-preferences"]');
      await expect(page.locator('.success-message')).toContainText('Preferences saved');
    });

    test('should support data export requests', async ({ page }) => {
      // Login as regular user
      await page.goto('/login');
      await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Navigate to privacy center
      await page.goto('/privacy/my-data');
      
      // Request data export
      await page.click('button[data-action="request-data-export"]');
      
      // Verify identity
      await page.fill('input[name="confirmEmail"]', 'hr@ai-recruitment.com');
      await page.click('button[data-action="confirm-export"]');
      
      // Should show export request confirmation
      await expect(page.locator('.export-requested')).toContainText('Data export request submitted');
      
      // Check export status
      await expect(page.locator('.export-status')).toContainText('Processing');
      
      // Admin should be able to process the request
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      await page.goto('/admin/privacy/data-requests');
      
      // Process the export request
      await page.click('.data-request:first-child .approve-button');
      await expect(page.locator('.success-message')).toContainText('Export approved');
    });

    test('should handle data deletion requests', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      await page.goto('/privacy/my-data');
      
      // Request account deletion
      await page.click('button[data-action="request-deletion"]');
      
      // Should show confirmation dialog
      await expect(page.locator('.deletion-warning')).toBeVisible();
      await expect(page.locator('.deletion-consequences')).toBeVisible();
      
      // Confirm deletion
      await page.check('input[name="confirm-deletion"]');
      await page.fill('input[name="deletion-reason"]', 'No longer using the service');
      await page.click('button[data-confirm="delete-account"]');
      
      await expect(page.locator('.deletion-requested')).toContainText('Account deletion requested');
    });
  });

  test.describe('Cross-Service Integration', () => {
    test('should handle resume parsing service integration', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Upload resume and verify parsing
      await page.goto('/resumes/upload');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('path/to/test-resume.pdf');
      
      await page.fill('input[name="candidateName"]', 'Integration Test User');
      await page.click('button[type="submit"]');
      
      // Verify parsing started
      await expect(page.locator('.parsing-status')).toContainText('Processing');
      
      // Wait for parsing completion
      await expect(page.locator('.parsing-complete')).toBeVisible({ timeout: 30000 });
      
      // Verify parsed data
      await expect(page.locator('.extracted-skills')).toBeVisible();
      await expect(page.locator('.contact-info')).toBeVisible();
      await expect(page.locator('.experience-section')).toBeVisible();
    });

    test('should handle scoring engine integration', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Create a job and wait for scoring
      await page.goto('/jobs/create');
      await page.fill('input[name="title"]', 'Integration Test Job');
      await page.fill('input[name="company"]', 'Test Company');
      await page.fill('textarea[name="description"]', 'Job for testing scoring integration');
      
      // Add skills
      await page.fill('input[name="skillInput"]', 'JavaScript');
      await page.press('input[name="skillInput"]', 'Enter');
      
      await page.click('button[data-action="publish"]');
      
      // Navigate to matches
      await page.goto('/jobs');
      await page.click('.job-card:has-text("Integration Test Job") .view-matches-button');
      
      // Verify scoring service is working
      await expect(page.locator('.candidate-match')).toHaveCount.atLeast(1);
      await expect(page.locator('.match-score')).toBeVisible();
      
      // Check detailed scoring
      await page.click('.candidate-match:first-child');
      await expect(page.locator('.scoring-breakdown')).toBeVisible();
    });

    test('should handle report generation service integration', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@ai-recruitment.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      await page.goto('/analytics/reports');
      
      // Generate a comprehensive report
      await page.selectOption('select[name="reportType"]', 'comprehensive-hiring');
      await page.selectOption('select[name="reportPeriod"]', 'last-month');
      
      await page.click('button[data-action="generate-report"]');
      
      // Verify report generation
      await expect(page.locator('.report-generating')).toBeVisible();
      await expect(page.locator('.report-ready')).toBeVisible({ timeout: 45000 });
      
      // Download and verify report
      const downloadPromise = page.waitForEvent('download');
      await page.click('button[data-action="download-report"]');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/comprehensive-hiring.*\.pdf$/);
    });
  });

  test.describe('Performance & Monitoring', () => {
    test('should load pages within performance budgets', async ({ page }) => {
      const performanceMetrics = [];
      
      // Test key pages for performance
      const keyPages = ['/dashboard', '/jobs', '/resumes', '/analytics'];
      
      for (const pagePath of keyPages) {
        const startTime = Date.now();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        performanceMetrics.push({ page: pagePath, loadTime });
        
        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
      }
      
      console.log('Performance metrics:', performanceMetrics);
    });

    test('should handle error scenarios gracefully', async ({ page }) => {
      // Test network error handling
      await page.route('**/api/**', route => route.abort('failed'));
      
      await page.goto('/dashboard');
      
      // Should show user-friendly error message
      await expect(page.locator('.network-error')).toContainText(/connection.*problem/i);
      await expect(page.locator('.retry-button')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/api/**');
      await page.click('.retry-button');
      
      await expect(page.locator('.network-error')).toBeHidden();
    });

    test('should implement proper error boundaries', async ({ page }) => {
      // Simulate JavaScript error
      await page.goto('/dashboard');
      
      // Inject error to test error boundary
      await page.evaluate(() => {
        // Simulate a runtime error
        setTimeout(() => {
          throw new Error('Test error for error boundary');
        }, 100);
      });
      
      // Should show error boundary fallback UI
      await expect(page.locator('.error-boundary')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.error-details')).toContainText('Something went wrong');
      
      // Should have option to reload
      await expect(page.locator('button[data-action="reload-page"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should meet WCAG accessibility standards', async ({ page }) => {
      await page.goto('/');
      
      // Test keyboard navigation
      await page.press('body', 'Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test skip link
      await page.press('body', 'Tab');
      const skipLink = page.locator('a[href="#main-content"]');
      if (await skipLink.isVisible()) {
        await skipLink.click();
        await expect(page.locator('#main-content')).toBeFocused();
      }
      
      // Test form labels
      await page.goto('/login');
      const emailInput = page.locator('input[name="email"]');
      const emailLabel = page.locator('label[for="email"]');
      
      await expect(emailInput).toHaveAttribute('id', 'email');
      await expect(emailLabel).toBeVisible();
      
      // Test alt text for images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for ARIA attributes
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[aria-label]')).toHaveCount.atLeast(1);
      
      // Check for proper heading structure
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1); // Should have exactly one h1
      
      // Check for table accessibility
      const tables = page.locator('table');
      if (await tables.count() > 0) {
        await expect(tables.first()).toHaveAttribute('role', 'table');
        await expect(tables.first().locator('th')).toHaveAttribute('scope');
      }
    });
  });
});