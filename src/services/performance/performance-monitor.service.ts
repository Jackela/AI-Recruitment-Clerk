import { Injectable } from '@angular/core';
import { fromEvent, merge } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';

/**
 * Performance Monitoring Service
 * Tracks Core Web Vitals and provides performance insights
 */

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  bundleSize: number;
  memoryUsage: number;
}

interface PerformanceThresholds {
  fcp: { good: number; poor: number };
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  ttfb: { good: number; poor: number };
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  
  // Core Web Vitals thresholds
  private readonly thresholds: PerformanceThresholds = {
    fcp: { good: 1800, poor: 3000 },
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    ttfb: { good: 800, poor: 1800 }
  };

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Only monitor in browser environment
    if (typeof window === 'undefined') return;

    this.observePaintMetrics();
    this.observeLayoutShift();
    this.observeFirstInputDelay();
    this.observeLargestContentfulPaint();
    this.observeNavigationTiming();
    this.monitorMemoryUsage();
  }

  private observePaintMetrics(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
          this.reportMetric('FCP', entry.startTime);
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint'] });
    this.observers.set('paint', observer);
  }

  private observeLayoutShift(): void {
    let cls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count unexpected layout shifts
        if (!(entry as any).hadRecentInput) {
          cls += (entry as any).value;
        }
      }
      this.metrics.cls = cls;
      this.reportMetric('CLS', cls);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('layout-shift', observer);
  }

  private observeFirstInputDelay(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.fid = (entry as any).processingStart - entry.startTime;
        this.reportMetric('FID', this.metrics.fid);
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.set('first-input', observer);
  }

  private observeLargestContentfulPaint(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
      this.reportMetric('LCP', lastEntry.startTime);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.set('lcp', observer);
  }

  private observeNavigationTiming(): void {
    // Wait for navigation timing to be available
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
        this.reportMetric('TTFB', this.metrics.ttfb);
      }
    }, 0);
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      // Monitor memory periodically
      setInterval(() => {
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024;
        if (this.metrics.memoryUsage > 100) { // Alert if memory > 100MB
          console.warn(`High memory usage detected: ${this.metrics.memoryUsage.toFixed(2)}MB`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private reportMetric(name: string, value: number): void {
    const rating = this.getRating(name.toLowerCase() as keyof PerformanceThresholds, value);
    
    console.group(`🎯 Performance Metric: ${name}`);
    console.log(`Value: ${value.toFixed(2)}ms`);
    console.log(`Rating: ${rating}`);
    console.log(`Threshold Good: ${this.getThreshold(name.toLowerCase() as keyof PerformanceThresholds, 'good')}ms`);
    console.log(`Threshold Poor: ${this.getThreshold(name.toLowerCase() as keyof PerformanceThresholds, 'poor')}ms`);
    console.groupEnd();

    // Send to analytics if available
    this.sendToAnalytics(name, value, rating);
  }

  private getRating(metric: keyof PerformanceThresholds, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = this.thresholds[metric];
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private getThreshold(metric: keyof PerformanceThresholds, type: 'good' | 'poor'): number {
    return this.thresholds[metric][type];
  }

  private sendToAnalytics(metric: string, value: number, rating: string): void {
    // Integration with analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', metric, {
        event_category: 'Web Vitals',
        value: Math.round(value),
        custom_parameter_1: rating
      });
    }
  }

  // Public API
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  getMetricRating(metric: keyof PerformanceThresholds): string {
    const value = this.metrics[metric];
    return value ? this.getRating(metric, value) : 'unknown';
  }

  getPerformanceScore(): number {
    const scores = {
      fcp: this.getMetricScore('fcp'),
      lcp: this.getMetricScore('lcp'),
      fid: this.getMetricScore('fid'),
      cls: this.getMetricScore('cls'),
      ttfb: this.getMetricScore('ttfb')
    };

    const validScores = Object.values(scores).filter(score => score > 0);
    return validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;
  }

  private getMetricScore(metric: keyof PerformanceThresholds): number {
    const value = this.metrics[metric];
    if (!value) return 0;

    const rating = this.getRating(metric, value);
    switch (rating) {
      case 'good': return 100;
      case 'needs-improvement': return 50;
      case 'poor': return 25;
      default: return 0;
    }
  }

  // Resource timing analysis
  analyzeResourcePerformance(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const analysis = {
      totalResources: resources.length,
      largeResources: resources.filter(r => r.transferSize > 500000), // > 500KB
      slowResources: resources.filter(r => r.duration > 1000), // > 1s
      totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    };

    console.group('📊 Resource Performance Analysis');
    console.log(`Total Resources: ${analysis.totalResources}`);
    console.log(`Large Resources (>500KB): ${analysis.largeResources.length}`);
    console.log(`Slow Resources (>1s): ${analysis.slowResources.length}`);
    console.log(`Total Transfer Size: ${(analysis.totalTransferSize / 1024 / 1024).toFixed(2)}MB`);
    
    if (analysis.largeResources.length > 0) {
      console.log('Large Resources:');
      analysis.largeResources.forEach(r => {
        console.log(`  ${r.name}: ${(r.transferSize / 1024).toFixed(2)}KB`);
      });
    }
    
    if (analysis.slowResources.length > 0) {
      console.log('Slow Resources:');
      analysis.slowResources.forEach(r => {
        console.log(`  ${r.name}: ${r.duration.toFixed(2)}ms`);
      });
    }
    console.groupEnd();
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}