import { test, expect, Page, devices } from '@playwright/test';

/**
 * Mobile Responsive & Touch Interaction E2E Tests
 * 
 * Tests mobile-specific features and responsive design:
 * - Touch gestures and interactions
 * - Responsive layout adaptation
 * - Mobile navigation patterns
 * - Device-specific optimizations
 * - Performance on mobile devices
 * - Offline functionality
 */

interface MobileTestDevice {
  name: string;
  device: any;
  viewport: { width: number; height: number };
  userAgent: string;
}

// Mobile device configurations
const mobileDevices: MobileTestDevice[] = [
  {
    name: 'iPhone 12',
    device: devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    userAgent: devices['iPhone 12'].userAgent
  },
  {
    name: 'iPhone 14 Pro',
    device: devices['iPhone 14 Pro'],
    viewport: { width: 393, height: 852 },
    userAgent: devices['iPhone 14 Pro'].userAgent
  },
  {
    name: 'Pixel 5',
    device: devices['Pixel 5'],
    viewport: { width: 393, height: 851 },
    userAgent: devices['Pixel 5'].userAgent
  },
  {
    name: 'Samsung Galaxy S21',
    device: devices['Galaxy S21'],
    viewport: { width: 384, height: 854 },
    userAgent: devices['Galaxy S21'].userAgent
  },
  {
    name: 'iPad Pro',
    device: devices['iPad Pro'],
    viewport: { width: 1024, height: 1366 },
    userAgent: devices['iPad Pro'].userAgent
  }
];

// Touch gesture utilities
class TouchGestureHelper {
  constructor(private page: Page) {}

  async swipeLeft(selector: string, distance = 200) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const startX = box.x + box.width - 50;
    const startY = box.y + box.height / 2;
    const endX = startX - distance;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, startY);
    await this.page.mouse.up();
  }

  async swipeRight(selector: string, distance = 200) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const startX = box.x + 50;
    const startY = box.y + box.height / 2;
    const endX = startX + distance;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, startY);
    await this.page.mouse.up();
  }

  async swipeUp(selector: string, distance = 200) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height - 50;
    const endY = startY - distance;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, endY);
    await this.page.mouse.up();
  }

  async swipeDown(selector: string, distance = 200) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const startX = box.x + box.width / 2;
    const startY = box.y + 50;
    const endY = startY + distance;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, endY);
    await this.page.mouse.up();
  }

  async pinchZoom(selector: string, scale = 1.5) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Simulate two-finger pinch
    await this.page.touchscreen.tap(centerX - 50, centerY);
    await this.page.touchscreen.tap(centerX + 50, centerY);
    
    // Note: Actual pinch zoom simulation is complex in Playwright
    // This is a simplified version
  }

  async longPress(selector: string, duration = 1000) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    await this.page.mouse.move(centerX, centerY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(duration);
    await this.page.mouse.up();
  }
}

// Mobile-specific page objects
class MobileDashboardPage {
  constructor(private page: Page, private touchHelper: TouchGestureHelper) {}

  async navigateTo() {
    await this.page.goto('/mobile/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async openMobileMenu() {
    await this.page.click('[data-testid=\"mobile-menu-button\"]');
    await expect(this.page.locator('[data-testid=\"mobile-menu\"]')).toBeVisible();
  }

  async closeMobileMenu() {
    await this.page.click('[data-testid=\"mobile-menu-overlay\"]');
    await expect(this.page.locator('[data-testid=\"mobile-menu\"]')).not.toBeVisible();
  }

  async swipeToCard(direction: 'left' | 'right') {
    if (direction === 'left') {
      await this.touchHelper.swipeLeft('[data-testid=\"card-carousel\"]');
    } else {
      await this.touchHelper.swipeRight('[data-testid=\"card-carousel\"]');
    }
  }

  async pullToRefresh() {
    await this.touchHelper.swipeDown('[data-testid=\"refresh-container\"]', 150);
    await expect(this.page.locator('[data-testid=\"refresh-indicator\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"refresh-indicator\"]')).not.toBeVisible({ timeout: 5000 });
  }

  async checkResponsiveLayout() {
    // Check key responsive elements
    await expect(this.page.locator('[data-testid=\"mobile-header\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"desktop-sidebar\"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid=\"mobile-navigation\"]')).toBeVisible();
  }
}

class MobileUploadPage {
  constructor(private page: Page, private touchHelper: TouchGestureHelper) {}

  async navigateTo() {
    await this.page.goto('/mobile/upload');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadResumeWithCamera() {
    await this.page.click('[data-testid=\"camera-upload-button\"]');
    
    // Simulate camera permission grant
    await this.page.context().grantPermissions(['camera']);
    
    // In a real test, this would interact with actual camera
    // For testing, we'll simulate the flow
    await expect(this.page.locator('[data-testid=\"camera-interface\"]')).toBeVisible();
    await this.page.click('[data-testid=\"capture-button\"]');
    
    await expect(this.page.locator('[data-testid=\"preview-image\"]')).toBeVisible();
    await this.page.click('[data-testid=\"confirm-capture\"]');
  }

  async uploadResumeFromFiles() {
    const fileInput = this.page.locator('[data-testid=\"file-input\"]');
    await fileInput.setInputFiles('test-data/resumes/sample-resume.pdf');
    
    await expect(this.page.locator('[data-testid=\"upload-progress\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"upload-success\"]')).toBeVisible({ timeout: 10000 });
  }

  async testDragAndDrop() {
    // Mobile drag and drop simulation
    const dragArea = this.page.locator('[data-testid=\"drag-drop-area\"]');
    
    await this.touchHelper.longPress('[data-testid=\"draggable-file\"]');
    await expect(this.page.locator('[data-testid=\"drag-preview\"]')).toBeVisible();
    
    // Move to drop zone
    const dropBox = await dragArea.boundingBox();
    if (dropBox) {
      await this.page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2);
      await this.page.mouse.up();
    }
    
    await expect(this.page.locator('[data-testid=\"drop-success\"]')).toBeVisible();
  }
}

class MobileResultsPage {
  constructor(private page: Page, private touchHelper: TouchGestureHelper) {}

  async navigateTo() {
    await this.page.goto('/mobile/results');
    await this.page.waitForLoadState('networkidle');
  }

  async swipeThroughResults() {
    const resultCards = await this.page.locator('[data-testid=\"result-card\"]').count();
    
    for (let i = 0; i < resultCards - 1; i++) {
      await this.touchHelper.swipeLeft('[data-testid=\"results-container\"]');
      await this.page.waitForTimeout(500);
      
      // Verify card changed
      const activeCard = await this.page.locator('[data-testid=\"active-card\"]').getAttribute('data-index');
      expect(parseInt(activeCard || '0')).toBe(i + 1);
    }
  }

  async testInfiniteScroll() {
    // Scroll to bottom to trigger load more
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await expect(this.page.locator('[data-testid=\"loading-more\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"loading-more\"]')).not.toBeVisible({ timeout: 5000 });
    
    // Check that more items were loaded
    const initialCount = 10; // Assume initial load
    const finalCount = await this.page.locator('[data-testid=\"result-item\"]').count();
    expect(finalCount).toBeGreaterThan(initialCount);
  }

  async testAccordionExpansion() {
    await this.page.click('[data-testid=\"result-summary-0\"]');
    await expect(this.page.locator('[data-testid=\"result-details-0\"]')).toBeVisible();
    
    // Should collapse when tapped again
    await this.page.click('[data-testid=\"result-summary-0\"]');
    await expect(this.page.locator('[data-testid=\"result-details-0\"]')).not.toBeVisible();
  }
}

// Test suite for each device
mobileDevices.forEach((deviceConfig) => {
  test.describe(`Mobile Tests - ${deviceConfig.name}`, () => {
    test.use({ ...deviceConfig.device });
    
    let touchHelper: TouchGestureHelper;
    let mobileDashboard: MobileDashboardPage;
    let mobileUpload: MobileUploadPage;
    let mobileResults: MobileResultsPage;

    test.beforeEach(async ({ page }) => {
      touchHelper = new TouchGestureHelper(page);
      mobileDashboard = new MobileDashboardPage(page, touchHelper);
      mobileUpload = new MobileUploadPage(page, touchHelper);
      mobileResults = new MobileResultsPage(page, touchHelper);

      // Mobile-optimized login
      await page.goto('/login');
      await page.fill('[data-testid=\"email-input\"]', 'mobile.user@test.com');
      await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page.click('[data-testid=\"login-button\"]');
      await page.waitForURL(/.*\\/dashboard/);
    });

    test('should adapt layout for mobile viewport', async ({ page }) => {
      await mobileDashboard.navigateTo();
      await mobileDashboard.checkResponsiveLayout();
      
      // Check viewport-specific styles
      const headerHeight = await page.locator('[data-testid=\"mobile-header\"]').evaluate(el => 
        window.getComputedStyle(el).height
      );
      expect(parseInt(headerHeight)).toBeGreaterThan(60); // Mobile header should be taller
      
      // Check touch target sizes (minimum 44px)
      const buttonSize = await page.locator('[data-testid=\"mobile-menu-button\"]').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: parseInt(styles.width),
          height: parseInt(styles.height)
        };
      });
      
      expect(buttonSize.width).toBeGreaterThanOrEqual(44);
      expect(buttonSize.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle mobile navigation patterns', async ({ page }) => {
      await mobileDashboard.navigateTo();
      
      // Test hamburger menu
      await mobileDashboard.openMobileMenu();
      
      // Menu should be accessible and properly sized
      const menuWidth = await page.locator('[data-testid=\"mobile-menu\"]').evaluate(el => 
        parseInt(window.getComputedStyle(el).width)
      );
      
      // Menu should take reasonable portion of screen (not too narrow or wide)
      expect(menuWidth).toBeGreaterThan(200);
      expect(menuWidth).toBeLessThan(deviceConfig.viewport.width * 0.9);
      
      // Test menu item navigation
      await page.click('[data-testid=\"menu-jobs\"]');
      await expect(page).toHaveURL(/.*\\/jobs/);
      
      // Test swipe to close menu (if reopened)
      await page.goto('/mobile/dashboard');
      await mobileDashboard.openMobileMenu();
      await touchHelper.swipeLeft('[data-testid=\"mobile-menu\"]');
      await expect(page.locator('[data-testid=\"mobile-menu\"]')).not.toBeVisible();
    });

    test('should support touch gestures', async ({ page }) => {
      await mobileDashboard.navigateTo();
      
      // Test card carousel swiping
      const initialCard = await page.locator('[data-testid=\"active-card-index\"]').textContent();
      
      await mobileDashboard.swipeToCard('left');
      await page.waitForTimeout(500);
      
      const newCard = await page.locator('[data-testid=\"active-card-index\"]').textContent();
      expect(newCard).not.toBe(initialCard);
      
      // Test pull-to-refresh
      await mobileDashboard.pullToRefresh();
      
      // Should show updated data timestamp
      const timestamp = await page.locator('[data-testid=\"last-updated\"]').textContent();
      expect(timestamp).toBeTruthy();
    });

    test('should handle file upload on mobile', async ({ page }) => {
      await mobileUpload.navigateTo();
      
      // Test regular file upload
      await mobileUpload.uploadResumeFromFiles();
      
      // Test camera upload (if supported on device)
      if (deviceConfig.name.includes('iPhone') || deviceConfig.name.includes('Pixel')) {
        await mobileUpload.uploadResumeWithCamera();
      }
      
      // Test mobile-optimized drag and drop
      await mobileUpload.testDragAndDrop();
    });

    test('should optimize performance for mobile', async ({ page }) => {
      await mobileDashboard.navigateTo();
      
      // Measure page load performance
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      // Mobile performance thresholds
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // < 2s
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1800); // < 1.8s
      
      // Test scroll performance
      const scrollStartTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 100));
        await page.waitForTimeout(50);
      }
      
      const scrollDuration = Date.now() - scrollStartTime;
      expect(scrollDuration).toBeLessThan(1000); // Smooth scrolling
    });

    test('should handle orientation changes', async ({ page }) => {
      await mobileDashboard.navigateTo();
      
      // Test portrait layout
      await mobileDashboard.checkResponsiveLayout();
      
      // Simulate orientation change to landscape (if not tablet)
      if (!deviceConfig.name.includes('iPad')) {
        await page.setViewportSize({
          width: deviceConfig.viewport.height,
          height: deviceConfig.viewport.width
        });
        
        await page.waitForTimeout(1000); // Allow layout adjustment
        
        // Check landscape adaptations
        const headerInLandscape = await page.locator('[data-testid=\"mobile-header\"]').isVisible();
        expect(headerInLandscape).toBe(true);
        
        // Navigation should adapt to landscape
        const navLayout = await page.locator('[data-testid=\"mobile-navigation\"]').evaluate(el => 
          window.getComputedStyle(el).flexDirection
        );
        expect(navLayout).toBeTruthy();
      }
    });

    test('should work offline with service worker', async ({ page }) => {
      await mobileDashboard.navigateTo();
      
      // Wait for service worker registration
      await page.waitForFunction(() => 'serviceWorker' in navigator);
      
      // Go offline
      await page.context().setOffline(true);
      
      // Try to navigate (should use cached content)
      await page.click('[data-testid=\"menu-jobs\"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid=\"offline-indicator\"]')).toBeVisible();
      
      // Basic functionality should still work
      await expect(page.locator('[data-testid=\"jobs-list\"]')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should sync when online
      await expect(page.locator('[data-testid=\"sync-indicator\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"offline-indicator\"]')).not.toBeVisible();
    });

    test('should handle mobile-specific interactions in results', async ({ page }) => {
      await mobileResults.navigateTo();
      
      // Test swipe navigation through results
      await mobileResults.swipeThroughResults();
      
      // Test infinite scroll
      await mobileResults.testInfiniteScroll();
      
      // Test accordion expansion/collapse
      await mobileResults.testAccordionExpansion();
    });

    test('should provide accessibility on mobile', async ({ page }) => {
      await mobileDashboard.navigateTo();
      
      // Test screen reader compatibility
      const menuButton = page.locator('[data-testid=\"mobile-menu-button\"]');
      const ariaLabel = await menuButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      
      // Test focus management
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBeTruthy();
      
      // Test minimum touch target sizes
      const touchTargets = await page.locator('[data-testid]').all();
      
      for (const target of touchTargets.slice(0, 5)) { // Test first 5
        const isButton = await target.evaluate(el => 
          el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
        );
        
        if (isButton) {
          const size = await target.boundingBox();
          if (size) {
            expect(size.width).toBeGreaterThanOrEqual(44);
            expect(size.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });
});

// Cross-device compatibility tests
test.describe('Cross-Device Compatibility', () => {
  test('should maintain functionality across all mobile devices', async ({ browser }) => {
    const results: Record<string, boolean> = {};
    
    for (const deviceConfig of mobileDevices) {
      const context = await browser.newContext(deviceConfig.device);
      const page = await context.newPage();
      
      try {
        // Basic functionality test
        await page.goto('/login');
        await page.fill('[data-testid=\"email-input\"]', 'test@example.com');
        await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
        await page.click('[data-testid=\"login-button\"]');
        
        // Should reach dashboard
        await page.waitForURL(/.*\\/dashboard/, { timeout: 10000 });
        
        results[deviceConfig.name] = true;
      } catch (error) {
        console.error(`Failed on ${deviceConfig.name}:`, error);
        results[deviceConfig.name] = false;
      } finally {
        await context.close();
      }
    }
    
    // All devices should pass
    const failedDevices = Object.entries(results).filter(([_, passed]) => !passed);
    expect(failedDevices).toHaveLength(0);
  });

  test('should handle viewport size variations', async ({ browser }) => {
    const viewportSizes = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 414, height: 896 }, // iPhone 11
      { width: 360, height: 640 }, // Small Android
      { width: 768, height: 1024 }, // iPad Portrait
    ];
    
    for (const viewport of viewportSizes) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      
      await page.goto('/mobile/dashboard');
      
      // Check responsive layout
      const mobileHeader = await page.locator('[data-testid=\"mobile-header\"]').isVisible();
      expect(mobileHeader).toBe(true);
      
      // Check content doesn't overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1); // Allow 1px tolerance
      
      await context.close();
    }
  });
});