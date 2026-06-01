import type { Page } from '@playwright/test';

/**
 * Navigation Helpers
 */

export async function gotoAndWait(
  page: Page,
  url: string,
  options?: { waitForNetworkIdle?: boolean; timeout?: number },
): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');

  if (options?.waitForNetworkIdle) {
    await page.waitForLoadState('networkidle');
  }
}

export async function waitForUrl(
  page: Page,
  urlPattern: RegExp | string,
  timeout = 15000,
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Error Collection Helpers
 */

export interface ErrorCollector {
  consoleErrors: string[];
  pageErrors: string[];
}

export function setupErrorCollection(page: Page): ErrorCollector {
  const errors: ErrorCollector = {
    consoleErrors: [],
    pageErrors: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.pageErrors.push(error.message);
  });

  return errors;
}

export function logErrors(errors: ErrorCollector): void {
  if (errors.consoleErrors.length > 0) {
    console.log('💥 Console errors:', errors.consoleErrors);
  }
  if (errors.pageErrors.length > 0) {
    console.log('🔥 Page errors:', errors.pageErrors);
  }
}

/**
 * Form Helpers
 */

export async function fillFormField(
  page: Page,
  testId: string,
  value: string,
): Promise<void> {
  await page.getByTestId(testId).fill(value);
}

export async function clickButton(page: Page, testId: string): Promise<void> {
  await page.getByTestId(testId).click();
}

export async function isFormFieldVisible(
  page: Page,
  testId: string,
): Promise<boolean> {
  return await page.getByTestId(testId).isVisible();
}

/**
 * Accessibility Helpers
 */

export async function checkElementHasLabel(
  page: Page,
  testId: string,
): Promise<boolean> {
  return await page.getByTestId(testId).evaluate((element) => {
    const id = element.id;
    const labelled =
      (id && document.querySelector(`label[for="${id}"]`)) ||
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby');
    return Boolean(labelled);
  });
}

export async function verifyFormAccessibility(
  page: Page,
  testIds: string[],
): Promise<void> {
  for (const testId of testIds) {
    const hasLabel = await checkElementHasLabel(page, testId);
    if (!hasLabel) {
      console.warn(`⚠️ Element ${testId} is missing label`);
    }
  }
}
