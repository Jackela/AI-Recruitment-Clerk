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

/**
 * Core Web Vitals Metrics
 */
export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fid?: number; // First Input Delay
  tbt?: number; // Total Blocking Time
}

/**
 * Measure Core Web Vitals performance
 */
export async function measurePerformance(
  page: Page,
  url: string,
): Promise<CoreWebVitals> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const navigationTiming = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    // TTFB
    const ttfb = navigationTiming.responseStart - navigationTiming.startTime;

    // FCP
    const fcpEntry = performance.getEntriesByName(
      'first-contentful-paint',
    )[0] as PerformancePaintTiming;
    const fcp = fcpEntry ? fcpEntry.startTime : 0;

    // LCP (simplified - get last entry)
    const lcpEntries = performance.getEntriesByType(
      'largest-contentful-paint',
    ) as PerformanceEntry[];
    const lcp =
      lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : fcp;

    // CLS (cumulative)
    let cls = 0;
    const layoutShiftEntries = performance.getEntriesByType(
      'layout-shift',
    ) as PerformanceEntry[];
    layoutShiftEntries.forEach((entry) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(entry as any).hadRecentInput) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cls += (entry as any).value;
      }
    });

    return { lcp, fcp, cls, ttfb };
  });

  return metrics;
}

/**
 * Check Core Web Vitals against budgets
 */
export function checkCoreWebVitalsBudget(
  metrics: CoreWebVitals,
  budget: Partial<CoreWebVitals>,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (budget.lcp !== undefined && metrics.lcp > budget.lcp) {
    violations.push(
      `LCP ${metrics.lcp.toFixed(2)}ms exceeds budget ${budget.lcp}ms`,
    );
  }
  if (budget.fcp !== undefined && metrics.fcp > budget.fcp) {
    violations.push(
      `FCP ${metrics.fcp.toFixed(2)}ms exceeds budget ${budget.fcp}ms`,
    );
  }
  if (budget.cls !== undefined && metrics.cls > budget.cls) {
    violations.push(
      `CLS ${metrics.cls.toFixed(4)} exceeds budget ${budget.cls}`,
    );
  }
  if (budget.ttfb !== undefined && metrics.ttfb > budget.ttfb) {
    violations.push(
      `TTFB ${metrics.ttfb.toFixed(2)}ms exceeds budget ${budget.ttfb}ms`,
    );
  }
  if (budget.fid !== undefined && metrics.fid && metrics.fid > budget.fid) {
    violations.push(
      `FID ${metrics.fid.toFixed(2)}ms exceeds budget ${budget.fid}ms`,
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Performance budgets for different pages
 */
export const PERFORMANCE_BUDGETS = {
  homepage: { lcp: 2500, fcp: 1800, cls: 0.1, ttfb: 600, size: 500000 },
  dashboard: { lcp: 3000, fcp: 2000, cls: 0.1, ttfb: 800, size: 1000000 },
  jobsList: { lcp: 2500, fcp: 1500, cls: 0.1, ttfb: 600, size: 800000 },
  analysis: { lcp: 5000, fcp: 3000, cls: 0.15, ttfb: 1000, duration: 70000 },
};

/**
 * Measure memory usage
 */
export async function measureMemoryUsage(page: Page): Promise<{
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}> {
  const memory = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perf = performance as any;
    if (perf.memory) {
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      };
    }
    return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
  });

  return memory;
}

/**
 * Detect memory leaks by comparing memory usage
 */
export async function detectMemoryLeak(
  page: Page,
  action: () => Promise<void>,
  iterations = 10,
): Promise<{ hasLeak: boolean; growthRate: number; samples: number[] }> {
  const samples: number[] = [];

  // Initial measurement
  await action();
  const initialMemory = await measureMemoryUsage(page);
  samples.push(initialMemory.usedJSHeapSize);

  // Run iterations
  for (let i = 0; i < iterations; i++) {
    await action();
    const memory = await measureMemoryUsage(page);
    samples.push(memory.usedJSHeapSize);
  }

  // Calculate growth rate
  const growthRate = (samples[samples.length - 1] - samples[0]) / iterations;
  const hasLeak = growthRate > 1024 * 1024; // Threshold: 1MB growth per iteration

  return { hasLeak, growthRate, samples };
}

/**
 * Measure network requests
 */
export async function measureNetworkRequests(page: Page): Promise<{
  totalRequests: number;
  totalSize: number;
  requestsByType: Record<string, number>;
  slowestRequests: Array<{ url: string; duration: number }>;
}> {
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];
  });

  const requestsByType: Record<string, number> = {};
  const slowestRequests: Array<{ url: string; duration: number }> = [];
  let totalSize = 0;

  resources.forEach((resource) => {
    // Count by type
    const url = resource.name;
    const extension = url.split('.').pop()?.split('?')[0] || 'unknown';
    requestsByType[extension] = (requestsByType[extension] || 0) + 1;

    // Accumulate size
    totalSize += resource.transferSize || 0;

    // Track slow requests
    const duration = resource.responseEnd - resource.startTime;
    slowestRequests.push({ url, duration });
  });

  // Sort by duration descending
  slowestRequests.sort((a, b) => b.duration - a.duration);

  return {
    totalRequests: resources.length,
    totalSize,
    requestsByType,
    slowestRequests: slowestRequests.slice(0, 10), // Top 10 slowest
  };
}

/**
 * Measure interaction response time
 */
export async function measureInteractionLatency(
  page: Page,
  selector: string,
  action: 'click' | 'hover' | 'focus' = 'click',
): Promise<{ startTime: number; endTime: number; duration: number }> {
  const startTime = Date.now();

  if (action === 'click') {
    await page.click(selector);
  } else if (action === 'hover') {
    await page.hover(selector);
  } else if (action === 'focus') {
    await page.focus(selector);
  }

  // Wait for any animations or updates
  await page.waitForTimeout(100);

  const endTime = Date.now();

  return {
    startTime,
    endTime,
    duration: endTime - startTime,
  };
}

/**
 * Measure input delay
 */
export async function measureInputDelay(
  page: Page,
  selector: string,
  text: string,
): Promise<{ duration: number; charsPerSecond: number }> {
  const startTime = Date.now();

  await page.fill(selector, text);

  const endTime = Date.now();
  const duration = endTime - startTime;

  return {
    duration,
    charsPerSecond: (text.length / duration) * 1000,
  };
}

/**
 * Measure animation frame rate
 */
export async function measureFrameRate(
  page: Page,
  duration = 3000,
): Promise<{
  averageFps: number;
  minFps: number;
  maxFps: number;
  samples: number[];
}> {
  const result = await page.evaluate((measureDuration) => {
    return new Promise<{
      averageFps: number;
      minFps: number;
      maxFps: number;
      samples: number[];
    }>((resolve) => {
      const samples: number[] = [];
      let frameCount = 0;
      let lastTime = performance.now();
      let minFps = Infinity;
      let maxFps = 0;

      const measure = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;
        frameCount++;

        if (elapsed >= 1000) {
          const fps = (frameCount / elapsed) * 1000;
          samples.push(fps);
          minFps = Math.min(minFps, fps);
          maxFps = Math.max(maxFps, fps);
          frameCount = 0;
          lastTime = currentTime;
        }

        if (currentTime < measureDuration) {
          requestAnimationFrame(measure);
        } else {
          resolve({
            averageFps: samples.reduce((a, b) => a + b, 0) / samples.length,
            minFps: minFps === Infinity ? 0 : minFps,
            maxFps,
            samples,
          });
        }
      };

      requestAnimationFrame(measure);
    });
  }, duration);

  return result;
}
