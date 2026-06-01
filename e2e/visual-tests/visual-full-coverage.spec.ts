import { test, expect } from '@playwright/test';
import {
  setupVisualTest,
  waitForPageStability,
  viewports,
  pages,
  takeScreenshot,
} from './visual-helpers';

test.describe('完整视觉回归测试', () => {
  // 测试所有页面在多个视口
  const testPages = [
    pages.homepage,
    pages.login,
    pages.dashboard,
    pages.jobsList,
    pages.jobsCreate,
    pages.jobsDetail,
    pages.analysis,
    pages.results,
    pages.resume,
    pages.reports,
    pages.settings,
  ];

  const testViewports = [
    { name: 'desktop', ...viewports.desktop },
    { name: 'laptop', ...viewports.laptop },
    { name: 'tablet', ...viewports.tablet },
    { name: 'tablet-landscape', ...viewports.tabletLandscape },
    { name: 'mobile', ...viewports.mobile },
    { name: 'mobile-large', ...viewports.mobileLarge },
  ];

  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page, {
      hideCursor: true,
      disableAnimations: true,
      theme: 'light',
    });
  });

  for (const pageConfig of testPages) {
    for (const viewport of testViewports) {
      test(`${pageConfig.title} - ${viewport.name}`, async ({ page }) => {
        // 设置视口
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        // 导航到页面
        await page.goto(pageConfig.url);

        // 等待页面稳定
        await waitForPageStability(page);

        // 截图对比
        await takeScreenshot(
          page,
          `${pageConfig.name}-${viewport.name}-light.png`,
          {
            fullPage: true,
            maxDiffPixels: 200,
            threshold: 0.2,
          },
        );
      });
    }
  }

  // 全页面滚动截图测试
  test.describe('全页面滚动截图', () => {
    const scrollablePages = [pages.jobsList, pages.analysis, pages.reports];

    for (const pageConfig of scrollablePages) {
      test(`${pageConfig.title} - 完整滚动截图`, async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto(pageConfig.url);
        await waitForPageStability(page);

        // 获取页面总高度
        const pageHeight = await page.evaluate(
          () => document.body.scrollHeight,
        );
        const viewportHeight = viewports.desktop.height;
        const screenshotSections: string[] = [];

        // 分段截图
        let scrollPosition = 0;
        let sectionIndex = 0;

        while (scrollPosition < pageHeight) {
          await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
          await waitForPageStability(page, { stabilityTime: 300 });

          const screenshotName = `${pageConfig.name}-scroll-section-${sectionIndex}.png`;
          screenshotSections.push(screenshotName);

          await takeScreenshot(page, screenshotName, {
            fullPage: false,
            clip: {
              x: 0,
              y: 0,
              width: viewports.desktop.width,
              height: Math.min(viewportHeight, pageHeight - scrollPosition),
            },
          });

          scrollPosition += viewportHeight;
          sectionIndex++;
        }
      });
    }
  });

  // 响应式布局断点测试
  test.describe('响应式布局断点测试', () => {
    const breakpoints = [
      { name: 'xs', width: 320 },
      { name: 'sm', width: 640 },
      { name: 'md', width: 768 },
      { name: 'lg', width: 1024 },
      { name: 'xl', width: 1280 },
      { name: '2xl', width: 1536 },
    ];

    const responsivePages = [pages.homepage, pages.dashboard, pages.jobsList];

    for (const pageConfig of responsivePages) {
      for (const breakpoint of breakpoints) {
        test(`${pageConfig.title} - 断点 ${breakpoint.name} (${breakpoint.width}px)`, async ({
          page,
        }) => {
          await page.setViewportSize({
            width: breakpoint.width,
            height: 900,
          });
          await page.goto(pageConfig.url);
          await waitForPageStability(page);

          await takeScreenshot(
            page,
            `${pageConfig.name}-breakpoint-${breakpoint.name}.png`,
            { fullPage: true },
          );
        });
      }
    }
  });
});
