import type { Page } from '@playwright/test';

/**
 * Performance Metrics Types
 */

export interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}

export interface PerformanceMetrics {
  navigationTiming: NavigationTiming;
  resourceCount: number;
  totalResourceSize: number;
  jsHeapSize?: number;
}

export interface PerformanceBudget {
  homepage: { loadTime: number; size: number };
  dashboard: { loadTime: number; size: number };
  upload: { duration: number };
  analysis: { duration: number };
}

/**
 * Measure page load performance
 */
export async function measurePageLoad(page: Page): Promise<NavigationTiming> {
  const navigationTiming = await page.evaluate(() => {
    const timing = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    const firstPaint = performance.getEntriesByName(
      'first-paint',
    )[0] as PerformanceEntry;
    const firstContentfulPaint = performance.getEntriesByName(
      'first-contentful-paint',
    )[0] as PerformanceEntry;

    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.startTime,
      loadComplete: timing.loadEventEnd - timing.startTime,
      firstPaint: firstPaint?.startTime,
      firstContentfulPaint: firstContentfulPaint?.startTime,
    };
  });
  return navigationTiming;
}

/**
 * Measure full performance metrics including resources
 */
export async function measurePerformanceMetrics(
  page: Page,
): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const timing = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    const firstPaint = performance.getEntriesByName(
      'first-paint',
    )[0] as PerformanceEntry;
    const firstContentfulPaint = performance.getEntriesByName(
      'first-contentful-paint',
    )[0] as PerformanceEntry;
    const resources = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];

    const totalResourceSize = resources.reduce((sum, resource) => {
      // Use transferSize if available, otherwise estimate
      return sum + (resource.transferSize || 0);
    }, 0);

    // Get memory info if available (Chrome only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memory = (performance as { memory?: { usedJSHeapSize: number } })
      .memory;

    return {
      navigationTiming: {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.startTime,
        loadComplete: timing.loadEventEnd - timing.startTime,
        firstPaint: firstPaint?.startTime,
        firstContentfulPaint: firstContentfulPaint?.startTime,
      },
      resourceCount: resources.length,
      totalResourceSize,
      jsHeapSize: memory?.usedJSHeapSize,
    };
  });

  return metrics;
}

/**
 * Get page size metrics
 */
export async function getPageSizeMetrics(
  page: Page,
): Promise<{ totalSize: number; resourceCount: number }> {
  const metrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];
    const totalSize = resources.reduce((sum, resource) => {
      return sum + (resource.transferSize || 0);
    }, 0);

    return {
      totalSize,
      resourceCount: resources.length,
    };
  });

  return metrics;
}

/**
 * Log performance results
 */
export function logPerformanceResults(
  testName: string,
  metrics: NavigationTiming | PerformanceMetrics,
): void {
  console.log(`\n📊 Performance Results: ${testName}`);

  if ('navigationTiming' in metrics) {
    console.log(
      `   DOM Content Loaded: ${metrics.navigationTiming.domContentLoaded.toFixed(2)}ms`,
    );
    console.log(
      `   Load Complete: ${metrics.navigationTiming.loadComplete.toFixed(2)}ms`,
    );
    if (metrics.navigationTiming.firstPaint) {
      console.log(
        `   First Paint: ${metrics.navigationTiming.firstPaint.toFixed(2)}ms`,
      );
    }
    if (metrics.navigationTiming.firstContentfulPaint) {
      console.log(
        `   First Contentful Paint: ${metrics.navigationTiming.firstContentfulPaint.toFixed(2)}ms`,
      );
    }
    console.log(`   Resources: ${metrics.resourceCount}`);
    console.log(
      `   Total Size: ${(metrics.totalResourceSize / 1024).toFixed(2)}KB`,
    );
  } else {
    console.log(
      `   DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`,
    );
    console.log(`   Load Complete: ${metrics.loadComplete.toFixed(2)}ms`);
    if (metrics.firstPaint) {
      console.log(`   First Paint: ${metrics.firstPaint.toFixed(2)}ms`);
    }
    if (metrics.firstContentfulPaint) {
      console.log(
        `   First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`,
      );
    }
  }
}

/**
 * Load performance budget configuration
 */
export function loadPerformanceBudget(): PerformanceBudget {
  return {
    homepage: { loadTime: 3000, size: 500000 },
    dashboard: { loadTime: 5000, size: 1000000 },
    upload: { duration: 30000 },
    analysis: { duration: 60000 },
  };
}

/**
 * Check if performance is within budget
 */
export function checkPerformanceBudget(
  metrics: NavigationTiming,
  budget: { loadTime: number; size?: number },
  pageSize?: number,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.loadComplete > budget.loadTime) {
    violations.push(
      `Load time ${metrics.loadComplete.toFixed(2)}ms exceeds budget ${budget.loadTime}ms`,
    );
  }

  if (budget.size && pageSize && pageSize > budget.size) {
    violations.push(
      `Page size ${(pageSize / 1024).toFixed(2)}KB exceeds budget ${(budget.size / 1024).toFixed(2)}KB`,
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Clear performance entries before measurement
 */
export async function clearPerformanceEntries(page: Page): Promise<void> {
  await page.evaluate(() => {
    performance.clearResourceTimings();
    performance.clearMeasures();
    performance.clearMarks();
  });
}

/**
 * Measure time to interactive (approximate)
 */
export async function measureTimeToInteractive(page: Page): Promise<number> {
  const tti = await page.evaluate(() => {
    const timing = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    // Approximate TTI as DOM Content Loaded + 1 second or load complete, whichever is later
    const domContentLoaded = timing.domContentLoadedEventEnd - timing.startTime;
    const loadComplete = timing.loadEventEnd - timing.startTime;
    return Math.max(domContentLoaded + 1000, loadComplete);
  });
  return tti;
}

/**
 * Generate large test file for upload testing
 */
export function generateLargeFile(
  sizeInBytes: number,
  fileName = 'test-file.pdf',
): File {
  const buffer = Buffer.alloc(sizeInBytes);
  // Fill with PDF-like content
  buffer.write('%PDF-1.4\n', 0);
  for (let i = 10; i < sizeInBytes - 10; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  buffer.write('\n%%EOF', sizeInBytes - 6);

  return new File([buffer], fileName, { type: 'application/pdf' });
}

/**
 * Create a Blob for file upload testing
 */
export function createTestBlob(
  sizeInBytes: number,
  type = 'application/pdf',
): Blob {
  const buffer = new Uint8Array(sizeInBytes);
  // Fill with random data
  for (let i = 0; i < sizeInBytes; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return new Blob([buffer], { type });
}
