import type { Page } from '@playwright/test';

const HYDRATED_COMPONENTS = [
  'arc-language-selector',
  'arc-theme-toggle',
  'arc-guide-overlay',
  'arc-status-notifications',
];

async function waitForIdle(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const idle = (
        window as typeof window & {
          requestIdleCallback?: (callback: IdleRequestCallback) => number;
        }
      ).requestIdleCallback;

      if (typeof idle === 'function') {
        idle(() => resolve());
      } else {
        setTimeout(() => resolve(), 50);
      }
    });
  });
}

export async function waitForAppHydration(page: Page): Promise<void> {
  await page.locator('arc-root').waitFor({ state: 'attached', timeout: 15000 });

  await page.waitForFunction(() => document.readyState === 'complete', null, {
    timeout: 10000,
  });

  await waitForIdle(page);
  await waitForIdle(page);

  await page.locator('body').waitFor({
    state: 'visible',
    timeout: 10000,
  });
}

export async function waitForDeferredComponents(
  page: Page,
  selectors: readonly string[] = HYDRATED_COMPONENTS,
): Promise<void> {
  await waitForIdle(page);

  await Promise.all(
    selectors.map((selector) =>
      page
        .locator(selector)
        .waitFor({ state: 'attached', timeout: 10000 })
        .catch(() => undefined),
    ),
  );
}
