import { test as base } from '@playwright/test';
import type { Request } from '@playwright/test';
import { waitForAppHydration } from './test-utils/hydration';

const APP_URL_PATTERN = /\/\/localhost:\d+\//;

function shouldHydrate(url: unknown, responseUrl?: string): boolean {
  if (typeof url === 'string') {
    return APP_URL_PATTERN.test(url);
  }
  if (url instanceof URL) {
    return APP_URL_PATTERN.test(url.href);
  }
  if (responseUrl) {
    return APP_URL_PATTERN.test(responseUrl);
  }
  return false;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options);
      if (shouldHydrate(url, response?.url())) {
        await waitForAppHydration(page);
      }
      return response;
    };

    const originalReload = page.reload.bind(page);
    page.reload = async (options) => {
      const response = await originalReload(options);
      await waitForAppHydration(page);
      return response;
    };

    const originalWaitForRequest = page.waitForRequest.bind(page);
    page.waitForRequest = (urlOrPredicate, options) => {
      return originalWaitForRequest(
        urlOrPredicate as string | RegExp | ((request: Request) => boolean),
        options,
      );
    };

    await use(page);
  },
});

export { expect } from '@playwright/test';
