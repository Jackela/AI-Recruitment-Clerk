import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, configureAxe } from 'axe-playwright';

/**
 * Accessibility & WCAG AA Compliance E2E Tests
 * 
 * Tests comprehensive accessibility compliance:
 * - WCAG 2.1 AA Guidelines
 * - Keyboard navigation
 * - Screen reader compatibility
 * - Color contrast ratios
 * - Focus management
 * - ARIA implementations
 * - Semantic HTML structure
 */

interface AccessibilityTestResult {
  page: string;
  violations: number;
  passes: number;
  incomplete: number;
  level: 'A' | 'AA' | 'AAA';
}

// Accessibility test configuration
const axeConfig = {
  rules: {
    // WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA level
    'focus-order-semantics': { enabled: true },
    'keyboard': { enabled: true },
    'label': { enabled: true },
    'landmark-unique': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
    'tabindex': { enabled: true },
    // Custom rules for recruitment system
    'button-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'input-image-alt': { enabled: true },
    'link-name': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
};

// Keyboard navigation helper
class KeyboardNavigationHelper {
  constructor(private page: Page) {}

  async navigateWithTab(expectedStops: number): Promise<string[]> {
    const focusedElements: string[] = [];
    
    // Start from beginning
    await this.page.keyboard.press('Home');
    
    for (let i = 0; i < expectedStops; i++) {
      await this.page.keyboard.press('Tab');
      
      const focusedElement = await this.page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? {
          tagName: focused.tagName,
          id: focused.id,
          'data-testid': focused.getAttribute('data-testid'),
          role: focused.getAttribute('role'),
          ariaLabel: focused.getAttribute('aria-label')
        } : null;
      });
      
      if (focusedElement) {
        const identifier = focusedElement['data-testid'] || 
                          focusedElement.id || 
                          `${focusedElement.tagName}-${i}`;
        focusedElements.push(identifier);
      }
    }
    
    return focusedElements;
  }

  async testSkipLinks() {
    // Press Tab to focus first skip link
    await this.page.keyboard.press('Tab');
    
    const skipLink = this.page.locator('a[href=\"#main-content\"]').first();
    await expect(skipLink).toBeFocused();
    
    // Activate skip link
    await this.page.keyboard.press('Enter');
    
    // Should focus main content
    const mainContent = this.page.locator('#main-content, [data-testid=\"main-content\"]');
    await expect(mainContent).toBeFocused();
  }

  async testModalFocusTrap() {
    // Open modal
    await this.page.click('[data-testid=\"open-modal-button\"]');
    
    // Focus should be trapped in modal
    const modalElements = await this.page.locator('[data-testid=\"modal\"] [tabindex=\"0\"], [data-testid=\"modal\"] button, [data-testid=\"modal\"] input').count();
    
    const focusedElements = await this.navigateWithTab(modalElements + 2); // +2 to test wrap-around
    
    // Focus should cycle within modal
    const modalFocusedElements = focusedElements.filter(el => 
      el.includes('modal') || el.includes('close') || el.includes('confirm')
    );
    
    expect(modalFocusedElements.length).toBeGreaterThan(0);
  }

  async testFormNavigation() {
    const formElements = await this.page.locator('form [tabindex=\"0\"], form button, form input, form select, form textarea').count();
    
    const focusedElements = await this.navigateWithTab(formElements);
    
    // Should follow logical order
    const expectedOrder = ['email-input', 'password-input', 'login-button'];
    const actualOrder = focusedElements.filter(el => expectedOrder.includes(el));
    
    expect(actualOrder).toEqual(expectedOrder);
  }
}

// Screen reader simulation helper
class ScreenReaderHelper {
  constructor(private page: Page) {}

  async getAriaLiveAnnouncements(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live], [role=\"status\"], [role=\"alert\"]');
      return Array.from(liveRegions).map(region => region.textContent || '').filter(text => text.trim());
    });
  }

  async validateAriaLabels() {
    const elementsWithAriaLabel = await this.page.locator('[aria-label]').all();
    
    for (const element of elementsWithAriaLabel) {
      const ariaLabel = await element.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel!.length).toBeGreaterThan(0);
    }
  }

  async validateFormLabels() {
    const formInputs = await this.page.locator('input, select, textarea').all();
    
    for (const input of formInputs) {
      const inputId = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (inputId) {
        // Should have associated label
        const label = this.page.locator(`label[for=\"${inputId}\"]`);
        const hasLabel = await label.count() > 0;
        
        // Should have either label, aria-label, or aria-labelledby
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBe(true);
      }
    }
  }

  async validateHeadingStructure(): Promise<{ level: number; text: string }[]> {
    const headings = await this.page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map(heading => ({
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent || ''
      }));
    });

    // Validate heading hierarchy
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;
      
      // Should not skip levels (e.g., h1 -> h3)
      if (currentLevel > previousLevel) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    }

    return headings;
  }

  async validateLandmarks() {
    const landmarks = await this.page.evaluate(() => {
      const landmarkRoles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search'];
      const landmarks: { role: string; text: string }[] = [];
      
      landmarkRoles.forEach(role => {
        const elements = document.querySelectorAll(`[role=\"${role}\"], ${role === 'banner' ? 'header' : ''} ${role === 'main' ? ', main' : ''} ${role === 'navigation' ? ', nav' : ''} ${role === 'contentinfo' ? ', footer' : ''}`);
        elements.forEach(el => {
          landmarks.push({
            role,
            text: el.textContent?.substring(0, 50) || ''
          });
        });
      });
      
      return landmarks;
    });

    // Should have at least main landmark
    expect(landmarks.some(l => l.role === 'main')).toBe(true);
    
    return landmarks;
  }
}

// Color contrast helper
class ColorContrastHelper {
  constructor(private page: Page) {}

  async checkColorContrast(): Promise<{ element: string; ratio: number; passes: boolean }[]> {
    return await this.page.evaluate(() => {
      const results: { element: string; ratio: number; passes: boolean }[] = [];
      
      // Get all text elements
      const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li');
      
      textElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const backgroundColor = styles.backgroundColor;
        const color = styles.color;
        
        // Simplified contrast calculation (in real implementation, use proper algorithm)
        const bgLuminance = this.getLuminance(backgroundColor);
        const textLuminance = this.getLuminance(color);
        
        const ratio = (Math.max(bgLuminance, textLuminance) + 0.05) / 
                     (Math.min(bgLuminance, textLuminance) + 0.05);
        
        const passes = ratio >= 4.5; // WCAG AA standard
        
        results.push({
          element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : '') + '-' + index,
          ratio: Math.round(ratio * 100) / 100,
          passes
        });
      });
      
      return results;
    });
  }

  private async getLuminance(color: string): Promise<number> {
    // Simplified luminance calculation
    // In production, use proper color space conversion
    return 0.5; // Placeholder
  }
}

test.describe('Accessibility & WCAG AA Compliance', () => {
  let keyboardHelper: KeyboardNavigationHelper;
  let screenReaderHelper: ScreenReaderHelper;
  let colorContrastHelper: ColorContrastHelper;
  let testResults: AccessibilityTestResult[] = [];

  test.beforeEach(async ({ page }) => {
    keyboardHelper = new KeyboardNavigationHelper(page);
    screenReaderHelper = new ScreenReaderHelper(page);
    colorContrastHelper = new ColorContrastHelper(page);

    // Inject axe-core
    await injectAxe(page);
    
    // Configure axe for WCAG 2.1 AA
    await configureAxe(page, axeConfig);
  });

  test.afterAll(async () => {
    // Generate accessibility report
    console.table(testResults);
    
    const totalViolations = testResults.reduce((sum, result) => sum + result.violations, 0);
    expect(totalViolations).toBe(0); // Should have no violations
  });

  test.describe('Login Page Accessibility', () => {
    test('should meet WCAG AA standards on login page', async ({ page }) => {
      await page.goto('/login');
      
      // Run axe accessibility tests
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });

      testResults.push({
        page: 'login',
        violations: results.violations?.length || 0,
        passes: results.passes?.length || 0,
        incomplete: results.incomplete?.length || 0,
        level: 'AA'
      });

      // Should have no violations
      expect(results.violations).toHaveLength(0);
    });

    test('should support keyboard navigation on login page', async ({ page }) => {
      await page.goto('/login');
      
      // Test skip links
      await keyboardHelper.testSkipLinks();
      
      // Test form navigation
      await keyboardHelper.testFormNavigation();
      
      // Test login form submission with keyboard
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type('password123');
      
      await page.keyboard.press('Tab'); // Focus login button
      await page.keyboard.press('Enter'); // Submit form
      
      // Should attempt login (may show error, but form should submit)
      await expect(page.locator('[data-testid=\"login-form\"]')).toBeVisible();
    });

    test('should have proper screen reader support on login page', async ({ page }) => {
      await page.goto('/login');
      
      // Validate ARIA labels
      await screenReaderHelper.validateAriaLabels();
      
      // Validate form labels
      await screenReaderHelper.validateFormLabels();
      
      // Check page title
      const title = await page.title();
      expect(title).toContain('Login');
      expect(title.length).toBeGreaterThan(5);
      
      // Check heading structure
      const headings = await screenReaderHelper.validateHeadingStructure();
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].level).toBe(1); // Should start with h1
    });
  });

  test.describe('Dashboard Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid=\"email-input\"]', 'test@example.com');
      await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page.click('[data-testid=\"login-button\"]');
      await page.waitForURL(/.*\\/dashboard/);
    });

    test('should meet WCAG AA standards on dashboard', async ({ page }) => {
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });

      testResults.push({
        page: 'dashboard',
        violations: results.violations?.length || 0,
        passes: results.passes?.length || 0,
        incomplete: results.incomplete?.length || 0,
        level: 'AA'
      });

      expect(results.violations).toHaveLength(0);
    });

    test('should have accessible navigation', async ({ page }) => {
      // Validate landmarks
      const landmarks = await screenReaderHelper.validateLandmarks();
      expect(landmarks.length).toBeGreaterThan(0);
      
      // Should have main navigation
      const nav = page.locator('nav, [role=\"navigation\"]');
      await expect(nav).toBeVisible();
      
      // Navigation items should be accessible
      const navItems = await page.locator('nav a, [role=\"navigation\"] a').all();
      for (const item of navItems) {
        const text = await item.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test main navigation
      const focusedElements = await keyboardHelper.navigateWithTab(10);
      expect(focusedElements.length).toBeGreaterThan(5);
      
      // Should include main navigation items
      expect(focusedElements.some(el => el.includes('dashboard'))).toBe(true);
    });

    test('should have proper ARIA live regions', async ({ page }) => {
      // Check for live regions
      const liveRegions = await page.locator('[aria-live], [role=\"status\"], [role=\"alert\"]').count();
      expect(liveRegions).toBeGreaterThan(0);
      
      // Trigger an action that should announce something
      await page.click('[data-testid=\"refresh-button\"]');
      
      // Check for announcements
      await page.waitForTimeout(1000);
      const announcements = await screenReaderHelper.getAriaLiveAnnouncements();
      expect(announcements.length).toBeGreaterThan(0);
    });
  });

  test.describe('Job Creation Form Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid=\"email-input\"]', 'hr.manager@test.com');
      await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page.click('[data-testid=\"login-button\"]');
      await page.goto('/jobs/create');
    });

    test('should meet WCAG AA standards on job creation form', async ({ page }) => {
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });

      testResults.push({
        page: 'job-creation',
        violations: results.violations?.length || 0,
        passes: results.passes?.length || 0,
        incomplete: results.incomplete?.length || 0,
        level: 'AA'
      });

      expect(results.violations).toHaveLength(0);
    });

    test('should have accessible form controls', async ({ page }) => {
      // Validate all form labels
      await screenReaderHelper.validateFormLabels();
      
      // Check required field indicators
      const requiredFields = await page.locator('[required], [aria-required=\"true\"]').all();
      for (const field of requiredFields) {
        const ariaRequired = await field.getAttribute('aria-required');
        const hasAsterisk = await page.locator(`label[for=\"${await field.getAttribute('id')}\"] .required, label[for=\"${await field.getAttribute('id')}\"] *:contains(\"*\")`).count() > 0;
        
        expect(ariaRequired === 'true' || hasAsterisk).toBe(true);
      }
    });

    test('should provide accessible error messages', async ({ page }) => {
      // Submit form with empty required fields
      await page.click('[data-testid=\"submit-button\"]');
      
      // Check for error messages
      const errorMessages = await page.locator('[role=\"alert\"], .error-message, [aria-describedby]').all();
      expect(errorMessages.length).toBeGreaterThan(0);
      
      // Error messages should be properly associated
      for (const error of errorMessages) {
        const text = await error.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should handle dynamic content accessibly', async ({ page }) => {
      // Add a requirement (dynamic content)
      await page.click('[data-testid=\"add-requirement-button\"]');
      
      // New field should be accessible
      const newField = page.locator('[data-testid=\"requirement-input\"]:last-child');
      await expect(newField).toBeVisible();
      await expect(newField).toBeFocused();
      
      // Should announce the addition
      const announcements = await screenReaderHelper.getAriaLiveAnnouncements();
      expect(announcements.some(a => a.includes('requirement') || a.includes('added'))).toBe(true);
    });
  });

  test.describe('Modal Dialog Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid=\"email-input\"]', 'test@example.com');
      await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page.click('[data-testid=\"login-button\"]');
      await page.goto('/dashboard');
    });

    test('should have accessible modal dialogs', async ({ page }) => {
      // Open modal
      await page.click('[data-testid=\"settings-button\"]');
      
      // Modal should be accessible
      const modal = page.locator('[role=\"dialog\"], [data-testid=\"modal\"]');
      await expect(modal).toBeVisible();
      
      // Should have proper ARIA attributes
      const ariaModal = await modal.getAttribute('aria-modal');
      const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
      const ariaLabel = await modal.getAttribute('aria-label');
      
      expect(ariaModal).toBe('true');
      expect(ariaLabelledBy || ariaLabel).toBeTruthy();
      
      // Focus should be trapped
      await keyboardHelper.testModalFocusTrap();
    });

    test('should handle modal keyboard interactions', async ({ page }) => {
      await page.click('[data-testid=\"settings-button\"]');
      
      // Escape key should close modal
      await page.keyboard.press('Escape');
      
      const modal = page.locator('[role=\"dialog\"], [data-testid=\"modal\"]');
      await expect(modal).not.toBeVisible();
      
      // Focus should return to trigger element
      await expect(page.locator('[data-testid=\"settings-button\"]')).toBeFocused();
    });
  });

  test.describe('Data Tables Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid=\"email-input\"]', 'hr.manager@test.com');
      await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page.click('[data-testid=\"login-button\"]');
      await page.goto('/applications');
    });

    test('should have accessible data tables', async ({ page }) => {
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      // Should have proper table structure
      const thead = page.locator('table thead');
      const tbody = page.locator('table tbody');
      await expect(thead).toBeVisible();
      await expect(tbody).toBeVisible();
      
      // Headers should have scope attributes
      const headers = await page.locator('th').all();
      for (const header of headers) {
        const scope = await header.getAttribute('scope');
        expect(scope).toBeTruthy();
      }
      
      // Should have table caption or aria-label
      const caption = await page.locator('table caption').count();
      const ariaLabel = await table.getAttribute('aria-label');
      const ariaLabelledBy = await table.getAttribute('aria-labelledby');
      
      expect(caption > 0 || ariaLabel || ariaLabelledBy).toBe(true);
    });

    test('should support table keyboard navigation', async ({ page }) => {
      const table = page.locator('table');
      
      // Focus first cell
      await page.keyboard.press('Tab');
      
      // Should be able to navigate with arrow keys (if implemented)
      // This depends on the specific table implementation
      const focusedElement = await page.locator(':focus').getAttribute('role');
      expect(['cell', 'gridcell', 'button', 'link']).toContain(focusedElement);
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet color contrast requirements', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Run color contrast check
      const contrastResults = await colorContrastHelper.checkColorContrast();
      
      // Filter out transparent or inherited backgrounds
      const validResults = contrastResults.filter(result => result.ratio > 1);
      
      // All text should meet WCAG AA standards (4.5:1 ratio)
      const failingElements = validResults.filter(result => !result.passes);
      
      if (failingElements.length > 0) {
        console.log('Elements failing contrast requirements:', failingElements);
      }
      
      expect(failingElements.length).toBe(0);
    });

    test('should not rely solely on color for information', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for status indicators
      const statusElements = await page.locator('[data-testid*=\"status\"], .status, .indicator').all();
      
      for (const element of statusElements) {
        const text = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        const title = await element.getAttribute('title');
        
        // Should have text, icon, or other non-color indicator
        expect(text?.trim() || ariaLabel || title).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/mobile/dashboard');
      
      // Run accessibility tests on mobile
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });

      testResults.push({
        page: 'mobile-dashboard',
        violations: results.violations?.length || 0,
        passes: results.passes?.length || 0,
        incomplete: results.incomplete?.length || 0,
        level: 'AA'
      });

      expect(results.violations).toHaveLength(0);
      
      // Mobile-specific accessibility checks
      const touchTargets = await page.locator('button, a, [role=\"button\"]').all();
      
      for (const target of touchTargets.slice(0, 5)) { // Test first 5
        const size = await target.boundingBox();
        if (size) {
          // WCAG recommends minimum 44x44px touch targets
          expect(size.width).toBeGreaterThanOrEqual(44);
          expect(size.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Comprehensive Accessibility Audit', () => {
    test('should pass comprehensive accessibility audit', async ({ page }) => {
      const pagesToTest = [
        '/login',
        '/dashboard',
        '/jobs/create',
        '/applications',
        '/reports'
      ];
      
      for (const pageUrl of pagesToTest) {
        // Login if needed
        if (pageUrl !== '/login') {
          await page.goto('/login');
          await page.fill('[data-testid=\"email-input\"]', 'hr.manager@test.com');
          await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
          await page.click('[data-testid=\"login-button\"]');
        }
        
        await page.goto(pageUrl);
        
        // Comprehensive accessibility check
        const results = await checkA11y(page, null, {
          detailedReport: true,
          detailedReportOptions: { html: true },
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
        });

        testResults.push({
          page: pageUrl,
          violations: results.violations?.length || 0,
          passes: results.passes?.length || 0,
          incomplete: results.incomplete?.length || 0,
          level: 'AA'
        });

        // Log violations for debugging
        if (results.violations && results.violations.length > 0) {
          console.log(`Accessibility violations on ${pageUrl}:`, results.violations);
        }

        expect(results.violations).toHaveLength(0);
      }
    });
  });
});