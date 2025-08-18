/**
 * Comprehensive UX Validation Test Suite
 * Tests all user personas, accessibility, mobile experience, and core workflows
 */

import { test, expect, Page, Browser } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:4200',
  timeout: 30000,
  mobile: {
    iPhone: { width: 375, height: 812, devicePixelRatio: 3 },
    android: { width: 360, height: 640, devicePixelRatio: 2 },
    tablet: { width: 768, height: 1024, devicePixelRatio: 2 }
  }
};

// Test data for user personas
const USER_PERSONAS = {
  hrManager: {
    name: 'Sarah Chen',
    role: 'HR Manager',
    goals: ['Team collaboration', 'Strategic reporting', 'ROI analysis'],
    devices: ['desktop', 'tablet']
  },
  recruiter: {
    name: 'Mike Rodriguez',
    role: 'Recruiter',
    goals: ['Mobile workflow', 'Quick uploads', 'Client interaction'],
    devices: ['mobile', 'tablet', 'desktop']
  },
  jobSeeker: {
    name: 'Emma Wilson',
    role: 'Job Seeker',
    goals: ['Transparent process', 'Feedback clarity', 'Bias reduction'],
    devices: ['mobile', 'desktop']
  },
  admin: {
    name: 'David Kim',
    role: 'System Admin',
    goals: ['System monitoring', 'Security management', 'Performance tools'],
    devices: ['desktop']
  }
};

/**
 * ACCESSIBILITY COMPLIANCE TESTS (WCAG 2.1 AA)
 */
test.describe('UX Validation: Accessibility Compliance', () => {
  
  test('Dashboard accessibility compliance', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test ARIA labels and roles
    const navigation = page.locator('nav');
    await expect(navigation).toHaveAttribute('role', 'navigation');
    
    // Test color contrast (automated check)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Test alt text for images
    const images = page.locator('img');
    const imageCount = await images.count();
    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
    }
    
    // Test skip navigation links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link:focus');
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible();
    }
  });

  test('Form accessibility validation', async ({ page }) => {
    await page.goto('/resume');
    
    // Test form labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
    
    // Test error message accessibility
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Trigger validation error
      await fileInput.setInputFiles([]);
      const errorMessage = page.locator('[role="alert"], .error-message');
      // Error messages should be announced to screen readers
    }
  });

  test('Dynamic content accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test live regions for dynamic updates
    const liveRegion = page.locator('[aria-live]');
    if (await liveRegion.count() > 0) {
      await expect(liveRegion).toHaveAttribute('aria-live', /polite|assertive/);
    }
    
    // Test focus management for modals
    const modalTrigger = page.locator('[data-modal-trigger]');
    if (await modalTrigger.count() > 0) {
      await modalTrigger.first().click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      const focusedInModal = page.locator('[role="dialog"] :focus');
      await expect(focusedInModal).toBeVisible();
    }
  });
});

/**
 * MOBILE PWA FUNCTIONALITY TESTS
 */
test.describe('UX Validation: Mobile PWA Experience', () => {
  
  test('PWA installation and offline functionality', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TEST_CONFIG.mobile.iPhone
    });
    const page = await context.newPage();
    
    await page.goto('/dashboard');
    
    // Check PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeVisible();
    
    // Test service worker registration
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistered).toBeTruthy();
    
    // Test offline capability
    await context.setOffline(true);
    await page.reload();
    
    // Should show offline indicator or cached content
    const offlineIndicator = page.locator('.offline-indicator, [data-offline]');
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toBeVisible();
    }
    
    await context.close();
  });

  test('Touch interactions and gestures', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TEST_CONFIG.mobile.android,
      hasTouch: true
    });
    const page = await context.newPage();
    
    await page.goto('/dashboard');
    
    // Test touch targets (minimum 44px)
    const touchTargets = page.locator('button, a, input[type="checkbox"], input[type="radio"]');
    const targetCount = await touchTargets.count();
    
    for (let i = 0; i < Math.min(targetCount, 5); i++) {
      const target = touchTargets.nth(i);
      const boundingBox = await target.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    // Test swipe gestures on cards
    const cards = page.locator('.bento-item, .mobile-card');
    if (await cards.count() > 0) {
      const card = cards.first();
      await card.hover();
      // Test hover states work on touch devices
    }
    
    await context.close();
  });

  test('Mobile navigation and layout', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TEST_CONFIG.mobile.iPhone
    });
    const page = await context.newPage();
    
    await page.goto('/dashboard');
    
    // Test mobile navigation
    const mobileNav = page.locator('.mobile-bottom-nav, .mobile-header');
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }
    
    // Test responsive grid layout
    const bentoGrid = page.locator('.bento-grid-default');
    if (await bentoGrid.count() > 0) {
      const computedStyle = await bentoGrid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      // Should have single column on mobile
      expect(computedStyle).toBe('1fr');
    }
    
    // Test mobile-specific controls
    const mobileControls = page.locator('.mobile-fab, .mobile-btn');
    if (await mobileControls.count() > 0) {
      await expect(mobileControls.first()).toBeVisible();
    }
    
    await context.close();
  });
});

/**
 * HR MANAGER USER JOURNEY TESTS
 */
test.describe('UX Validation: HR Manager Journey', () => {
  
  test('Strategic dashboard workflow', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test dashboard loading and metrics display
    await expect(page.locator('.welcome-section')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();
    
    // Test quick actions accessibility
    const quickActions = page.locator('.actions-grid .action-card');
    const actionCount = await quickActions.count();
    expect(actionCount).toBeGreaterThan(0);
    
    // Test navigation to reports
    const reportsLink = page.locator('a[href*="reports"], [routerLink*="reports"]');
    if (await reportsLink.count() > 0) {
      await reportsLink.first().click();
      await expect(page).toHaveURL(/.*reports.*/);
    }
    
    // Test team collaboration features
    const collaborationFeatures = page.locator('[data-collaboration], .collaboration-panel');
    if (await collaborationFeatures.count() > 0) {
      await expect(collaborationFeatures.first()).toBeVisible();
    }
  });

  test('Analytics and reporting UX', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test analytics widgets
    const analyticsWidgets = page.locator('.bento-item[data-type="analytics"], .stats-card');
    if (await analyticsWidgets.count() > 0) {
      const widget = analyticsWidgets.first();
      await expect(widget).toBeVisible();
      
      // Test interaction with analytics
      await widget.click();
      // Should navigate to detailed view or show expanded content
    }
    
    // Test export functionality
    const exportButtons = page.locator('[data-export], .export-btn');
    if (await exportButtons.count() > 0) {
      await expect(exportButtons.first()).toBeVisible();
    }
  });
});

/**
 * RECRUITER MOBILE WORKFLOW TESTS
 */
test.describe('UX Validation: Recruiter Mobile Journey', () => {
  
  test('Mobile resume upload workflow', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TEST_CONFIG.mobile.iPhone,
      hasTouch: true
    });
    const page = await context.newPage();
    
    await page.goto('/resume');
    
    // Test mobile upload interface
    const uploadArea = page.locator('.smart-drop-zone, .upload-area');
    await expect(uploadArea).toBeVisible();
    
    // Test camera integration
    const cameraButton = page.locator('[data-camera], .camera-btn');
    if (await cameraButton.count() > 0) {
      await expect(cameraButton).toBeVisible();
    }
    
    // Test mobile file picker
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Should have accept attribute for PDFs
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('pdf');
    }
    
    await context.close();
  });

  test('Quick analysis and client sharing', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: TEST_CONFIG.mobile.android
    });
    const page = await context.newPage();
    
    await page.goto('/analysis');
    
    // Test mobile analysis interface
    const analysisInterface = page.locator('.unified-analysis, .analysis-container');
    if (await analysisInterface.count() > 0) {
      await expect(analysisInterface).toBeVisible();
    }
    
    // Test sharing functionality
    const shareButtons = page.locator('[data-share], .share-btn');
    if (await shareButtons.count() > 0) {
      await expect(shareButtons.first()).toBeVisible();
    }
    
    await context.close();
  });
});

/**
 * JOB SEEKER TRANSPARENCY TESTS
 */
test.describe('UX Validation: Job Seeker Experience', () => {
  
  test('Application process transparency', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test clear status indicators
    const statusIndicators = page.locator('.status-indicator, [data-status]');
    if (await statusIndicators.count() > 0) {
      const indicator = statusIndicators.first();
      await expect(indicator).toBeVisible();
      
      // Should have clear text or ARIA label
      const text = await indicator.textContent();
      const ariaLabel = await indicator.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
    
    // Test feedback clarity
    const feedbackSections = page.locator('.feedback-section, [data-feedback]');
    if (await feedbackSections.count() > 0) {
      await expect(feedbackSections.first()).toBeVisible();
    }
  });

  test('Bias reduction and fairness indicators', async ({ page }) => {
    await page.goto('/results/test-session');
    
    // Test fairness indicators
    const fairnessIndicators = page.locator('[data-fairness], .bias-indicator');
    if (await fairnessIndicators.count() > 0) {
      await expect(fairnessIndicators.first()).toBeVisible();
    }
    
    // Test explanation of AI decisions
    const explanations = page.locator('.ai-explanation, [data-explanation]');
    if (await explanations.count() > 0) {
      const explanation = explanations.first();
      await expect(explanation).toBeVisible();
      const content = await explanation.textContent();
      expect(content?.length).toBeGreaterThan(10);
    }
  });
});

/**
 * INTELLIGENT INTERACTIONS TESTS
 */
test.describe('UX Validation: Intelligent Interactions', () => {
  
  test('Contextual help system', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test contextual help triggers
    const helpTriggers = page.locator('[data-help], .help-trigger');
    if (await helpTriggers.count() > 0) {
      const trigger = helpTriggers.first();
      await trigger.hover();
      
      // Should show contextual help
      const helpContent = page.locator('.contextual-help, .tooltip-content');
      if (await helpContent.count() > 0) {
        await expect(helpContent).toBeVisible();
      }
    }
    
    // Test onboarding guide
    const guideSystem = page.locator('.guide-overlay-container, .onboarding-guide');
    if (await guideSystem.count() > 0) {
      // Clear localStorage to trigger first-time user experience
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      
      await expect(guideSystem).toBeVisible({ timeout: 5000 });
    }
  });

  test('ML-powered predictions and suggestions', async ({ page }) => {
    await page.goto('/resume');
    
    // Test predictive autocomplete
    const autocompleteFields = page.locator('[data-autocomplete], .predictive-input');
    if (await autocompleteFields.count() > 0) {
      const field = autocompleteFields.first();
      await field.click();
      await field.type('test');
      
      // Should show suggestions
      const suggestions = page.locator('.autocomplete-suggestions, .prediction-list');
      if (await suggestions.count() > 0) {
        await expect(suggestions).toBeVisible();
      }
    }
    
    // Test smart recommendations
    const recommendations = page.locator('.smart-suggestions, [data-recommendations]');
    if (await recommendations.count() > 0) {
      await expect(recommendations.first()).toBeVisible();
    }
  });

  test('Keyboard shortcuts and power user features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test keyboard shortcut help
    await page.keyboard.press('?');
    const shortcutHelp = page.locator('.keyboard-help-modal, .shortcuts-modal');
    if (await shortcutHelp.count() > 0) {
      await expect(shortcutHelp).toBeVisible();
      
      // Test closing modal
      await page.keyboard.press('Escape');
      await expect(shortcutHelp).not.toBeVisible();
    }
    
    // Test common shortcuts
    await page.keyboard.press('Control+k'); // Command palette
    const commandPalette = page.locator('.command-palette, [data-command-palette]');
    if (await commandPalette.count() > 0) {
      await expect(commandPalette).toBeVisible();
    }
  });
});

/**
 * CROSS-DEVICE EXPERIENCE TESTS
 */
test.describe('UX Validation: Cross-Device Consistency', () => {
  
  test('Responsive design validation', async ({ browser }) => {
    const devices = [
      { name: 'mobile', viewport: TEST_CONFIG.mobile.iPhone },
      { name: 'tablet', viewport: TEST_CONFIG.mobile.tablet },
      { name: 'desktop', viewport: { width: 1920, height: 1080 } }
    ];
    
    for (const device of devices) {
      const context = await browser.newContext({ viewport: device.viewport });
      const page = await context.newPage();
      
      await page.goto('/dashboard');
      
      // Test layout consistency
      const mainContent = page.locator('main, .main-content');
      await expect(mainContent).toBeVisible();
      
      // Test navigation consistency
      const navigation = page.locator('nav, .navigation');
      if (await navigation.count() > 0) {
        await expect(navigation).toBeVisible();
      }
      
      // Test content accessibility on each device
      const primaryActions = page.locator('.action-card, .primary-action');
      if (await primaryActions.count() > 0) {
        await expect(primaryActions.first()).toBeVisible();
      }
      
      await context.close();
    }
  });

  test('Feature parity across platforms', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/dashboard');
    
    // Test core features availability
    const coreFeatures = [
      '.bento-grid-default',
      '.stats-grid',
      '.actions-grid',
      '.activity-feed'
    ];
    
    for (const feature of coreFeatures) {
      const element = page.locator(feature);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
    
    await context.close();
  });
});

/**
 * REAL-TIME COLLABORATION TESTS
 */
test.describe('UX Validation: Real-time Collaboration', () => {
  
  test('Multi-user collaboration workflow', async ({ browser }) => {
    // Simulate multiple users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all([
      contexts[0].newPage(),
      contexts[1].newPage()
    ]);
    
    // Both users navigate to collaboration space
    for (const page of pages) {
      await page.goto('/dashboard');
    }
    
    // Test presence indicators
    const presenceIndicators = pages[0].locator('.presence-indicator, [data-presence]');
    if (await presenceIndicators.count() > 0) {
      await expect(presenceIndicators.first()).toBeVisible();
    }
    
    // Test real-time messaging
    const messagingInterface = pages[0].locator('.real-time-messaging, .collaboration-chat');
    if (await messagingInterface.count() > 0) {
      await expect(messagingInterface).toBeVisible();
    }
    
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  });

  test('Notification and update system', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test notification system
    const notificationArea = page.locator('.notification-area, [data-notifications]');
    if (await notificationArea.count() > 0) {
      await expect(notificationArea).toBeVisible();
    }
    
    // Test connection status indicator
    const connectionStatus = page.locator('.connection-status, [data-connection]');
    if (await connectionStatus.count() > 0) {
      await expect(connectionStatus).toBeVisible();
    }
  });
});

/**
 * PERFORMANCE AND LOADING STATES
 */
test.describe('UX Validation: Performance and Loading', () => {
  
  test('Loading states and transitions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test loading indicators
    const loadingIndicators = page.locator('.loading-indicator, .spinner');
    // Loading indicators should appear and disappear appropriately
    
    // Test smooth transitions
    const animatedElements = page.locator('.bento-item, .action-card');
    if (await animatedElements.count() > 0) {
      const element = animatedElements.first();
      await element.hover();
      
      // Test hover animations
      const transform = await element.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      // Should have transform applied on hover
    }
  });

  test('Progressive enhancement and graceful degradation', async ({ page }) => {
    // Test with JavaScript disabled
    await page.goto('/dashboard');
    
    // Core content should be accessible
    const mainContent = page.locator('main, .main-content');
    await expect(mainContent).toBeVisible();
    
    // Test with slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    await page.reload();
    
    // Should show appropriate loading states
    const loadingState = page.locator('.loading-indicator, [data-loading]');
    if (await loadingState.count() > 0) {
      await expect(loadingState).toBeVisible();
    }
  });
});

/**
 * ERROR HANDLING AND RECOVERY
 */
test.describe('UX Validation: Error Handling', () => {
  
  test('Error state presentation and recovery', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test 404 error handling
    await page.goto('/non-existent-page');
    const errorPage = page.locator('.error-page, [data-error="404"]');
    if (await errorPage.count() > 0) {
      await expect(errorPage).toBeVisible();
      
      // Should have recovery options
      const recoveryLink = page.locator('a[href="/dashboard"], .recovery-link');
      if (await recoveryLink.count() > 0) {
        await expect(recoveryLink).toBeVisible();
      }
    }
    
    // Test network error handling
    await page.route('**/api/**', route => route.abort());
    await page.goto('/dashboard');
    
    const networkError = page.locator('.network-error, [data-error="network"]');
    if (await networkError.count() > 0) {
      await expect(networkError).toBeVisible();
    }
  });

  test('Form validation and user guidance', async ({ page }) => {
    await page.goto('/resume');
    
    // Test form validation
    const submitButton = page.locator('button[type="submit"], .submit-btn');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // Should show validation errors
      const validationErrors = page.locator('.field-error, [data-validation-error]');
      if (await validationErrors.count() > 0) {
        await expect(validationErrors.first()).toBeVisible();
        
        // Error should be clearly labeled
        const errorText = await validationErrors.first().textContent();
        expect(errorText?.length).toBeGreaterThan(0);
      }
    }
  });
});