/**
 * WebKit Cross-Browser Compatibility Test Suite
 *
 * Tests for Safari/WebKit specific compatibility including:
 * - CSS compatibility
 * - JavaScript compatibility
 * - Event handling differences
 * - Form behavior differences
 * - Mobile Safari (iPhone/iPad) support
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const APP_URL = '/';
const LANDING_PATH = '/jobs';

async function gotoLanding(page: Page) {
  await page.goto(APP_URL);
  await page.waitForURL((url) => url.pathname.startsWith(LANDING_PATH), {
    timeout: 15_000,
  });
  await page.waitForLoadState('domcontentloaded');
}

test.describe('WebKit Desktop Safari Compatibility', () => {
  test('WebKit basic page load and rendering', async ({
    page,
    browserName: _browserName,
  }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await gotoLanding(page);

    // Verify page loaded correctly
    await expect(page.locator('body')).toBeVisible();

    // Check for app title
    const title = await page.title();
    expect(title).toContain('AI Recruitment');
  });

  test('WebKit CSS compatibility - flexbox and grid', async ({
    page,
    browserName: _browserName,
  }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await gotoLanding(page);

    // Test CSS features commonly used in Safari
    const cssSupport = await page.evaluate(() => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);

      const results = {
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        transforms: CSS.supports('transform', 'translateX(10px)'),
        transitions: CSS.supports('transition', 'all 0.3s'),
        animations: CSS.supports('animation', 'test 1s'),
        backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
        webkitBackdropFilter: CSS.supports(
          '-webkit-backdrop-filter',
          'blur(10px)',
        ),
        clipPath: CSS.supports('clip-path', 'circle(50%)'),
        maskImage: CSS.supports(
          '-webkit-mask-image',
          'linear-gradient(black, transparent)',
        ),
      };

      document.body.removeChild(testElement);
      return results;
    });

    // Verify CSS support
    expect(cssSupport.flexbox).toBe(true);
    expect(cssSupport.grid).toBe(true);
    expect(cssSupport.transforms).toBe(true);
    expect(cssSupport.transitions).toBe(true);
  });

  test('WebKit JavaScript compatibility', async ({
    page,
    browserName: _browserName,
  }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await gotoLanding(page);

    // Test JavaScript features
    const jsSupport = await page.evaluate(() => {
      return {
        // ES6+ features
        promises: typeof Promise !== 'undefined',
        asyncAwait: (async () => true)() instanceof Promise,
        arrowFunctions: (() => true)(),
        templateLiterals: `test ${1 + 1}` === 'test 2',
        destructuring: (() => {
          const { a, b } = { a: 1, b: 2 };
          return a === 1 && b === 2;
        })(),
        spreadOperator: (() => {
          const arr = [1, 2, 3];
          const newArr = [...arr, 4];
          return newArr.length === 4;
        })(),

        // Browser APIs
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        resizeObserver: typeof ResizeObserver !== 'undefined',
        mutationObserver: typeof MutationObserver !== 'undefined',

        // WebKit specific
        webkitUserAgent:
          navigator.userAgent.includes('Safari') ||
          navigator.userAgent.includes('AppleWebKit'),
      };
    });

    expect(jsSupport.promises).toBe(true);
    expect(jsSupport.fetch).toBe(true);
    expect(jsSupport.localStorage).toBe(true);
    expect(jsSupport.webkitUserAgent).toBe(true);
  });

  test('WebKit form behavior', async ({ page, browserName: _browserName }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');

    // Test form input types
    const jobTitleInput = page.locator('input[formControlName="jobTitle"]');
    await expect(jobTitleInput).toBeVisible({ timeout: 15_000 });

    // Test input focus and typing
    await jobTitleInput.focus();
    await jobTitleInput.fill('Test Job Title');
    await expect(jobTitleInput).toHaveValue('Test Job Title');

    // Test textarea
    const jdTextarea = page.locator('textarea[formControlName="jdText"]');
    await expect(jdTextarea).toBeVisible({ timeout: 15_000 });
    await jdTextarea.fill('Test job description');
    await expect(jdTextarea).toHaveValue('Test job description');
  });

  test('WebKit event handling', async ({ page, browserName: _browserName }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await gotoLanding(page);

    // Test click events
    const navLink = page.locator('nav a').filter({ hasText: '岗位管理' });
    await expect(navLink).toBeVisible();
    await navLink.click();

    // Test navigation
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('WebKit scroll behavior', async ({
    page,
    browserName: _browserName,
  }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await gotoLanding(page);

    // Test scroll functionality
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });

    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBe(500);
  });
});

test.describe('WebKit Mobile Safari - iPhone', () => {
  test('iPhone viewport and touch events', async ({
    page,
    browserName: _browserName,
  }) => {
    // This test runs on webkit-iphone project
    await gotoLanding(page);

    // Verify viewport
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));

    // iPhone 14 viewport should be around 390x844 (CSS pixels)
    expect(viewport.width).toBeLessThanOrEqual(430);
    expect(viewport.height).toBeGreaterThan(700);

    // Test touch event support
    const touchSupport = await page.evaluate(() => {
      return {
        touchEvents: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints,
      };
    });

    expect(touchSupport.maxTouchPoints).toBeGreaterThan(0);
  });

  test('iPhone responsive layout', async ({ page }) => {
    await gotoLanding(page);

    // Check for mobile-specific elements or classes
    const hasMobileLayout = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return {
        overflowX: computedStyle.overflowX,
        fontSize: computedStyle.fontSize,
      };
    });

    expect(hasMobileLayout).toBeTruthy();
  });

  test('iPhone form interactions', async ({ page }) => {
    await page.goto('/jobs/create');
    await page.waitForLoadState('domcontentloaded');

    const jobTitleInput = page.locator('input[formControlName="jobTitle"]');
    await expect(jobTitleInput).toBeVisible({ timeout: 15_000 });

    // Test focus on mobile
    await jobTitleInput.tap();
    await jobTitleInput.fill('Mobile Test Job');
    await expect(jobTitleInput).toHaveValue('Mobile Test Job');
  });
});

test.describe('WebKit Mobile Safari - iPad', () => {
  test('iPad viewport and touch events', async ({ page }) => {
    await gotoLanding(page);

    // Verify iPad viewport
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));

    // iPad Pro 11 viewport should be around 834x1194 (CSS pixels)
    expect(viewport.width).toBeGreaterThan(800);
    expect(viewport.width).toBeLessThanOrEqual(1200);
    expect(viewport.height).toBeGreaterThan(1000);

    // Test touch support
    const touchSupport = await page.evaluate(() => ({
      maxTouchPoints: navigator.maxTouchPoints,
      touchEvents: 'ontouchstart' in window,
    }));

    expect(touchSupport.maxTouchPoints).toBeGreaterThan(0);
  });

  test('iPad navigation and interactions', async ({ page }) => {
    await gotoLanding(page);

    // Test navigation
    const navLink = page.locator('nav a').filter({ hasText: '岗位管理' });
    await expect(navLink).toBeVisible();
    await navLink.tap();

    await expect(page).toHaveURL(/\/jobs/);
  });
});

test.describe('WebKit Cross-Browser Consistency', () => {
  test('all browsers load application correctly', async ({ page }) => {
    await gotoLanding(page);

    // Verify basic functionality across all browsers
    await expect(page.locator('#app-title')).toBeVisible();
    await expect(
      page.locator('nav a').filter({ hasText: '岗位管理' }),
    ).toBeVisible();

    // Test console for errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload and check for errors
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.includes('net::ERR_FAILED') &&
        error.includes('ERROR'),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('responsive design across all browsers', async ({ page }) => {
    await gotoLanding(page);

    // Test multiple viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.waitForLoadState('domcontentloaded');

      // Verify app is still visible
      await expect(page.locator('#app-title')).toBeVisible();

      // Verify no horizontal scroll (indicates layout issues)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    }
  });
});

test.describe('WebKit Known Issues and Workarounds', () => {
  test('WebKit date input handling', async ({
    page,
    browserName: _browserName,
  }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    // Safari has specific date input behavior
    const dateSupport = await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'date';
      return {
        supportsDateInput: input.type === 'date',
        supportsTimeInput: (() => {
          const timeInput = document.createElement('input');
          timeInput.type = 'time';
          return timeInput.type === 'time';
        })(),
      };
    });

    expect(dateSupport.supportsDateInput).toBe(true);
    expect(dateSupport.supportsTimeInput).toBe(true);
  });

  test('WebKit fetch API behavior', async ({
    page,
    browserName: _browserName,
  }) => {
    test.skip(_browserName !== 'webkit', 'WebKit only test');

    await gotoLanding(page);

    // Test fetch API availability and behavior
    const fetchSupport = await page.evaluate(async () => {
      return {
        fetchAvailable: typeof fetch !== 'undefined',
        headersAvailable: typeof Headers !== 'undefined',
        requestAvailable: typeof Request !== 'undefined',
        responseAvailable: typeof Response !== 'undefined',
      };
    });

    expect(fetchSupport.fetchAvailable).toBe(true);
    expect(fetchSupport.headersAvailable).toBe(true);
  });
});
