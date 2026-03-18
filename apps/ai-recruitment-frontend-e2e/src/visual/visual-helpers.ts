import { Page, BrowserContext } from '@playwright/test';

/**
 * Visual Testing Helpers
 *
 * These utilities help ensure consistent visual regression testing by:
 * - Disabling animations and transitions
 * - Waiting for page stability
 * - Setting consistent themes and viewports
 */

export interface StabilityOptions {
  /**
   * Timeout in milliseconds to wait for network idle
   * @default 500
   */
  networkIdleTimeout?: number;

  /**
   * Timeout in milliseconds for stability check
   * @default 10000
   */
  timeout?: number;

  /**
   * Interval in milliseconds to check for stability
   * @default 100
   */
  checkInterval?: number;
}

/**
 * Disables all animations and transitions on the page.
 * This ensures visual snapshots are consistent and not affected by ongoing animations.
 *
 * @param page - The Playwright page object
 * @returns Promise that resolves when animations are disabled
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Disable CSS animations and transitions */
      *,
      *::before,
      *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
        scroll-behavior: auto !important;
      }

      /* Pause CSS animations */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-play-state: paused !important;
        }
      }
    `,
  });

  // Disable JavaScript animations by overriding requestAnimationFrame and setTimeout
  await page.evaluate(() => {
    // Store original functions
    const originalRAF = window.requestAnimationFrame;
    const originalCAF = window.cancelAnimationFrame;
    const originalST = window.setTimeout;
    const originalSI = window.setInterval;

    // Disable requestAnimationFrame by executing immediately
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(performance.now());
      return 0;
    };

    // Disable setTimeout for animation delays (0ms delay)
    window.setTimeout = function (
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ): number {
      // If timeout is very short (likely an animation), execute immediately
      if (timeout && timeout < 100) {
        if (typeof handler === 'function') {
          handler(...args);
          return 0;
        } else {
          // eslint-disable-next-line no-eval
          eval(handler);
          return 0;
        }
      }
      return originalST(handler, timeout, ...args);
    } as typeof window.setTimeout;

    // Store references for potential restoration
    (window as unknown as Record<string, unknown>).__originalRAF = originalRAF;
    (window as unknown as Record<string, unknown>).__originalCAF = originalCAF;
    (window as unknown as Record<string, unknown>).__originalST = originalST;
    (window as unknown as Record<string, unknown>).__originalSI = originalSI;
  });

  // Wait for style tag to apply
  await page.waitForTimeout(50);
}

/**
 * Waits for page stability by monitoring network activity and DOM mutations.
 * Useful before taking visual snapshots to ensure all resources are loaded.
 *
 * @param page - The Playwright page object
 * @param options - Configuration options for stability detection
 * @returns Promise that resolves when page is stable
 */
export async function waitForPageStability(
  page: Page,
  options: StabilityOptions = {},
): Promise<void> {
  const {
    networkIdleTimeout = 500,
    timeout = 10000,
    checkInterval = 100,
  } = options;

  // Wait for load state
  await page.waitForLoadState('networkidle', { timeout });

  // Wait for any images to finish loading
  await page.waitForFunction(
    () => {
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (!img.complete) {
          return false;
        }
      }
      return true;
    },
    { timeout },
  );

  // Wait for fonts to load
  await page.waitForFunction(
    () => {
      return (
        (document as unknown as Record<string, unknown>).fonts?.ready ?? true
      );
    },
    { timeout },
  );

  // Additional stability wait
  await page.waitForTimeout(networkIdleTimeout);
}

/**
 * Sets the color scheme/theme for the page.
 * Ensures consistent theming across visual tests.
 *
 * @param page - The Playwright page object
 * @param theme - The theme to set ('light' | 'dark')
 * @returns Promise that resolves when theme is set
 */
export async function setTheme(
  page: Page,
  theme: 'light' | 'dark',
): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });

  // Also set a data attribute on the document for CSS-based theming
  await page.evaluate((t: string) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

/**
 * Sets the viewport with a specific device scale factor.
 * Useful for testing responsive designs with consistent rendering.
 *
 * @param page - The Playwright page object
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 * @param scale - Device scale factor (default: 1)
 * @returns Promise that resolves when viewport is set
 */
export async function setViewportWithDeviceScale(
  page: Page,
  width: number,
  height: number,
  scale = 1,
): Promise<void> {
  await page.setViewportSize({ width, height });

  // Note: deviceScaleFactor can only be set when creating a new context
  // For existing pages, we need to create a new browser context
  // This is handled by the caller if needed
}

/**
 * Creates a new browser context with specified device scale for high-DPI testing.
 *
 * @param context - The Playwright browser context
 * @param scale - Device scale factor (default: 1)
 * @returns Promise that resolves with a new page instance
 */
export async function createPageWithDeviceScale(
  context: BrowserContext,
  scale = 1,
): Promise<Page> {
  // Create a new context with the desired device scale
  const newContext = await context.browser()?.newContext({
    deviceScaleFactor: scale,
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });

  if (!newContext) {
    throw new Error('Failed to create new browser context');
  }

  return newContext.newPage();
}

/**
 * Performs a full page setup for visual testing.
 * Combines animation disabling, theme setting, and stability waiting.
 *
 * @param page - The Playwright page object
 * @param options - Configuration options
 * @returns Promise that resolves when setup is complete
 */
export async function setupVisualTest(
  page: Page,
  options: {
    theme?: 'light' | 'dark';
    stabilityOptions?: StabilityOptions;
  } = {},
): Promise<void> {
  const { theme = 'light', stabilityOptions } = options;

  // Disable animations first
  await disableAnimations(page);

  // Set theme
  await setTheme(page, theme);

  // Wait for page to be stable
  await waitForPageStability(page, stabilityOptions);
}

/**
 * Helper to generate consistent snapshot filenames.
 *
 * @param testName - Base name of the test
 * @param viewport - Optional viewport info
 * @param suffix - Optional suffix
 * @returns Formatted snapshot filename
 */
export function generateSnapshotName(
  testName: string,
  viewport?: { width: number; height: number },
  suffix?: string,
): string {
  const parts = [testName];

  if (viewport) {
    parts.push(`${viewport.width}x${viewport.height}`);
  }

  if (suffix) {
    parts.push(suffix);
  }

  return parts.join('-');
}

/**
 * Scrolls an element into view and waits for it to be stable.
 * Useful for testing specific components.
 *
 * @param page - The Playwright page object
 * @param selector - CSS selector for the element
 * @returns Promise that resolves when element is visible and stable
 */
export async function scrollIntoView(
  page: Page,
  selector: string,
): Promise<void> {
  const element = page.locator(selector).first();

  await element.scrollIntoViewIfNeeded();
  await element.waitFor({ state: 'visible' });

  // Small delay to ensure element is fully rendered
  await page.waitForTimeout(100);
}
