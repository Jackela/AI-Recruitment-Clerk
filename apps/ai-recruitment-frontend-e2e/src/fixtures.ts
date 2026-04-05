import { test as base } from '@playwright/test';
import type { Request } from '@playwright/test';
import { waitForAppHydration } from './test-utils/hydration';
import type { HydrationConfig } from './test-utils/hydration-config';
import { CI_OPTIMIZED_CONFIG } from './test-utils/hydration-config';

const APP_URL_PATTERN = /\/\/localhost:\d+\//;

/**
 * 从环境变量获取 hydration 配置
 * 优先使用 E2E_HYDRATION_LEVEL 环境变量，否则根据 CI 环境自动选择
 */
function getHydrationConfig(): Partial<HydrationConfig> {
  const level = process.env.E2E_HYDRATION_LEVEL as
    | HydrationConfig['level']
    | undefined;

  // 如果明确指定了 level，使用指定值
  if (level && ['minimal', 'basic', 'full'].includes(level)) {
    return { level, ciMode: process.env.CI === 'true' };
  }

  // 在 CI 环境中使用优化配置
  if (process.env.CI === 'true') {
    return CI_OPTIMIZED_CONFIG;
  }

  // 本地开发使用默认配置
  return {};
}

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
        // 使用环境感知的 hydration 配置
        const config = getHydrationConfig();
        await waitForAppHydration(page, config);
      }
      return response;
    };

    const originalReload = page.reload.bind(page);
    page.reload = async (options) => {
      const response = await originalReload(options);
      // 使用环境感知的 hydration 配置
      const config = getHydrationConfig();
      await waitForAppHydration(page, config);
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

// Re-export fixtures from fixtures directory
export * from './fixtures/index';
