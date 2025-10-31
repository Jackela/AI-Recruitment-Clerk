import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const APP_URL = '/';
const LANDING_PATH = '/jobs';
const APP_TITLE_SELECTOR = '#app-title';
const APP_TITLE_TEXT = /AI (招聘助理|Recruitment Assistant)/i;

async function gotoLanding(page: Page) {
  await page.goto(APP_URL);
  await page.waitForURL(
    (url) => url.pathname.startsWith(LANDING_PATH),
    { timeout: 15_000 },
  );
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Basic Application Health', () => {
  test('application loads successfully', async ({ page }) => {
    await gotoLanding(page);

    const appTitle = page.locator(APP_TITLE_SELECTOR);
    await expect(appTitle).toBeVisible();
    await expect(appTitle).toContainText(APP_TITLE_TEXT);

    await expect(
      page.locator('nav a').filter({ hasText: '岗位管理' }),
    ).toBeVisible();

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

    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();

    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.locator('nav a').filter({ hasText: '岗位管理' }),
    ).toBeVisible();

    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');

    const jobTitleInput = page.locator('input[formControlName="jobTitle"]');
    const jdTextarea = page.locator('textarea[formControlName="jdText"]');

    await expect(jobTitleInput).toBeVisible({ timeout: 15_000 });
    await expect(jdTextarea).toBeVisible({ timeout: 15_000 });
  });

  test('responsive design check', async ({ page }) => {
    await gotoLanding(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();
  });
});
