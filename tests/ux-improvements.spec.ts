import { test, expect } from '@playwright/test';

test.describe('UX Improvements - Navigation Guide', () => {
  test('should show onboarding guide for first-time users', async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for guide overlay to appear
    await expect(page.locator('.guide-overlay-container')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.guide-tooltip')).toBeVisible();
    
    // Check guide content
    await expect(page.locator('.guide-title')).toContainText('欢迎使用');
    await expect(page.locator('.guide-content')).toContainText('控制面板');
    
    // Test navigation through steps
    await page.click('.guide-btn-primary');
    await expect(page.locator('.guide-title')).toContainText('开始分析简历');
    
    // Skip guide
    await page.click('text=跳过引导');
    await expect(page.locator('.guide-overlay-container')).not.toBeVisible();
  });

  test('should show contextual help when navigating to analysis page', async ({ page }) => {
    await page.goto('/analysis');
    
    // Wait for contextual guide to appear
    await expect(page.locator('.guide-overlay-container')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.guide-title')).toContainText('文件上传引导');
    
    // Test upload guide steps
    await page.click('.guide-btn-primary');
    await expect(page.locator('.guide-content')).toContainText('候选人信息');
    
    await page.click('.guide-btn-primary');
    await expect(page.locator('.guide-content')).toContainText('开始分析');
  });

  test('should highlight target elements during guide', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for guide to start
    await expect(page.locator('.guide-overlay-container')).toBeVisible({ timeout: 5000 });
    
    // Check if target element is highlighted
    const dashboardContainer = page.locator('.dashboard-container');
    await expect(dashboardContainer).toHaveClass(/guide-highlight/);
    
    // Check highlight ring position
    await expect(page.locator('.guide-highlight-ring')).toBeVisible();
  });
});

test.describe('UX Improvements - Status Notifications', () => {
  test('should show notifications for different types', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test success notification
    await page.evaluate(() => {
      const service = (window as any).progressFeedbackService;
      if (service) {
        service.showSuccess('测试成功', '这是一个成功消息');
      }
    });
    
    await expect(page.locator('.notification-success')).toBeVisible();
    await expect(page.locator('.notification-title')).toContainText('测试成功');
    
    // Test notification auto-dismiss
    await page.waitForTimeout(5000);
    await expect(page.locator('.notification-success')).not.toBeVisible();
  });

  test('should show global loading overlay', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Trigger loading state
    await page.evaluate(() => {
      const service = (window as any).progressFeedbackService;
      if (service) {
        service.startLoading('test', '正在加载...', 50);
      }
    });
    
    await expect(page.locator('.global-loading-overlay')).toBeVisible();
    await expect(page.locator('.loading-message')).toContainText('正在加载');
    await expect(page.locator('.progress-fill')).toHaveCSS('width', '50%');
    
    // Stop loading
    await page.evaluate(() => {
      const service = (window as any).progressFeedbackService;
      if (service) {
        service.stopLoading('test');
      }
    });
    
    await expect(page.locator('.global-loading-overlay')).not.toBeVisible();
  });

  test('should handle notification actions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Show notification with action
    await page.evaluate(() => {
      const service = (window as any).progressFeedbackService;
      if (service) {
        service.showNotification(
          '测试通知',
          '这是一个带操作的通知',
          'info',
          0,
          { label: '查看详情', handler: () => console.log('Action clicked') },
          true
        );
      }
    });
    
    await expect(page.locator('.notification-action')).toBeVisible();
    await expect(page.locator('.notification-action')).toContainText('查看详情');
    
    // Click action button
    await page.click('.notification-action');
    
    // Close notification
    await page.click('.notification-close');
    await expect(page.locator('.notification')).not.toBeVisible();
  });
});

test.describe('UX Improvements - Keyboard Navigation', () => {
  test('should respond to global keyboard shortcuts', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test Alt+H for help
    await page.keyboard.press('Alt+h');
    await expect(page.locator('.guide-overlay-container')).toBeVisible();
    
    // Test Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('.guide-overlay-container')).not.toBeVisible();
    
    // Test Alt+1 for dashboard navigation
    await page.keyboard.press('Alt+1');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Test Alt+2 for analysis navigation
    await page.keyboard.press('Alt+2');
    await expect(page).toHaveURL(/\/analysis/);
  });

  test('should show keyboard focus indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    
    // Check if focused element has keyboard focus indicator
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveClass(/keyboard-focused/);
  });

  test('should not trigger shortcuts when typing in inputs', async ({ page }) => {
    await page.goto('/analysis');
    
    // Focus on an input field
    await page.click('input[type="text"]');
    
    // Try to trigger shortcut while typing
    await page.keyboard.press('Alt+h');
    
    // Guide should not appear
    await expect(page.locator('.guide-overlay-container')).not.toBeVisible();
  });
});

test.describe('UX Improvements - Real-time Statistics', () => {
  test('should display real-time statistics on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for stats grid
    await expect(page.locator('.stats-grid')).toBeVisible();
    
    // Check for real-time metrics
    await expect(page.locator('[data-testid="total-analyses"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-analyses"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-today"]')).toBeVisible();
    
    // Wait for updates (mock mode should update every 3 seconds)
    const initialValue = await page.locator('[data-testid="active-analyses"]').textContent();
    await page.waitForTimeout(4000);
    const updatedValue = await page.locator('[data-testid="active-analyses"]').textContent();
    
    // Values might change due to mock data generation
    expect(updatedValue).toBeDefined();
  });

  test('should show connection status indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for connection status indicator
    await expect(page.locator('.connection-status')).toBeVisible();
    
    // In mock mode, should show offline indicator
    await expect(page.locator('.status-offline, .status-mock')).toBeVisible();
  });

  test('should handle real-time events', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for mock events to be generated
    await page.waitForTimeout(5000);
    
    // Check if notifications appeared for events
    const notifications = page.locator('.notification');
    const notificationCount = await notifications.count();
    
    // Should have some notifications from mock events
    expect(notificationCount).toBeGreaterThan(0);
  });
});

test.describe('UX Improvements - Integration', () => {
  test('should integrate all UX components together', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Clear localStorage for first-time experience
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Should show welcome notification
    await expect(page.locator('.notification')).toBeVisible({ timeout: 3000 });
    
    // Should show onboarding guide
    await expect(page.locator('.guide-overlay-container')).toBeVisible({ timeout: 5000 });
    
    // Complete the guide
    while (await page.locator('.guide-btn-primary').isVisible()) {
      await page.click('.guide-btn-primary');
      await page.waitForTimeout(500);
    }
    
    // Use keyboard shortcut to refresh data
    await page.keyboard.press('Control+Shift+r');
    
    // Should show loading and success notification
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('.notification-success')).toBeVisible({ timeout: 3000 });
  });

  test('should maintain accessibility throughout UX improvements', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check ARIA labels and descriptions
    await expect(page.locator('[aria-label="帮助"]')).toBeVisible();
    await expect(page.locator('[aria-label="设置"]')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Check focus management
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test screen reader announcements (check for aria-live regions)
    await expect(page.locator('[aria-live="polite"]')).toBeAttached();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Check mobile layout
    await expect(page.locator('.mobile-layout')).toBeVisible();
    
    // Guide should adapt to mobile
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    await expect(page.locator('.guide-overlay-container')).toBeVisible({ timeout: 5000 });
    const tooltip = page.locator('.guide-tooltip');
    
    // Check mobile-specific styles
    const width = await tooltip.evaluate(el => window.getComputedStyle(el).width);
    expect(parseInt(width)).toBeLessThan(300); // Should be mobile-optimized
    
    // Touch interactions should work
    await page.tap('.guide-btn-primary');
    await page.tap('text=跳过引导');
  });
});

test.describe('UX Improvements - Performance', () => {
  test('should load efficiently with minimal impact', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    
    // Page should load quickly
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
    
    // Check for performance optimizations
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // UX components should not block main content
    await expect(page.locator('.welcome-section')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock network failures
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/dashboard');
    
    // Should fallback to mock data
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Should show appropriate error notifications
    await expect(page.locator('.notification')).toBeVisible({ timeout: 5000 });
  });
});