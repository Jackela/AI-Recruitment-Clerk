import type { Page } from '@playwright/test';

const HYDRATED_COMPONENTS = [
  'arc-language-selector',
  'arc-theme-toggle',
  'arc-guide-overlay',
  'arc-status-notifications',
];

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 30000;
const LOADING_TIMEOUT = 20000;
const NETWORK_IDLE_TIMEOUT = 15000;

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

async function waitForNetworkIdle(page: Page): Promise<void> {
  // 等待网络空闲 - 使用更稳定的实现
  try {
    await page.waitForLoadState('networkidle', {
      timeout: NETWORK_IDLE_TIMEOUT,
    });
  } catch {
    // 如果超时，继续执行
    console.log('⚠️ Network idle timeout, continuing anyway');
  }
}

/**
 * 等待应用完全加载和hydrate
 * 增强版：更好的错误处理和多重检查
 */
export async function waitForAppHydration(page: Page): Promise<void> {
  console.log('⏳ Starting app hydration wait...');

  // Step 1: 等待 document 加载完成（首先确保页面已加载）
  await page.waitForFunction(() => document.readyState === 'complete', null, {
    timeout: DEFAULT_TIMEOUT,
  });
  console.log('✅ Document readyState is complete');

  // Step 2: 等待 arc-root 被附加到 DOM
  try {
    await page
      .locator('arc-root')
      .waitFor({ state: 'attached', timeout: DEFAULT_TIMEOUT });
    console.log('✅ arc-root element attached');
  } catch (error) {
    console.log('⚠️ arc-root not found as attached, checking visibility...');
    // 尝试等待可见性
    await page
      .locator('arc-root')
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {
        console.log('⚠️ arc-root not visible either, continuing...');
      });
  }

  // Step 3: 等待 Angular 启动完成（检查是否有内容渲染）
  await page.waitForFunction(
    () => {
      const root = document.querySelector('arc-root');
      if (!root) return false;
      // 检查是否有实际内容（不只是注释节点）
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
    { timeout: DEFAULT_TIMEOUT },
  );
  console.log('✅ Angular bootstrap complete');

  // Step 4: 等待 body 可见且不被隐藏
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
    { timeout: DEFAULT_TIMEOUT },
  );
  console.log('✅ Body is visible');

  // Step 5: 等待加载屏幕消失（更健壮的检查）
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
      { timeout: LOADING_TIMEOUT },
    );
    console.log('✅ Loading screen disappeared');
  } catch {
    console.log('⚠️ Loading screen timeout, continuing anyway');
  }

  // Step 6: 额外等待以确保加载屏幕动画完成
  await page.waitForTimeout(500);

  // Step 7: 等待网络空闲
  await waitForNetworkIdle(page);

  // Step 8: 等待空闲周期
  await waitForIdle(page);
  await waitForIdle(page);

  // Step 9: 等待字体加载完成
  try {
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Font timeout')), 5000),
      ),
    ]);
  } catch {
    /* ignore font timeout */
  }

  // Step 10: 等待至少一个关键元素被渲染
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
    console.log('✅ Key elements rendered');
  } catch {
    console.log('⚠️ Some key elements not found, continuing anyway');
  }

  console.log('✅ App hydration complete');
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
