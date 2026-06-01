import { test, expect } from '@playwright/test';
import {
  setupVisualTest,
  waitForPageStability,
  setTheme,
  viewports,
  pages,
  takeScreenshot,
  delay,
} from './visual-helpers';

test.describe('主题视觉回归测试', () => {
  const testPages = [
    pages.homepage,
    pages.login,
    pages.dashboard,
    pages.jobsList,
    pages.analysis,
    pages.settings,
  ];

  const themes: Array<'light' | 'dark'> = ['light', 'dark'];

  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page, {
      hideCursor: true,
      disableAnimations: true,
    });
  });

  // 测试所有页面在明暗主题下的表现
  for (const pageConfig of testPages) {
    for (const theme of themes) {
      test(`${pageConfig.title} - ${theme} 主题`, async ({ page }) => {
        // 设置桌面视口
        await page.setViewportSize(viewports.desktop);

        // 设置主题
        await setTheme(page, theme);

        // 导航到页面
        await page.goto(pageConfig.url);

        // 等待页面稳定
        await waitForPageStability(page);

        // 截图对比
        await takeScreenshot(page, `${pageConfig.name}-${theme}-theme.png`, {
          fullPage: true,
          maxDiffPixels: 300,
          threshold: 0.25,
        });
      });
    }
  }

  // 主题切换动画测试
  test.describe('主题切换动画', () => {
    test('主题切换过渡效果', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 初始为明亮主题
      await setTheme(page, 'light');
      await delay(500);

      // 截图 - 明亮主题
      await takeScreenshot(page, 'theme-transition-light-start.png', {
        fullPage: false,
      });

      // 切换到暗黑主题（启用动画）
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            transition-duration: 0.3s !important;
          }
        `,
      });

      await setTheme(page, 'dark');

      // 在过渡中间截图
      await delay(150);
      await takeScreenshot(page, 'theme-transition-midway.png', {
        fullPage: false,
      });

      // 等待过渡完成
      await delay(300);
      await takeScreenshot(page, 'theme-transition-dark-end.png', {
        fullPage: false,
      });
    });

    test('快速主题切换', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 禁用动画以测试功能
      await setupVisualTest(page, { disableAnimations: true });

      // 多次切换主题
      for (let i = 0; i < 3; i++) {
        await setTheme(page, i % 2 === 0 ? 'dark' : 'light');
        await delay(100);
        await takeScreenshot(page, `theme-toggle-iteration-${i + 1}.png`, {
          fullPage: false,
        });
      }
    });
  });

  // 组件颜色一致性测试
  test.describe('组件颜色一致性', () => {
    test('按钮在不同主题下的颜色', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(pages.dashboard.url);

      for (const theme of themes) {
        await setTheme(page, theme);
        await waitForPageStability(page);

        // 主要按钮
        const primaryButton = page
          .locator('button.btn-primary, .btn-primary')
          .first();
        if (await primaryButton.isVisible().catch(() => false)) {
          await takeScreenshot(page, `button-primary-${theme}-theme.png`, {
            fullPage: false,
            clip: (await primaryButton.boundingBox()) || undefined,
          });
        }

        // 次要按钮
        const secondaryButton = page
          .locator('button.btn-secondary, .btn-secondary')
          .first();
        if (await secondaryButton.isVisible().catch(() => false)) {
          await takeScreenshot(page, `button-secondary-${theme}-theme.png`, {
            fullPage: false,
            clip: (await secondaryButton.boundingBox()) || undefined,
          });
        }

        // 危险按钮
        const dangerButton = page
          .locator('button.btn-danger, .btn-danger, button[type="delete"]')
          .first();
        if (await dangerButton.isVisible().catch(() => false)) {
          await takeScreenshot(page, `button-danger-${theme}-theme.png`, {
            fullPage: false,
            clip: (await dangerButton.boundingBox()) || undefined,
          });
        }
      }
    });

    test('卡片和面板在不同主题下的表现', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(pages.dashboard.url);

      for (const theme of themes) {
        await setTheme(page, theme);
        await waitForPageStability(page);

        // 卡片组件
        const card = page.locator('.card, [class*="card"]').first();
        if (await card.isVisible().catch(() => false)) {
          await takeScreenshot(page, `card-${theme}-theme.png`, {
            fullPage: false,
            clip: (await card.boundingBox()) || undefined,
          });
        }

        // 侧边栏
        const sidebar = page
          .locator('aside, .sidebar, [class*="sidebar"]')
          .first();
        if (await sidebar.isVisible().catch(() => false)) {
          await takeScreenshot(page, `sidebar-${theme}-theme.png`, {
            fullPage: false,
            clip: (await sidebar.boundingBox()) || undefined,
          });
        }
      }
    });

    test('表单元素主题适配', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(pages.login.url);

      for (const theme of themes) {
        await setTheme(page, theme);
        await waitForPageStability(page);

        // 输入框
        const input = page
          .locator('input[type="text"], input[type="email"]')
          .first();
        if (await input.isVisible().catch(() => false)) {
          await input.focus();
          await delay(100);
          await takeScreenshot(page, `input-focus-${theme}-theme.png`, {
            fullPage: false,
            clip: (await input.boundingBox()) || undefined,
          });
        }

        // 复选框
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible().catch(() => false)) {
          await takeScreenshot(page, `checkbox-${theme}-theme.png`, {
            fullPage: false,
            clip: (await checkbox.boundingBox()) || undefined,
          });
        }
      }
    });
  });

  // 系统主题偏好测试
  test.describe('系统主题偏好', () => {
    test('跟随系统主题设置', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(pages.dashboard.url);

      // 模拟系统暗黑模式
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => {
        localStorage.setItem('theme', 'system');
        document.documentElement.setAttribute('data-theme', 'system');
      });

      await page.reload();
      await waitForPageStability(page);

      await takeScreenshot(page, 'theme-system-dark-preference.png', {
        fullPage: true,
      });

      // 模拟系统明亮模式
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();
      await waitForPageStability(page);

      await takeScreenshot(page, 'theme-system-light-preference.png', {
        fullPage: true,
      });
    });
  });
});
