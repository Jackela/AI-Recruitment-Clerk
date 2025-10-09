import { test, expect } from './fixtures';
import { waitForDeferredComponents } from './test-utils/hydration';

const APP_URL = 'http://localhost:4202/';
const APP_TITLE_SELECTOR = '#app-title';
const APP_TITLE_TEXT = /AI (招聘助理|Recruitment Assistant)/i;

test.describe('Basic Application Health', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForDeferredComponents(page);

    const appTitle = page.locator(APP_TITLE_SELECTOR);
    await expect(appTitle).toBeVisible();
    await expect(appTitle).toContainText(APP_TITLE_TEXT);

    await expect(
      page.locator('nav a').filter({ hasText: '岗位管理' }),
    ).toBeVisible();

    expect(page.url()).toContain('/jobs');
  });

  test('no critical console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(APP_URL);
    await waitForDeferredComponents(page);

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
    await page.goto(APP_URL);
    await waitForDeferredComponents(page);

    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();

    await page.goto(`${APP_URL}jobs`);
    await waitForDeferredComponents(page);
    await expect(
      page.locator('nav a').filter({ hasText: '岗位管理' }),
    ).toBeVisible();

    await page.goto(`${APP_URL}jobs/create`);
    await waitForDeferredComponents(page);

    const hasJobTitleInput =
      (await page.locator('input[formControlName="jobTitle"]').count()) > 0;
    const hasJdTextarea =
      (await page.locator('textarea[formControlName="jdText"]').count()) > 0;
    expect(hasJobTitleInput && hasJdTextarea).toBe(true);
  });

  test('responsive design check', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForDeferredComponents(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await waitForDeferredComponents(page);
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForDeferredComponents(page);
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForDeferredComponents(page);
    await expect(page.locator(APP_TITLE_SELECTOR)).toBeVisible();
  });
});
