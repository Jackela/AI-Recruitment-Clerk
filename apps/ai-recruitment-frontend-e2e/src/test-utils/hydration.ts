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
  // Wait for arc-root to be attached
  await page.locator('arc-root').waitFor({ state: 'attached', timeout: 15000 });

  // Wait for document to be complete
  await page.waitForFunction(() => document.readyState === 'complete', null, {
    timeout: 10000,
  });

  // Wait for Angular to bootstrap
  await page.waitForFunction(
    () => {
      const root = document.querySelector('arc-root');
      return (
        root && (root.hasAttribute('ng-version') || root.children.length > 0)
      );
    },
    null,
    { timeout: 15000 },
  );

  // Wait for body to be visible
  await page.locator('body').waitFor({
    state: 'visible',
    timeout: 10000,
  });

  // Wait for initial loading screen to disappear
  await page.waitForFunction(
    () => {
      const loading = document.getElementById('initial-loading');
      return !loading || loading.style.opacity === '0' || !loading.isConnected;
    },
    null,
    { timeout: 10000 },
  );

  // Wait for idle periods
  await waitForIdle(page);
  await waitForIdle(page);

  // Wait for fonts to load (optional)
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch {
    /* ignore font timeout */
  }

  // Wait for at least one Angular component to be rendered
  // Use a longer timeout and don't race against a shorter timeout
  try {
    await page.waitForFunction(
      () => {
        return (
          document.querySelector(
            'arc-language-selector, arc-theme-toggle, arc-aria-live, router-outlet, .app-container',
          ) !== null
        );
      },
      null,
      { timeout: 8000 },
    );
  } catch {
    // If specific components aren't found, continue anyway
    // The page might be on a simple route without these components
    console.log('⚠️ Some Angular components not found, continuing anyway');
  }
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
