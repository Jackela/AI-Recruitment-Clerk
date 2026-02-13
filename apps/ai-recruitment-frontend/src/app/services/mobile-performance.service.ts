import { Injectable, signal, NgZone, inject, DestroyRef, takeUntilDestroyed } from '@angular/core';
import { Subject, interval, takeUntil } from 'rxjs';
import type { PerformanceMetrics } from '../types/performance-metrics.type';

/**
 * Defines shape of layout shift entry.
 */
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * Performance status categories.
 */
export type PerformanceStatus = 'excellent' | 'good' | 'needs-improvement' | 'poor';

/**
 * Service for collecting and processing performance metrics.
 * Handles all performance monitoring, data collection, and scoring logic.
 */
@Injectable({
  providedIn: 'root',
})
export class MobilePerformanceService {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private destroy$ = new Subject<void>();

  private performanceObserver?: PerformanceObserver;
  private layoutShiftScore = 0;

  // Signals for reactive state
  public readonly metrics = signal<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    tbt: null,
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    deviceMemory: 0,
    hardwareConcurrency: 0,
    overall: 'good',
  });

  /**
   * Initialize performance monitoring.
   */
  public initialize(): void {
    this.initializePerformanceMonitoring();
    this.startPeriodicUpdates();
  }

  /**
   * Clean up resources.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Collect initial performance metrics.
   */
  private initializePerformanceMonitoring(): void {
    this.collectInitialMetrics();
    this.setupPerformanceObserver();
    this.collectNetworkInfo();
    this.collectDeviceInfo();
  }

  /**
   * Collect initial metrics from Performance API.
   */
  private collectInitialMetrics(): void {
    // Get navigation timing
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    if (navigation) {
      const ttfb = navigation.responseStart - navigation.requestStart;
      this.updateMetric('ttfb', ttfb);
    }

    // Get paint metrics
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(
      (entry) => entry.name === 'first-contentful-paint',
    );
    if (fcp) {
      this.updateMetric('fcp', fcp.startTime);
    }

    // Get memory info
    if ('memory' in performance) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memory = (performance as any).memory;
      this.updateMetrics({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    }
  }

  /**
   * Set up PerformanceObserver for Core Web Vitals.
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        this.ngZone.run(() => {
          for (const entry of list.getEntries()) {
            this.handlePerformanceEntry(entry);
          }
          this.calculateOverallScore();
        });
      });

      // Observe different entry types
      try {
        this.performanceObserver.observe({
          entryTypes: [
            'largest-contentful-paint',
            'first-input',
            'layout-shift',
          ],
        });
      } catch (error) {
        console.warn('Performance observer failed:', error);
      }
    }
  }

  /**
   * Handle performance observer entries.
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        this.updateMetric('lcp', entry.startTime);
        break;

      case 'first-input': {
        const fidEntry = entry as PerformanceEventTiming;
        this.updateMetric('fid', fidEntry.processingStart - fidEntry.startTime);
        break;
      }

      case 'layout-shift': {
        const clsEntry = entry as LayoutShift;
        if (!clsEntry.hadRecentInput) {
          this.layoutShiftScore += clsEntry.value;
          this.updateMetric('cls', this.layoutShiftScore);
        }
        break;
      }
    }
  }

  /**
   * Collect network connection information.
   */
  private collectNetworkInfo(): void {
    if ('connection' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connection = (navigator as any).connection;
      this.updateMetrics({
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
      });
    }
  }

  /**
   * Collect device information.
   */
  private collectDeviceInfo(): void {
    this.updateMetrics({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deviceMemory: (navigator as any).deviceMemory || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
    });
  }

  /**
   * Start periodic updates for memory and scoring.
   */
  private startPeriodicUpdates(): void {
    // Update memory usage every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if ('memory' in performance) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const memory = (performance as any).memory;
          this.updateMetrics({
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          });
        }
        this.calculateOverallScore();
      });
  }

  /**
   * Update a single metric.
   */
  private updateMetric(key: keyof PerformanceMetrics, value: unknown): void {
    this.metrics.update((current) => ({ ...current, [key]: value }));
  }

  /**
   * Update multiple metrics.
   */
  private updateMetrics(updates: Partial<PerformanceMetrics>): void {
    this.metrics.update((current) => ({ ...current, ...updates }));
  }

  /**
   * Calculate overall performance score and update status.
   */
  private calculateOverallScore(): void {
    const m = this.metrics();
    let score = 100;

    // LCP scoring (weight: 25%)
    if (m.lcp !== null) {
      if (m.lcp > 4000) score -= 25;
      else if (m.lcp > 2500) score -= 15;
      else if (m.lcp > 1500) score -= 5;
    }

    // FID scoring (weight: 25%)
    if (m.fid !== null) {
      if (m.fid > 300) score -= 25;
      else if (m.fid > 100) score -= 15;
      else if (m.fid > 50) score -= 5;
    }

    // CLS scoring (weight: 25%)
    if (m.cls !== null) {
      if (m.cls > 0.25) score -= 25;
      else if (m.cls > 0.1) score -= 15;
      else if (m.cls > 0.05) score -= 5;
    }

    // Memory usage (weight: 25%)
    const memoryUsage = m.jsHeapSizeLimit > 0 ? m.usedJSHeapSize / m.jsHeapSizeLimit : 0;
    if (memoryUsage > 0.9) score -= 25;
    else if (memoryUsage > 0.7) score -= 15;
    else if (memoryUsage > 0.5) score -= 5;

    let overall: PerformanceStatus;
    if (score >= 90) overall = 'excellent';
    else if (score >= 75) overall = 'good';
    else if (score >= 50) overall = 'needs-improvement';
    else overall = 'poor';

    this.updateMetric('overall', overall);
  }

  /**
   * Get overall performance score (0-100).
   */
  public getOverallScore(): number {
    const m = this.metrics();
    let score = 100;

    if (m.lcp !== null) {
      if (m.lcp > 4000) score -= 25;
      else if (m.lcp > 2500) score -= 15;
      else if (m.lcp > 1500) score -= 5;
    }

    if (m.fid !== null) {
      if (m.fid > 300) score -= 25;
      else if (m.fid > 100) score -= 15;
      else if (m.fid > 50) score -= 5;
    }

    if (m.cls !== null) {
      if (m.cls > 0.25) score -= 25;
      else if (m.cls > 0.1) score -= 15;
      else if (m.cls > 0.05) score -= 5;
    }

    const memoryUsage = m.jsHeapSizeLimit > 0 ? m.usedJSHeapSize / m.jsHeapSizeLimit : 0;
    if (memoryUsage > 0.9) score -= 25;
    else if (memoryUsage > 0.7) score -= 15;
    else if (memoryUsage > 0.5) score -= 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * Get LCP status class.
   */
  public getLCPStatus(): PerformanceStatus | '' {
    const lcp = this.metrics().lcp;
    if (lcp === null) return '';
    if (lcp <= 1500) return 'excellent';
    if (lcp <= 2500) return 'good';
    if (lcp <= 4000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get FID status class.
   */
  public getFIDStatus(): PerformanceStatus | '' {
    const fid = this.metrics().fid;
    if (fid === null) return '';
    if (fid <= 50) return 'excellent';
    if (fid <= 100) return 'good';
    if (fid <= 300) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get CLS status class.
   */
  public getCLSStatus(): PerformanceStatus | '' {
    const cls = this.metrics().cls;
    if (cls === null) return '';
    if (cls <= 0.05) return 'excellent';
    if (cls <= 0.1) return 'good';
    if (cls <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get memory usage percentage.
   */
  public getMemoryUsagePercent(): number {
    const m = this.metrics();
    if (m.totalJSHeapSize === 0) return 0;
    return (m.usedJSHeapSize / m.totalJSHeapSize) * 100;
  }

  /**
   * Format metric value for display.
   */
  public formatMetric(value: number | null, unit: string): string {
    if (value === null) return 'N/A';
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === '') return value.toFixed(3);
    return `${Math.round(value)}${unit}`;
  }

  /**
   * Format bytes to human-readable format.
   */
  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get performance optimization tips based on current metrics.
   */
  public getPerformanceTips(): string[] {
    const tips: string[] = [];
    const m = this.metrics();

    if (m.lcp && m.lcp > 2500) {
      tips.push(
        'Optimize images and remove render-blocking resources to improve LCP',
      );
    }

    if (m.fid && m.fid > 100) {
      tips.push('Reduce JavaScript execution time and break up long tasks');
    }

    if (m.cls && m.cls > 0.1) {
      tips.push(
        'Set size attributes on images and avoid dynamically inserted content',
      );
    }

    const memoryUsage = m.jsHeapSizeLimit > 0 ? m.usedJSHeapSize / m.jsHeapSizeLimit : 0;
    if (memoryUsage > 0.7) {
      tips.push('Consider reducing memory usage by optimizing data structures');
    }

    if (m.effectiveType === 'slow-2g' || m.effectiveType === '2g') {
      tips.push(
        'Optimize for slow connections with better caching and compression',
      );
    }

    return tips;
  }
}
