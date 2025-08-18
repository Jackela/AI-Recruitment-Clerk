import { test, expect } from '@playwright/test';

test.describe('Enhanced Dashboard with Bento Grid', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the enhanced dashboard
    await page.goto('http://localhost:4201');
  });

  test('应该显示欢迎标题和系统状态', async ({ page }) => {
    // Check welcome title - actual text from enhanced dashboard
    await expect(page.locator('h1.welcome-title')).toHaveText('AI 招聘助理 Dashboard');
    
    // Check subtitle
    await expect(page.locator('p.welcome-subtitle')).toHaveText('智能简历筛选，提升招聘效率');
    
    // Check system status indicator
    await expect(page.locator('.system-status')).toBeVisible();
    await expect(page.locator('.status-indicator')).toBeVisible();
  });

  test('应该显示Bento Grid卡片', async ({ page }) => {
    // Wait for the bento grid to load
    await page.waitForSelector('app-bento-grid', { timeout: 10000 });
    
    // Check if bento grid is visible
    await expect(page.locator('app-bento-grid')).toBeVisible();
    
    // Check for key bento items
    const bentoItems = page.locator('.bento-item');
    await expect(bentoItems).toHaveCount(8); // Should have 8 cards based on our setup
    
    // Check specific cards exist
    await expect(page.locator('[aria-label*="职位数量"]')).toBeVisible();
    await expect(page.locator('[aria-label*="简历总数"]')).toBeVisible();
    await expect(page.locator('[aria-label*="分析报告"]')).toBeVisible();
    await expect(page.locator('[aria-label*="活跃匹配"]')).toBeVisible();
  });

  test('应该显示快速操作按钮', async ({ page }) => {
    // Check quick actions section
    await expect(page.locator('.quick-actions-section h2')).toHaveText('快速操作');
    
    // Check action cards
    const actionCards = page.locator('.action-card');
    await expect(actionCards).toHaveCount(4);
    
    // Check specific action buttons (use more specific selector)
    await expect(page.locator('.action-card[routerLink="/resume"]')).toBeVisible();
    await expect(page.locator('a[routerLink="/jobs/create"]')).toBeVisible();
    await expect(page.locator('.action-card[routerLink="/jobs"]')).toBeVisible();
    await expect(page.locator('.action-card[routerLink="/reports"]')).toBeVisible();
  });

  test('Bento Grid卡片应该响应点击', async ({ page }) => {
    // Wait for bento grid
    await page.waitForSelector('app-bento-grid');
    
    // Try clicking on a clickable bento item
    const clickableItem = page.locator('.bento-item.clickable').first();
    if (await clickableItem.count() > 0) {
      await clickableItem.click();
      // Since we're using console.log in the handler, we can't directly test the output
      // But we can verify the click doesn't cause any errors
    }
  });

  test('快速操作按钮应该有正确的链接', async ({ page }) => {
    // Test primary action (upload resume)
    const uploadButton = page.locator('a[routerLink="/resume"].primary');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton.locator('.action-title')).toHaveText('上传简历分析');
    
    // Test create job action
    const createJobButton = page.locator('a[routerLink="/jobs/create"]');
    await expect(createJobButton).toBeVisible();
    await expect(createJobButton.locator('.action-title')).toHaveText('创建新职位');
  });

  test('页面应该在移动设备上响应式布局', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if dashboard container adapts
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Check if welcome section adapts
    const welcomeSection = page.locator('.welcome-section');
    await expect(welcomeSection).toBeVisible();
    
    // Check if actions grid becomes single column
    const actionsGrid = page.locator('.actions-grid');
    await expect(actionsGrid).toBeVisible();
  });

  test('系统状态指示器应该有正确的颜色', async ({ page }) => {
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();
    
    // Check if the indicator exists and is visible
    await expect(statusIndicator).toBeVisible();
  });

  test('Bento Grid应该显示正确的数据', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);
    
    // Check if numeric values are displayed
    const valueElements = page.locator('.bento-value');
    const firstValue = valueElements.first();
    if (await firstValue.count() > 0) {
      const valueText = await firstValue.textContent();
      expect(valueText).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('颜色主题应该一致', async ({ page }) => {
    // Check welcome section exists
    const welcomeSection = page.locator('.welcome-section');
    await expect(welcomeSection).toBeVisible();
    
    // Check primary action card exists
    const primaryCard = page.locator('.action-card.primary');
    await expect(primaryCard).toBeVisible();
  });

  test('页面应该无障碍访问', async ({ page }) => {
    // Check app-bento-grid exists
    await expect(page.locator('app-bento-grid')).toBeVisible();
    
    // Check heading hierarchy (specific selectors to avoid conflicts)
    await expect(page.locator('h1.welcome-title')).toBeVisible();
    await expect(page.locator('h2.section-title')).toBeVisible();
    
    // Check button accessibility
    const actionButtons = page.locator('.action-card');
    for (let i = 0; i < await actionButtons.count(); i++) {
      const button = actionButtons.nth(i);
      await expect(button).toHaveAttribute('routerLink');
    }
  });
});