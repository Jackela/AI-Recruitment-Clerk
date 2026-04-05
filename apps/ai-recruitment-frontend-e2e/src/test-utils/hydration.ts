import type { Page } from '@playwright/test';
import {
  HydrationConfig,
  CI_OPTIMIZED_CONFIG,
  HydrationLogger,
} from './hydration-config';

const HYDRATED_COMPONENTS = [
  'arc-language-selector',
  'arc-theme-toggle',
  'arc-guide-overlay',
  'arc-status-notifications',
] as const;

// 超时配置
const DEFAULT_TIMEOUT = 30000;
const LOADING_TIMEOUT = 20000;
const NETWORK_IDLE_TIMEOUT = 15000;

/**
 * 等待空闲周期 - 使用 requestIdleCallback 或 fallback
 */
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
        setTimeout(() => resolve(), 100);
      }
    });
  });
}

/**
 * 等待网络空闲 - 带容错处理
 */
async function waitForNetworkIdle(
  page: Page,
  timeout = NETWORK_IDLE_TIMEOUT,
): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    console.log('⚠️ Network idle timeout, continuing anyway');
  }
}

/**
 * 检查文档是否已完全加载
 */
async function waitForDocumentReady(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  const startTime = Date.now();
  await page.waitForFunction(() => document.readyState === 'complete', null, {
    timeout: config.timeouts.documentReady,
  });
  logger.logStep('documentReady', { duration: Date.now() - startTime });
}

/**
 * 检查 Angular 根元素是否已附加
 */
async function waitForAngularRoot(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  const startTime = Date.now();
  try {
    await page.locator('arc-root').waitFor({
      state: 'attached',
      timeout: config.timeouts.loadingScreen ?? 10000,
    });
    logger.logStep('angularRootAttached', { duration: Date.now() - startTime });
  } catch (error) {
    logger.logStep('angularRootAttached', {
      duration: Date.now() - startTime,
      error: 'Root not attached, trying visibility',
    });
    // 尝试等待可见性
    await page
      .locator('arc-root')
      .waitFor({
        state: 'visible',
        timeout: 5000,
      })
      .catch(() => {
        logger.logStep('angularRootAttached', {
          warning: 'arc-root not visible either, continuing...',
        });
      });
  }
}

/**
 * 检查 Angular 是否已完成启动（内容已渲染）
 */
async function waitForAngularBootstrap(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  const startTime = Date.now();
  await page.waitForFunction(
    () => {
      const root = document.querySelector('arc-root');
      if (!root) return false;
      const hasContent = Array.from(root.childNodes).some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
      );
      return (
        hasContent ||
        root.hasAttribute('ng-version') ||
        root.children.length > 0
      );
    },
    null,
    { timeout: config.timeouts.angularBootstrap },
  );
  logger.logStep('angularBootstrap', { duration: Date.now() - startTime });
}

/**
 * 检查 body 是否可见且未被隐藏
 */
async function waitForBodyVisible(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  const startTime = Date.now();
  await page.waitForFunction(
    () => {
      const body = document.body;
      if (!body) return false;
      const style = window.getComputedStyle(body);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    },
    null,
    { timeout: config.timeouts.loadingScreen ?? 10000 },
  );
  logger.logStep('bodyVisible', { duration: Date.now() - startTime });
}

/**
 * 等待加载屏幕消失
 */
async function waitForLoadingScreen(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  const startTime = Date.now();
  try {
    await page.waitForFunction(
      () => {
        const loading = document.getElementById('initial-loading');
        return (
          !loading ||
          loading.style.opacity === '0' ||
          loading.style.display === 'none' ||
          loading.style.visibility === 'hidden' ||
          !loading.isConnected
        );
      },
      null,
      { timeout: config.timeouts.loadingScreen },
    );
    logger.logStep('loadingScreen', { duration: Date.now() - startTime });
  } catch {
    logger.logStep('loadingScreen', {
      duration: Date.now() - startTime,
      warning: 'Loading screen timeout, continuing anyway',
    });
  }
}

/**
 * 等待字体加载完成
 */
async function waitForFonts(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  if (!config.features?.waitForFonts) {
    logger.logStep('fontLoading', { skipped: true });
    return;

  const startTime = Date.now();
  try {
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Font timeout')), 5000),
      ),
    ]);
    logger.logStep('fontLoading', { duration: Date.now() - startTime });
  } catch {
    logger.logStep('fontLoading', {
      duration: Date.now() - startTime,
      warning: 'Font timeout',
    });
  }
}

/**
 * 等待关键元素渲染
 */
async function waitForKeyElements(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  if (!config.features?.waitForKeyElements) {
    logger.logStep('keyElements', { skipped: true });
    return;

  const startTime = Date.now();
  try {
    await page.waitForFunction(
      () => {
        return (
          document.querySelector(
            '#app-title, [data-testid="jobs-container"], .app-container, router-outlet',
          ) !== null
        );
      },
      null,
      { timeout: 10000 },
    );
    logger.logStep('keyElements', { duration: Date.now() - startTime });
  } catch {
    logger.logStep('keyElements', {
      duration: Date.now() - startTime,
      warning: 'Some key elements not found, continuing anyway',
    });
  }
}

/**
 * 等待网络空闲
 */
async function waitForNetwork(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  if (!config.features?.waitForNetworkIdle) {
    logger.logStep('networkIdle', { skipped: true });
    return;

  const startTime = Date.now();
  await waitForNetworkIdle(page, config.timeouts.networkIdle);
  logger.logStep('networkIdle', { duration: Date.now() - startTime });
}

/**
 * 等待空闲周期
 */
async function waitForIdleCycles(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  if (!config.features?.waitForIdle) {
    logger.logStep('idleCallback', { skipped: true });
    return;

  const startTime = Date.now();
  await waitForIdle(page);
  await waitForIdle(page);
  logger.logStep('idleCycles', { duration: Date.now() - startTime });
}

/**
 * 等待动画完成
 */
async function waitForAnimationCompletion(
  page: Page,
  config: HydrationConfig,
  logger: HydrationLogger,
): Promise<void> {
  if (!config.features?.waitForAnimationCompletion) {
    logger.logStep('animationWait', { skipped: true });
    return;

  const startTime = Date.now();
  await page.waitForTimeout(500);
  logger.logStep('animationWait', { duration: Date.now() - startTime });
}

/**
 * 等待应用完全加载和 hydrate - 分层可配置策略
 *
 * @param page - Playwright Page 对象
 * @param config - 可选的 hydration 配置（默认为 CI 优化配置）
 *
 * @example
 * // 使用默认 CI 优化配置
 * await waitForAppHydration(page);
 *
 * // 使用基本配置（比 CI 配置更快）
 * await waitForAppHydration(page, { level: 'basic' });
 *
 * // 使用最小配置（最快，适合简单页面）
 * await waitForAppHydration(page, { level: 'minimal' });
 *
 * // 完全自定义配置
 * await waitForAppHydration(page, {
 *   level: 'custom',
 *   ciMode: true,
 *   timeouts: { documentReady: 30000, angularBootstrap: 20000 },
 *   features: { fontLoading: false, animationWait: false }
 * });
 */
export async function waitForAppHydration(
  page: Page,
  config: Partial<HydrationConfig> = {},
): Promise<void> {
  // 合并配置（用户配置覆盖默认配置）
  const mergedConfig: HydrationConfig = {
    ...CI_OPTIMIZED_CONFIG,
    ...config,
    timeouts: { ...CI_OPTIMIZED_CONFIG.timeouts, ...config.timeouts },
    features: { ...CI_OPTIMIZED_CONFIG.features, ...config.features },
  };

  // 从环境变量检测 CI 模式
  const isCI = process.env.CI === 'true';
  const effectiveConfig: HydrationConfig = {
    ...mergedConfig,
    ciMode: mergedConfig.ciMode ?? isCI,
  };

  const logger = new HydrationLogger(effectiveConfig.observability);
  const totalStartTime = Date.now();

  logger.logStep('start', {
    level: effectiveConfig.level,
    ciMode: effectiveConfig.ciMode,
  });

  try {
    // Level 0: Minimal - 最基本的检查，适合 CI 环境
    if (effectiveConfig.level === 'minimal') {
      await waitForDocumentReady(page, effectiveConfig, logger);
      await waitForAngularRoot(page, effectiveConfig, logger);
      await waitForAngularBootstrap(page, effectiveConfig, logger);
      await waitForLoadingScreen(page, effectiveConfig, logger);
    }
    // Level 1: Basic - 基本检查加上 body 可见性
    else if (effectiveConfig.level === 'basic') {
      await waitForDocumentReady(page, effectiveConfig, logger);
      await waitForAngularRoot(page, effectiveConfig, logger);
      await waitForAngularBootstrap(page, effectiveConfig, logger);
      await waitForBodyVisible(page, effectiveConfig, logger);
      await waitForLoadingScreen(page, effectiveConfig, logger);
      await waitForNetwork(page, effectiveConfig, logger);
    }
    // Level 2: Full - 完整检查（默认）
    else {
      await waitForDocumentReady(page, effectiveConfig, logger);
      await waitForAngularRoot(page, effectiveConfig, logger);
      await waitForAngularBootstrap(page, effectiveConfig, logger);
      await waitForBodyVisible(page, effectiveConfig, logger);
      await waitForLoadingScreen(page, effectiveConfig, logger);
      await waitForAnimationCompletion(page, effectiveConfig, logger);
      await waitForNetwork(page, effectiveConfig, logger);
      await waitForIdleCycles(page, effectiveConfig, logger);
      await waitForFonts(page, effectiveConfig, logger);
      await waitForKeyElements(page, effectiveConfig, logger);
    }

    const totalDuration = Date.now() - totalStartTime;
    logger.logStep('complete', {
      duration: totalDuration,
      success: true,
    });
  } catch (error) {
    const totalDuration = Date.now() - totalStartTime;
    logger.logStep('complete', {
      duration: totalDuration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 等待延迟加载的组件
 *
 * @param page - Playwright Page 对象
 * @param selectors - 要等待的组件选择器数组
 */
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

/**
 * 快速检查应用是否已 hydration（不等待）
 *
 * @param page - Playwright Page 对象
 * @returns 是否已完成 hydration
 */
export async function isAppHydrated(page: Page): Promise<boolean> {
  try {
    return await page.evaluate(() => {
      const root = document.querySelector('arc-root');
      if (!root) return false;
      const hasContent = Array.from(root.childNodes).some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
      );
      return (
        hasContent ||
        root.hasAttribute('ng-version') ||
        root.children.length > 0
      );
    });
  } catch {
    return false;
  }
}

/**
 * 带重试的 hydration 等待
 *
 * @param page - Playwright Page 对象
 * @param maxRetries - 最大重试次数
 * @param config - hydration 配置
 */
export async function waitForAppHydrationWithRetry(
  page: Page,
  maxRetries = 2,
  config: Partial<HydrationConfig> = {},
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await waitForAppHydration(page, config);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`⚠️ Hydration attempt ${attempt} failed, retrying...`);
      await page.waitForTimeout(1000);
    }
  }
}
