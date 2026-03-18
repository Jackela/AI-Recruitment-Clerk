import { Page, Locator, expect } from '@playwright/test';

/**
 * 视觉回归测试帮助函数
 */

export interface VisualTestOptions {
  /** 是否隐藏光标 */
  hideCursor?: boolean;
  /** 是否禁用动画 */
  disableAnimations?: boolean;
  /** 主题设置: 'light' | 'dark' | 'system' */
  theme?: 'light' | 'dark' | 'system';
  /** 额外的隐藏选择器 */
  hideSelectors?: string[];
}

/**
 * 设置视觉测试环境
 */
export async function setupVisualTest(
  page: Page,
  options: VisualTestOptions = {},
): Promise<void> {
  const {
    hideCursor = true,
    disableAnimations = true,
    theme,
    hideSelectors = [],
  } = options;

  // 隐藏光标
  if (hideCursor) {
    await page.addStyleTag({
      content: `* { cursor: none !important; }`,
    });
  }

  // 禁用动画和过渡
  if (disableAnimations) {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }

  // 设置主题
  if (theme) {
    await setTheme(page, theme);
  }

  // 隐藏动态元素
  const defaultHideSelectors = [
    '[data-testid="loading-spinner"]',
    '.loading-overlay',
    '[data-testid="skeleton"]',
  ];

  for (const selector of [...defaultHideSelectors, ...hideSelectors]) {
    await page.addStyleTag({
      content: `${selector} { visibility: hidden !important; }`,
    });
  }
}

/**
 * 设置页面主题
 */
export async function setTheme(
  page: Page,
  theme: 'light' | 'dark' | 'system',
): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, theme);

  // 等待主题应用
  await page.waitForTimeout(100);
}

/**
 * 等待页面稳定（所有资源加载完成，无网络请求）
 */
export async function waitForPageStability(
  page: Page,
  options: { timeout?: number; stabilityTime?: number } = {},
): Promise<void> {
  const { timeout = 30000, stabilityTime = 500 } = options;

  // 等待网络空闲
  await page.waitForLoadState('networkidle', { timeout });

  // 等待图片加载完成
  await waitForImagesToLoad(page);

  // 等待字体加载完成
  await page.evaluate(() => document.fonts.ready);

  // 等待额外的时间确保渲染稳定
  await page.waitForTimeout(stabilityTime);
}

/**
 * 等待所有图片加载完成
 */
export async function waitForImagesToLoad(page: Page): Promise<void> {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve());
              img.addEventListener('error', () => resolve());
            }),
        ),
    );
  });
}

/**
 * 等待元素动画完成
 */
export async function waitForAnimation(
  page: Page,
  selector: string,
  timeout: number = 5000,
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return true;
      const animations = element.getAnimations();
      return animations.every((anim) => anim.playState === 'finished');
    },
    selector,
    { timeout },
  );
}

/**
 * 截图并对比
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    mask?: Locator[];
    maxDiffPixels?: number;
    threshold?: number;
  } = {},
): Promise<void> {
  const {
    fullPage = true,
    clip,
    mask,
    maxDiffPixels = 100,
    threshold = 0.2,
  } = options;

  await expect(page).toHaveScreenshot(name, {
    fullPage,
    clip,
    mask,
    maxDiffPixels,
    threshold,
  });
}

/**
 * 截图特定元素
 */
export async function takeElementScreenshot(
  locator: Locator,
  name: string,
  options: {
    maxDiffPixels?: number;
    threshold?: number;
  } = {},
): Promise<void> {
  const { maxDiffPixels = 50, threshold = 0.2 } = options;

  await expect(locator).toHaveScreenshot(name, {
    maxDiffPixels,
    threshold,
  });
}

/**
 * 验证元素在不同状态下的视觉表现
 */
export async function testElementStates(
  page: Page,
  selector: string,
  states: Array<'default' | 'hover' | 'focus' | 'active' | 'disabled'>,
  screenshotPrefix: string,
): Promise<void> {
  const element = page.locator(selector);

  for (const state of states) {
    // 重置状态
    await element.evaluate((el) => {
      el.blur();
      el.classList.remove('hover', 'active', 'focus');
    });

    switch (state) {
      case 'hover':
        await element.hover();
        await page.waitForTimeout(100);
        break;
      case 'focus':
        await element.focus();
        await page.waitForTimeout(100);
        break;
      case 'active':
        await element.dispatchEvent('mousedown');
        await page.waitForTimeout(100);
        break;
      case 'disabled':
        // disabled 状态通常不需要交互
        break;
      default:
        // default 状态
        break;
    }

    await takeElementScreenshot(element, `${screenshotPrefix}-${state}.png`, {
      maxDiffPixels: 50,
    });
  }
}

/**
 * 生成视觉回归测试报告数据
 */
export function generateVisualReport(
  testResults: Array<{
    testName: string;
    passed: boolean;
    screenshotPath?: string;
    diffPath?: string;
  }>,
): string {
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  return `
# 视觉回归测试报告

## 汇总
- 总测试数: ${total}
- 通过: ${passed}
- 失败: ${failed}
- 通过率: ${((passed / total) * 100).toFixed(2)}%

## 详细结果
${testResults
  .map(
    (r) =>
      `- ${r.passed ? '✅' : '❌'} ${r.testName}${
        r.diffPath ? ` (差异: ${r.diffPath})` : ''
      }`,
  )
  .join('\n')}

## 建议
${failed > 0 ? '- 请检查失败的截图差异\n- 如果变更是预期的，请更新基准截图' : '- 所有测试通过！'}
  `.trim();
}

/**
 * 模拟设备视口
 */
export const viewports = {
  desktop: { width: 1920, height: 1080 },
  desktopLarge: { width: 2560, height: 1440 },
  laptop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  mobile: { width: 375, height: 812 },
  mobileLarge: { width: 414, height: 896 },
  mobileSmall: { width: 320, height: 568 },
} as const;

/**
 * 常见页面路径
 */
export const pages = {
  homepage: { name: 'homepage', url: '/', title: '首页' },
  login: { name: 'login', url: '/login', title: '登录' },
  dashboard: { name: 'dashboard', url: '/dashboard', title: '仪表盘' },
  jobsList: { name: 'jobs-list', url: '/jobs', title: '职位列表' },
  jobsCreate: { name: 'jobs-create', url: '/jobs/create', title: '创建职位' },
  jobsDetail: { name: 'jobs-detail', url: '/jobs/123', title: '职位详情' },
  analysis: { name: 'analysis', url: '/analysis', title: '分析页面' },
  results: { name: 'results', url: '/results/123', title: '结果页面' },
  resume: { name: 'resume', url: '/resume', title: '简历页面' },
  reports: { name: 'reports', url: '/reports', title: '报告页面' },
  settings: { name: 'settings', url: '/settings', title: '设置页面' },
} as const;

/**
 * 延迟函数
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 滚动到元素并截图
 */
export async function scrollAndScreenshot(
  page: Page,
  selector: string,
  screenshotName: string,
): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await waitForPageStability(page);
  await takeElementScreenshot(element, screenshotName);
}
