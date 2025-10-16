import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const BASE_URL = '/';
const LANDING_PATH = '/jobs';

async function gotoAndConfirmLanding(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForURL(
    (location) => location.pathname.startsWith(url === '/' ? LANDING_PATH : url),
    { timeout: 15_000 },
  );
  await page.waitForLoadState('domcontentloaded');
}

async function expectJobsLanding(page: Page): Promise<void> {
  await page.waitForURL(
    (location) => location.pathname.startsWith(LANDING_PATH),
    { timeout: 15_000 },
  );
  await expect(page.locator('#app-title')).toBeVisible();
  await expect(
    page.locator('nav a').filter({ hasText: '岗位管理' }),
  ).toBeVisible();
}

test.describe('Core User Flow - Job Creation to Report Viewing', () => {
  test('Complete job creation happy path (frontend only)', async ({ page }) => {
    await gotoAndConfirmLanding(page, BASE_URL);
    await expectJobsLanding(page);

    await gotoAndConfirmLanding(page, `${BASE_URL}jobs/create`);
    const form = page.locator('form');
    await expect(form).toBeVisible();

    await page
      .locator('input[formControlName="jobTitle"]')
      .fill('高级前端工程师');
    await page
      .locator('textarea[formControlName="jdText"]')
      .fill('职位要求：熟悉主流前端框架，具备良好协作能力。');

    const submitButton = page
      .locator('button[type="submit"]')
      .or(
        page
          .locator('button')
          .filter({ hasText: /提交|创建|Submit|Create/i }),
      );
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(form).toBeVisible();

    await page.goto(`${BASE_URL}reports`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/reports/);

    await gotoAndConfirmLanding(page, BASE_URL);
    await expectJobsLanding(page);
  });

  test('Quick smoke test - navigation essentials', async ({ page }) => {
    await gotoAndConfirmLanding(page, BASE_URL);
    await expectJobsLanding(page);

    await gotoAndConfirmLanding(page, `${BASE_URL}jobs/create`);
    await expect(page.locator('form')).toBeVisible();

    await page.goto(`${BASE_URL}reports`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/reports/);
  });

  test('Job creation form accessibility basics', async ({ page }) => {
    await gotoAndConfirmLanding(page, `${BASE_URL}jobs/create`);
    const inputs = page.locator('form input, form textarea, form select');

    const sampleCount = Math.min(await inputs.count(), 3);
    for (let i = 0; i < sampleCount; i++) {
      const hasLabel = await inputs.nth(i).evaluate((element) => {
        const id = element.id;
        const labelled =
          (id && document.querySelector(`label[for="${id}"]`)) ||
          element.getAttribute('aria-label');
        return Boolean(labelled);
      });
      expect(hasLabel).toBe(true);
    }
  });
});
