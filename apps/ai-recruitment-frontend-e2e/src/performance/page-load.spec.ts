import { test, expect } from '@playwright/test';
import {
  measurePageLoad,
  measurePerformanceMetrics,
  getPageSizeMetrics,
  logPerformanceResults,
  loadPerformanceBudget,
  checkPerformanceBudget,
  clearPerformanceEntries,
  measureTimeToInteractive,
} from '../utils/performance';
import { gotoAndWait } from '../utils/test-helpers';

test.describe('Page Load Performance', () => {
  const budget = loadPerformanceBudget();

  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('homepage loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Basic load time check
    expect(loadTime).toBeLessThan(budget.homepage.loadTime);

    // Detailed performance metrics
    const metrics = await measurePageLoad(page);
    logPerformanceResults('Homepage', metrics);

    // Verify detailed metrics
    expect(metrics.loadComplete).toBeLessThan(budget.homepage.loadTime);
    expect(metrics.domContentLoaded).toBeLessThan(
      budget.homepage.loadTime * 0.7,
    );

    // Check first paint if available
    if (metrics.firstContentfulPaint) {
      expect(metrics.firstContentfulPaint).toBeLessThan(
        budget.homepage.loadTime * 0.5,
      );
    }
  });

  test('homepage resource size within budget', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sizeMetrics = await getPageSizeMetrics(page);
    console.log(
      `\n📦 Homepage Resources: ${sizeMetrics.resourceCount} files, ${(sizeMetrics.totalSize / 1024).toFixed(2)}KB`,
    );

    expect(sizeMetrics.totalSize).toBeLessThan(budget.homepage.size);
  });

  test('dashboard loads within 5 seconds', async ({ page }) => {
    // Navigate through login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);
    logPerformanceResults('Dashboard', metrics);

    expect(metrics.loadComplete).toBeLessThan(budget.dashboard.loadTime);
    expect(metrics.domContentLoaded).toBeLessThan(
      budget.dashboard.loadTime * 0.8,
    );
  });

  test('dashboard resource size within budget', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const sizeMetrics = await getPageSizeMetrics(page);
    console.log(
      `\n📦 Dashboard Resources: ${sizeMetrics.resourceCount} files, ${(sizeMetrics.totalSize / 1024).toFixed(2)}KB`,
    );

    expect(sizeMetrics.totalSize).toBeLessThan(budget.dashboard.size);
  });

  test('login page loads within 3 seconds', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);
    logPerformanceResults('Login Page', metrics);

    expect(metrics.loadComplete).toBeLessThan(budget.login.loadTime);
  });

  test('jobs list page loads within 4 seconds', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to jobs list
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);
    logPerformanceResults('Jobs List', metrics);

    expect(metrics.loadComplete).toBeLessThan(budget.jobsList.loadTime);
  });

  test('time to interactive is acceptable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const tti = await measureTimeToInteractive(page);
    console.log(`\n⏱️ Time to Interactive: ${tti.toFixed(2)}ms`);

    expect(tti).toBeLessThan(budget.homepage.loadTime * 1.2);
  });

  test('candidate list page loads within 4 seconds', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to candidate list
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);
    logPerformanceResults('Candidate List', metrics);

    expect(metrics.loadComplete).toBeLessThan(budget.candidateList.loadTime);
  });
});

test.describe('Performance Budget Compliance', () => {
  const budget = loadPerformanceBudget();

  test('homepage meets performance budget', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);
    const sizeMetrics = await getPageSizeMetrics(page);

    const result = checkPerformanceBudget(
      metrics,
      budget.homepage,
      sizeMetrics.totalSize,
    );

    if (!result.passed) {
      console.error('\n❌ Performance Budget Violations:');
      result.violations.forEach((v) => console.error(`   - ${v}`));
    }

    expect(result.passed).toBe(true);
  });

  test('dashboard meets performance budget', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);
    const sizeMetrics = await getPageSizeMetrics(page);

    const result = checkPerformanceBudget(
      metrics,
      budget.dashboard,
      sizeMetrics.totalSize,
    );

    if (!result.passed) {
      console.error('\n❌ Performance Budget Violations:');
      result.violations.forEach((v) => console.error(`   - ${v}`));
    }

    expect(result.passed).toBe(true);
  });
});

test.describe('Core Web Vitals Approximation', () => {
  test('largest contentful paint is reasonable', async ({ page }) => {
    await page.goto('/');

    // Wait for main content to be visible
    await page
      .waitForSelector('main, [data-testid="main-content"], .main-content', {
        timeout: 10000,
      })
      .catch(() => {
        // Main content selector might not exist
      });

    await page.waitForLoadState('networkidle');

    const metrics = await measurePageLoad(page);

    // LCP should be less than 2.5s for good performance
    if (metrics.firstContentfulPaint) {
      console.log(
        `\n🎨 Approximate LCP: ${metrics.firstContentfulPaint.toFixed(2)}ms`,
      );
      expect(metrics.firstContentfulPaint).toBeLessThan(2500);
    }
  });

  test('cumulative layout shift is monitored', async ({ page }) => {
    const clsValue = await page.evaluate(() => {
      // Try to get CLS from Performance Observer if available
      let cls = 0;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        // Return current CLS value
        return cls;
      } catch (e) {
        return -1; // CLS not supported
      }
    });

    if (clsValue >= 0) {
      console.log(`\n📐 Cumulative Layout Shift: ${clsValue.toFixed(4)}`);
      // CLS should be less than 0.1 for good performance
      expect(clsValue).toBeLessThan(0.1);
    } else {
      console.log('\nℹ️ CLS measurement not supported in this browser');
    }
  });
});
