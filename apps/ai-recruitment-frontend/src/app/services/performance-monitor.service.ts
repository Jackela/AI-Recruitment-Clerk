import { Injectable } from '@angular/core';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory: MemoryInfo;
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
  hadRecentInput?: boolean;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface ResourceEntry extends PerformanceEntry {
  transferSize: number;
}

interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  coreWebVitals: {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
  };
}

@Injectable({
  providedIn: 'root',
})
export class PerformanceMonitorService {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();

    // Monitor resource loading
    this.observeResources();

    // Monitor memory usage
    this.observeMemory();

    // Report initial metrics
    this.reportInitialMetrics();
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.coreWebVitals = {
          ...this.metrics.coreWebVitals,
          lcp: lastEntry.startTime,
        };

        // LCP metric captured
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as FirstInputEntry[];
        entries.forEach((entry) => {
          this.metrics.coreWebVitals = {
            ...this.metrics.coreWebVitals,
            fid: entry.processingStart - entry.startTime,
          };

          // FID metric captured
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as LayoutShiftEntry[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.coreWebVitals = {
              ...this.metrics.coreWebVitals,
              cls: clsValue,
            };
          }
        });

        // CLS metric captured
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    }
  }

  private observeResources(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as ResourceEntry[];
        let totalSize = 0;

        entries.forEach((entry) => {
          if (entry.transferSize) {
            totalSize += entry.transferSize;
          }
        });

        this.metrics.bundleSize = totalSize;
        // Bundle size captured
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    }
  }

  private observeMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;

      // Monitor memory periodically
      setInterval(() => {
        if ('memory' in performance) {
          const currentMemory = (performance as PerformanceWithMemory).memory;
          this.metrics.memoryUsage = currentMemory.usedJSHeapSize;

          // Log if memory usage is high
          const memoryMB = currentMemory.usedJSHeapSize / 1024 / 1024;
          if (memoryMB > 50) {
            // High memory usage detected: ${memoryMB.toFixed(2)}MB
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private reportInitialMetrics(): void {
    // Wait for page load complete
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;

        this.metrics.loadTime =
          navigation.loadEventEnd - navigation.loadEventStart;
        this.metrics.renderTime =
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart;

        // Initial metrics captured

        this.evaluatePerformance();
      }, 1000);
    });
  }

  private evaluatePerformance(): void {
    const recommendations: string[] = [];

    // Check bundle size
    if (this.metrics.bundleSize && this.metrics.bundleSize > 500000) {
      // 500KB
      recommendations.push(
        'Bundle size exceeds 500KB - consider code splitting',
      );
    }

    // Check Core Web Vitals
    if (
      this.metrics.coreWebVitals?.lcp &&
      this.metrics.coreWebVitals.lcp > 2500
    ) {
      recommendations.push(
        'LCP exceeds 2.5s - optimize largest content element',
      );
    }

    if (
      this.metrics.coreWebVitals?.fid &&
      this.metrics.coreWebVitals.fid > 100
    ) {
      recommendations.push('FID exceeds 100ms - optimize JavaScript execution');
    }

    if (
      this.metrics.coreWebVitals?.cls &&
      this.metrics.coreWebVitals.cls > 0.1
    ) {
      recommendations.push('CLS exceeds 0.1 - stabilize layout');
    }

    // Check memory usage
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 52428800) {
      // 50MB
      recommendations.push('Memory usage is high - check for memory leaks');
    }

    if (recommendations.length > 0) {
      // Performance recommendations available
    } else {
      // All performance metrics optimal
    }
  }

  // Public API
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  getCoreWebVitals(): Partial<PerformanceMetrics['coreWebVitals']> {
    return { ...this.metrics.coreWebVitals };
  }

  measureComponentRender(_componentName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (renderTime > 16) {
        // Longer than one frame (60fps)
        // Slow component render detected: ${componentName} (${renderTime.toFixed(2)}ms)
      }
    };
  }

  measureUserInteraction(_actionName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      this.metrics.interactionTime = interactionTime;

      if (interactionTime > 100) {
        // Slow interaction detected: ${actionName} (${interactionTime.toFixed(2)}ms)
      }
    };
  }

  reportCustomMetric(
    _name: string,
    _value: number,
    _unit: string = 'ms',
  ): void {
    // Custom metric reported: ${name} (${value}${unit})
    // Store in metrics for potential reporting
    // Store custom metric for reporting
  }

  destroy(): void {
    // Clean up observers
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }

  // Lighthouse Score Estimation
  estimateLighthouseScore(): number {
    let score = 100;

    // FCP (First Contentful Paint) - estimated from load time
    if (this.metrics.loadTime && this.metrics.loadTime > 1800) {
      score -= 15;
    } else if (this.metrics.loadTime && this.metrics.loadTime > 3000) {
      score -= 25;
    }

    // LCP
    if (
      this.metrics.coreWebVitals?.lcp &&
      this.metrics.coreWebVitals.lcp > 2500
    ) {
      score -= 15;
    } else if (
      this.metrics.coreWebVitals?.lcp &&
      this.metrics.coreWebVitals.lcp > 4000
    ) {
      score -= 25;
    }

    // FID
    if (
      this.metrics.coreWebVitals?.fid &&
      this.metrics.coreWebVitals.fid > 100
    ) {
      score -= 10;
    } else if (
      this.metrics.coreWebVitals?.fid &&
      this.metrics.coreWebVitals.fid > 300
    ) {
      score -= 20;
    }

    // CLS
    if (
      this.metrics.coreWebVitals?.cls &&
      this.metrics.coreWebVitals.cls > 0.1
    ) {
      score -= 10;
    } else if (
      this.metrics.coreWebVitals?.cls &&
      this.metrics.coreWebVitals.cls > 0.25
    ) {
      score -= 20;
    }

    // Bundle size impact
    if (this.metrics.bundleSize && this.metrics.bundleSize > 500000) {
      score -= 10;
    }

    return Math.max(0, score);
  }
}
