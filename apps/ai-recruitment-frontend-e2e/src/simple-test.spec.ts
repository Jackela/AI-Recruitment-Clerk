import { test, expect } from './fixtures';
import { waitForAppHydration } from './test-utils/hydration';

/**
 * Simple Debug Test - Direct Angular App Verification
 * Enhanced with better hydration waiting and resilient navigation
 */
const LANDING_PATH = '/jobs';
const DEFAULT_TIMEOUT = 60000; // 增加到60秒应对CI环境

test.describe('Simple Angular App Test', () => {
  test('check if arc-root exists and app loads with resilient navigation', async ({
    page,
  }) => {
    console.log('🚀 Starting simple Angular app test...');

    // 最佳实践：直接导航到目标路由，避免依赖客户端重定向
    console.log('🔄 Navigating directly to /jobs...');
    await page.goto(LANDING_PATH);

    // 等待 hydration 完成（而非等待URL变化）
    console.log('⏳ Waiting for app hydration...');
    await waitForAppHydration(page);
    console.log('✅ App hydration complete');

    // 验证 arc-root 存在且有内容
    const arcRoot = page.locator('arc-root');
    await expect(arcRoot).toBeAttached({ timeout: DEFAULT_TIMEOUT });

    const arcRootContent = await arcRoot.innerHTML();
    console.log('📊 arc-root content length:', arcRootContent.length);

    // 验证 Angular 已渲染内容
    expect(arcRootContent.length).toBeGreaterThan(100);

    // 验证页面有实际内容（导航链接或标题）
    const hasContent = await page.evaluate(() => {
      const root = document.querySelector('arc-root');
      if (!root) return false;
      return (
        root.querySelector('nav, header, main, h1, .app-container') !== null
      );
    });

    expect(hasContent).toBe(true);
    console.log('✅ Angular app is working correctly!');
  });
});
