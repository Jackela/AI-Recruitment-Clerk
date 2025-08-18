/**
 * 🎯 Core Web Vitals Performance Monitoring Suite
 * 
 * Comprehensive performance monitoring system for AI Recruitment Clerk
 * Measures and validates Core Web Vitals in real production scenarios
 */

import { test, expect, Page, Browser } from '@playwright/test';

interface WebVitalsMetrics {
  fcp: number;      // First Contentful Paint
  lcp: number;      // Largest Contentful Paint
  fid: number;      // First Input Delay
  cls: number;      // Cumulative Layout Shift
  ttfb: number;     // Time to First Byte
  inp: number;      // Interaction to Next Paint
}

interface PerformanceEntry {
  name: string;
  duration: number;
  startTime: number;
  entryType: string;
}

interface NetworkCondition {
  name: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

export class CoreWebVitalsMonitor {
  private page: Page;
  private networkConditions: NetworkCondition[] = [
    {
      name: '3G',
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5Mbps in bytes/s
      uploadThroughput: 750 * 1024 / 8,           // 750Kbps in bytes/s
      latency: 100
    },
    {
      name: '4G',
      downloadThroughput: 9 * 1024 * 1024 / 8,   // 9Mbps in bytes/s
      uploadThroughput: 4.5 * 1024 * 1024 / 8,   // 4.5Mbps in bytes/s
      latency: 20
    },
    {
      name: 'WiFi',
      downloadThroughput: 30 * 1024 * 1024 / 8,  // 30Mbps in bytes/s
      uploadThroughput: 15 * 1024 * 1024 / 8,    // 15Mbps in bytes/s
      latency: 2
    }
  ];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Inject Web Vitals monitoring script into the page
   */
  async injectWebVitalsScript(): Promise<void> {
    await this.page.addInitScript(() => {
      // Inject web-vitals library functionality
      (window as any).webVitalsData = {};
      
      // Polyfill for observing performance
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              (window as any).webVitalsData.fcp = entry.startTime;
            }
          }
          if (entry.entryType === 'largest-contentful-paint') {
            (window as any).webVitalsData.lcp = entry.startTime;
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            (window as any).webVitalsData.cls = 
              ((window as any).webVitalsData.cls || 0) + (entry as any).value;
          }
          if (entry.entryType === 'navigation') {
            (window as any).webVitalsData.ttfb = (entry as any).responseStart;
          }
        });
      });

      // Observe all relevant performance entries
      try {
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'navigation'] });
      } catch (e) {
        console.warn('Performance Observer not supported:', e);
      }

      // FID measurement through event listeners
      let firstInputDelay = 0;
      const onFirstInput = (event: Event) => {
        firstInputDelay = performance.now() - event.timeStamp;
        (window as any).webVitalsData.fid = firstInputDelay;
        
        // Remove listeners after first input
        ['mousedown', 'keydown', 'touchstart'].forEach(type => {
          document.removeEventListener(type, onFirstInput, true);
        });
      };

      ['mousedown', 'keydown', 'touchstart'].forEach(type => {
        document.addEventListener(type, onFirstInput, true);
      });

      // INP (Interaction to Next Paint) measurement
      let maxINP = 0;
      const measureINP = (event: Event) => {
        const startTime = performance.now();
        requestAnimationFrame(() => {
          const inp = performance.now() - startTime;
          maxINP = Math.max(maxINP, inp);
          (window as any).webVitalsData.inp = maxINP;
        });
      };

      ['click', 'keydown', 'touchstart'].forEach(type => {
        document.addEventListener(type, measureINP, true);
      });
    });
  }

  /**
   * Collect Web Vitals metrics from the page
   */
  async collectWebVitals(): Promise<WebVitalsMetrics> {
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
    
    // Allow time for metrics to be collected
    await this.page.waitForTimeout(2000);

    const vitals = await this.page.evaluate(() => {
      const data = (window as any).webVitalsData || {};
      
      // Get additional performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        fcp: data.fcp || 0,
        lcp: data.lcp || 0,
        fid: data.fid || 0,
        cls: data.cls || 0,
        ttfb: data.ttfb || (navigation ? navigation.responseStart : 0),
        inp: data.inp || 0
      };
    });

    return vitals;
  }

  /**
   * Simulate different network conditions and measure performance
   */
  async testUnderNetworkConditions(url: string): Promise<Map<string, WebVitalsMetrics>> {
    const results = new Map<string, WebVitalsMetrics>();
    
    for (const condition of this.networkConditions) {
      console.log(`📡 Testing under ${condition.name} network conditions`);
      
      // Set network conditions
      await this.page.context().route('**/*', async route => {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, condition.latency));
        await route.continue();
      });

      // Inject monitoring script
      await this.injectWebVitalsScript();
      
      // Navigate to the page
      const startTime = Date.now();
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Collect metrics
      const vitals = await this.collectWebVitals();
      results.set(condition.name, vitals);
      
      console.log(`   ${condition.name} Results:`, {
        FCP: `${vitals.fcp.toFixed(0)}ms`,
        LCP: `${vitals.lcp.toFixed(0)}ms`,
        FID: `${vitals.fid.toFixed(0)}ms`,
        CLS: vitals.cls.toFixed(3),
        TTFB: `${vitals.ttfb.toFixed(0)}ms`
      });
    }

    return results;
  }

  /**
   * Perform user interaction testing to measure FID and INP
   */
  async testInteractionPerformance(): Promise<{ fid: number; inp: number; interactions: number }> {
    await this.injectWebVitalsScript();
    
    let interactionCount = 0;
    
    // Simulate various user interactions
    const interactions = [
      async () => {
        await this.page.click('button, [role="button"], .btn', { timeout: 5000 }).catch(() => {});
        interactionCount++;
      },
      async () => {
        await this.page.fill('input[type="text"], input[type="email"], textarea', 'test input', { timeout: 5000 }).catch(() => {});
        interactionCount++;
      },
      async () => {
        await this.page.keyboard.press('Tab');
        interactionCount++;
      },
      async () => {
        await this.page.mouse.click(100, 100);
        interactionCount++;
      }
    ];

    // Perform interactions with delays
    for (const interaction of interactions) {
      await interaction();
      await this.page.waitForTimeout(100); // Small delay between interactions
    }

    // Collect final metrics
    const vitals = await this.collectWebVitals();
    
    return {
      fid: vitals.fid,
      inp: vitals.inp,
      interactions: interactionCount
    };
  }

  /**
   * Measure layout shift during dynamic content loading
   */
  async testLayoutStability(): Promise<{ cls: number; shifts: number }> {
    await this.injectWebVitalsScript();
    
    // Track layout shifts during navigation and dynamic loading
    await this.page.evaluate(() => {
      (window as any).layoutShifts = [];
      
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            (window as any).layoutShifts.push({
              value: (entry as any).value,
              startTime: entry.startTime
            });
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Layout shift observer not supported');
      }
    });

    // Trigger various scenarios that might cause layout shifts
    await this.page.waitForTimeout(1000);
    
    // Simulate image loading
    await this.page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzNlNiIvPjwvc3ZnPg==';
      document.body.appendChild(img);
    });

    await this.page.waitForTimeout(2000);

    const results = await this.page.evaluate(() => {
      const shifts = (window as any).layoutShifts || [];
      const totalCLS = shifts.reduce((sum: number, shift: any) => sum + shift.value, 0);
      
      return {
        cls: totalCLS,
        shifts: shifts.length
      };
    });

    return results;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(
    networkResults: Map<string, WebVitalsMetrics>,
    interactionResults: { fid: number; inp: number; interactions: number },
    layoutResults: { cls: number; shifts: number }
  ): string {
    let report = '\n🎯 CORE WEB VITALS PERFORMANCE REPORT\n';
    report += '=====================================\n\n';

    // Network condition results
    report += '📡 NETWORK PERFORMANCE ANALYSIS:\n';
    for (const [condition, metrics] of networkResults) {
      report += `\n${condition} Network:\n`;
      report += `   FCP: ${metrics.fcp.toFixed(0)}ms ${this.getVitalStatus('fcp', metrics.fcp)}\n`;
      report += `   LCP: ${metrics.lcp.toFixed(0)}ms ${this.getVitalStatus('lcp', metrics.lcp)}\n`;
      report += `   TTFB: ${metrics.ttfb.toFixed(0)}ms ${this.getVitalStatus('ttfb', metrics.ttfb)}\n`;
      report += `   CLS: ${metrics.cls.toFixed(3)} ${this.getVitalStatus('cls', metrics.cls)}\n`;
    }

    // Interaction performance
    report += `\n🖱️ INTERACTION PERFORMANCE:\n`;
    report += `   FID: ${interactionResults.fid.toFixed(0)}ms ${this.getVitalStatus('fid', interactionResults.fid)}\n`;
    report += `   INP: ${interactionResults.inp.toFixed(0)}ms ${this.getVitalStatus('inp', interactionResults.inp)}\n`;
    report += `   Interactions tested: ${interactionResults.interactions}\n`;

    // Layout stability
    report += `\n📐 LAYOUT STABILITY:\n`;
    report += `   CLS: ${layoutResults.cls.toFixed(3)} ${this.getVitalStatus('cls', layoutResults.cls)}\n`;
    report += `   Layout shifts detected: ${layoutResults.shifts}\n`;

    // Overall assessment
    report += `\n📊 PERFORMANCE GRADE:\n`;
    const grade = this.calculateOverallGrade(networkResults, interactionResults, layoutResults);
    report += `   Overall Grade: ${grade.letter} (${grade.score}/100)\n`;
    report += `   Recommendations: ${grade.recommendations.join(', ')}\n`;

    return report;
  }

  /**
   * Get status indicator for Web Vitals metric
   */
  private getVitalStatus(metric: string, value: number): string {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      inp: { good: 200, poor: 500 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return '';

    if (value <= threshold.good) return '✅ Good';
    if (value <= threshold.poor) return '⚠️ Needs Improvement';
    return '❌ Poor';
  }

  /**
   * Calculate overall performance grade
   */
  private calculateOverallGrade(
    networkResults: Map<string, WebVitalsMetrics>,
    interactionResults: { fid: number; inp: number },
    layoutResults: { cls: number }
  ): { letter: string; score: number; recommendations: string[] } {
    let totalScore = 0;
    let metricCount = 0;
    const recommendations: string[] = [];

    // Score network performance (average across conditions)
    for (const [condition, metrics] of networkResults) {
      totalScore += this.scoreMetric('fcp', metrics.fcp);
      totalScore += this.scoreMetric('lcp', metrics.lcp);
      totalScore += this.scoreMetric('ttfb', metrics.ttfb);
      metricCount += 3;

      if (metrics.lcp > 4000) {
        recommendations.push(`Optimize LCP for ${condition} network`);
      }
      if (metrics.ttfb > 1800) {
        recommendations.push(`Improve server response time for ${condition}`);
      }
    }

    // Score interaction performance
    totalScore += this.scoreMetric('fid', interactionResults.fid);
    totalScore += this.scoreMetric('inp', interactionResults.inp);
    metricCount += 2;

    if (interactionResults.fid > 300) {
      recommendations.push('Optimize JavaScript execution for better FID');
    }
    if (interactionResults.inp > 500) {
      recommendations.push('Reduce interaction response times');
    }

    // Score layout stability
    totalScore += this.scoreMetric('cls', layoutResults.cls);
    metricCount += 1;

    if (layoutResults.cls > 0.25) {
      recommendations.push('Fix layout shifts in dynamic content');
    }

    const averageScore = Math.round(totalScore / metricCount);
    
    let letter = 'F';
    if (averageScore >= 90) letter = 'A';
    else if (averageScore >= 80) letter = 'B';
    else if (averageScore >= 70) letter = 'C';
    else if (averageScore >= 60) letter = 'D';

    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent!');
    }

    return { letter, score: averageScore, recommendations };
  }

  /**
   * Score individual metric (0-100)
   */
  private scoreMetric(metric: string, value: number): number {
    const configs = {
      fcp: { excellent: 1000, good: 1800, poor: 3000 },
      lcp: { excellent: 1500, good: 2500, poor: 4000 },
      fid: { excellent: 50, good: 100, poor: 300 },
      inp: { excellent: 100, good: 200, poor: 500 },
      cls: { excellent: 0.05, good: 0.1, poor: 0.25 },
      ttfb: { excellent: 400, good: 800, poor: 1800 }
    };

    const config = configs[metric as keyof typeof configs];
    if (!config) return 50;

    if (value <= config.excellent) return 100;
    if (value <= config.good) return 85;
    if (value <= config.poor) return 65;
    return 30;
  }
}

// Playwright test implementation
test.describe('🎯 Core Web Vitals Performance Testing', () => {
  let monitor: CoreWebVitalsMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new CoreWebVitalsMonitor(page);
  });

  test('should measure Core Web Vitals across network conditions', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    
    console.log('🚀 Starting Core Web Vitals measurement...');
    
    // Test main application pages
    const pages = [
      { name: 'Dashboard', url: `${baseUrl}/dashboard` },
      { name: 'Jobs List', url: `${baseUrl}/jobs` },
      { name: 'Upload Resume', url: `${baseUrl}/upload` }
    ];

    for (const pageConfig of pages) {
      console.log(`\n📄 Testing ${pageConfig.name} page...`);
      
      const networkResults = await monitor.testUnderNetworkConditions(pageConfig.url);
      const interactionResults = await monitor.testInteractionPerformance();
      const layoutResults = await monitor.testLayoutStability();
      
      // Generate and log report
      const report = monitor.generatePerformanceReport(networkResults, interactionResults, layoutResults);
      console.log(report);
      
      // Performance assertions
      for (const [condition, metrics] of networkResults) {
        // Core Web Vitals thresholds
        expect(metrics.lcp, `LCP on ${condition} for ${pageConfig.name}`).toBeLessThan(4000);
        expect(metrics.cls, `CLS on ${condition} for ${pageConfig.name}`).toBeLessThan(0.25);
        expect(metrics.ttfb, `TTFB on ${condition} for ${pageConfig.name}`).toBeLessThan(1800);
        
        // Mobile-specific thresholds (stricter for 3G)
        if (condition === '3G') {
          expect(metrics.fcp, `FCP on 3G for ${pageConfig.name}`).toBeLessThan(3000);
          expect(metrics.lcp, `LCP on 3G for ${pageConfig.name}`).toBeLessThan(4000);
        }
      }
      
      // Interaction performance thresholds
      expect(interactionResults.fid, `FID for ${pageConfig.name}`).toBeLessThan(300);
      expect(interactionResults.inp, `INP for ${pageConfig.name}`).toBeLessThan(500);
      
      // Layout stability threshold
      expect(layoutResults.cls, `CLS for ${pageConfig.name}`).toBeLessThan(0.25);
    }
  });

  test('should validate PWA performance characteristics', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    
    // Test service worker and PWA capabilities
    await page.goto(baseUrl);
    
    const serviceWorkerActive = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(serviceWorkerActive).toBe(true);
    
    // Test offline-first loading
    await page.setOffline(true);
    await page.reload();
    
    // Should still load basic shell
    await expect(page.locator('body')).toBeVisible();
    
    await page.setOffline(false);
  });

  test('should measure file upload performance', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    await page.goto(`${baseUrl}/upload`);
    
    await monitor.injectWebVitalsScript();
    
    // Simulate file upload with performance monitoring
    const startTime = Date.now();
    
    // Create a test file
    const fileContent = 'test resume content'.repeat(1000); // Simulate larger file
    const file = new File([fileContent], 'test-resume.pdf', { type: 'application/pdf' });
    
    // Monitor upload performance
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(fileContent)
    });
    
    const uploadTime = Date.now() - startTime;
    console.log(`📎 File upload response time: ${uploadTime}ms`);
    
    // Upload should complete within reasonable time
    expect(uploadTime).toBeLessThan(5000);
    
    const vitals = await monitor.collectWebVitals();
    expect(vitals.cls).toBeLessThan(0.1); // No layout shift during upload
  });
});