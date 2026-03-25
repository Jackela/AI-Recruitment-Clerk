import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { waitForAppHydration } from './test-utils/hydration';

const APP_URL = '/';
const LANDING_PATH = '/jobs';
const APP_TITLE_SELECTOR = '#app-title';
const APP_TITLE_TEXT = /AI (招聘助理|Recruitment Assistant)/i;
const DEFAULT_TIMEOUT = 30000;

async function gotoLanding(page: Page) {
  console.log('🔄 Navigating to landing page...');
  await page.goto(APP_URL);
  await page.waitForURL((url) => url.pathname.startsWith(LANDING_PATH), {
    timeout: DEFAULT_TIMEOUT,
  });
  await page.waitForLoadState('domcontentloaded');

  // 关键：等待应用完全hydrate
  await waitForAppHydration(page);
  console.log('✅ Landing page loaded and hydrated');
}

test.describe('Basic Application Health', () => {
  test('application loads successfully', async ({ page }) => {
    await gotoLanding(page);

    // 等待应用完全hydrated后再检查元素
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout, continuing...');
    });

    // 使用更长的超时时间等待标题元素
    const appTitle = page.locator(APP_TITLE_SELECTOR);
    await expect(appTitle).toBeVisible({ timeout: 15000 });
    await expect(appTitle).toContainText(APP_TITLE_TEXT);

    // 检查导航链接
    const navLink = page.locator('nav a').filter({ hasText: '岗位管理' });
    await expect(navLink).toBeVisible({ timeout: 15000 });

    expect(new URL(page.url()).pathname).toContain('/jobs');
  });

  test('no critical console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await gotoLanding(page);

    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.includes('net::ERR_FAILED') &&
        error.includes('ERROR'),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('basic navigation works', async ({ page }) => {
    await gotoLanding(page);

    // 等待标题可见
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible({
      timeout: 15000,
    });

    // 导航到jobs页面
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);

    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout on jobs page');
    });

    await expect(
      page.locator('nav a').filter({ hasText: '岗位管理' }),
    ).toBeVisible({ timeout: 15000 });

    // 导航到create页面
    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);

    await page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout on create page');
    });

    // 检查表单元素（使用多种选择器）
    const jobTitleInput = page.locator(
      'input[formControlName="jobTitle"], [data-testid="job-title-input"], input#jobTitle',
    );
    const jdTextarea = page.locator(
      'textarea[formControlName="jdText"], [data-testid="jd-textarea"], textarea#jdText',
    );

    await expect(jobTitleInput).toBeVisible({ timeout: 20000 });
    await expect(jdTextarea).toBeVisible({ timeout: 20000 });
  });

  test('responsive design check', async ({ page }) => {
    await gotoLanding(page);

    // 测试移动端
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible({
      timeout: 15000,
    });

    // 测试平板
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible({
      timeout: 15000,
    });

    // 测试桌面端
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('domcontentloaded');
    await waitForAppHydration(page);
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible({
      timeout: 15000,
    });
  });
});
