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
  // Use data-testid for stable element selection
  await expect(page.getByTestId('page-title')).toBeVisible();
  await expect(page.getByTestId('jobs-container')).toBeVisible();
}

test.describe('Core User Flow - Job Creation to Report Viewing', () => {
  test('Complete job creation happy path (frontend only)', async ({ page }) => {
    await gotoAndConfirmLanding(page, BASE_URL);
    await expectJobsLanding(page);

    await gotoAndConfirmLanding(page, `${BASE_URL}jobs/create`);
    const form = page.getByTestId('create-job-form');
    await expect(form).toBeVisible();

    // Use data-testid selectors instead of formControlName
    await page.getByTestId('job-title-input').fill('高级前端工程师');
    await page
      .getByTestId('jd-textarea')
      .fill('职位要求：熟悉主流前端框架，具备良好协作能力。');

    const submitButton = page.getByTestId('submit-button');
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
    await expect(page.getByTestId('create-job-form')).toBeVisible();

    await page.goto(`${BASE_URL}reports`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/reports/);
  });

  test('Job creation form accessibility basics', async ({ page }) => {
    await gotoAndConfirmLanding(page, `${BASE_URL}jobs/create`);
    // Use data-testid selectors for form elements
    const inputs = page.locator(
      '[data-testid="job-title-input"], [data-testid="jd-textarea"]',
    );

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
