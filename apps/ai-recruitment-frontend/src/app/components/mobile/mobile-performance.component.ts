import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift

  // Additional metrics
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  tbt: number | null; // Total Blocking Time

  // Memory and resources
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;

  // Network
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;

  // Device
  deviceMemory: number;
  hardwareConcurrency: number;

  // Performance status
  overall: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

@Component({
  selector: 'app-mobile-performance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="performance-monitor" *ngIf="showMetrics()">
      <!-- Performance Badge -->
      <div class="performance-badge" [class]="'badge-' + metrics().overall">
        <div class="badge-score">{{ getOverallScore() }}</div>
        <div class="badge-label">Performance</div>
      </div>

      <!-- Detailed Metrics (expandable) -->
      <div class="performance-details" *ngIf="expanded()">
        <!-- Core Web Vitals -->
        <div class="metrics-section">
          <h4>Core Web Vitals</h4>
          <div class="metric-grid">
            <div class="metric-item">
              <div class="metric-value" [class]="getLCPStatus()">
                {{ formatMetric(metrics().lcp, 'ms') }}
              </div>
              <div class="metric-label">LCP</div>
              <div class="metric-description">Largest Contentful Paint</div>
            </div>

            <div class="metric-item">
              <div class="metric-value" [class]="getFIDStatus()">
                {{ formatMetric(metrics().fid, 'ms') }}
              </div>
              <div class="metric-label">FID</div>
              <div class="metric-description">First Input Delay</div>
            </div>

            <div class="metric-item">
              <div class="metric-value" [class]="getCLSStatus()">
                {{ formatMetric(metrics().cls, '') }}
              </div>
              <div class="metric-label">CLS</div>
              <div class="metric-description">Cumulative Layout Shift</div>
            </div>
          </div>
        </div>

        <!-- Additional Metrics -->
        <div class="metrics-section">
          <h4>Loading Performance</h4>
          <div class="metric-list">
            <div class="metric-row">
              <span class="metric-name">First Contentful Paint</span>
              <span class="metric-value">{{
                formatMetric(metrics().fcp, 'ms')
              }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">Time to First Byte</span>
              <span class="metric-value">{{
                formatMetric(metrics().ttfb, 'ms')
              }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">Total Blocking Time</span>
              <span class="metric-value">{{
                formatMetric(metrics().tbt, 'ms')
              }}</span>
            </div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="metrics-section">
          <h4>Memory Usage</h4>
          <div class="memory-chart">
            <div class="memory-bar">
              <div
                class="memory-used"
                [style.width.%]="getMemoryUsagePercent()"
              ></div>
            </div>
            <div class="memory-stats">
              <span
                >{{ formatBytes(metrics().usedJSHeapSize) }} /
                {{ formatBytes(metrics().totalJSHeapSize) }}</span
              >
            </div>
          </div>
        </div>

        <!-- Network Info -->
        <div class="metrics-section">
          <h4>Network</h4>
          <div class="metric-list">
            <div class="metric-row">
              <span class="metric-name">Connection</span>
              <span class="metric-value">{{ metrics().connectionType }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">Effective Type</span>
              <span class="metric-value">{{ metrics().effectiveType }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">Downlink</span>
              <span class="metric-value">{{ metrics().downlink }} Mbps</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">RTT</span>
              <span class="metric-value">{{ metrics().rtt }}ms</span>
            </div>
          </div>
        </div>

        <!-- Device Info -->
        <div class="metrics-section">
          <h4>Device</h4>
          <div class="metric-list">
            <div class="metric-row">
              <span class="metric-name">Device Memory</span>
              <span class="metric-value">{{ metrics().deviceMemory }} GB</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">CPU Cores</span>
              <span class="metric-value">{{
                metrics().hardwareConcurrency
              }}</span>
            </div>
          </div>
        </div>

        <!-- Performance Tips -->
        <div class="metrics-section" *ngIf="getPerformanceTips().length > 0">
          <h4>Optimization Tips</h4>
          <ul class="tips-list">
            <li *ngFor="let tip of getPerformanceTips()">{{ tip }}</li>
          </ul>
        </div>
      </div>

      <!-- Toggle Button -->
      <button
        class="toggle-details"
        (click)="toggleExpanded()"
        [attr.aria-label]="
          expanded() ? 'Hide performance details' : 'Show performance details'
        "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            [attr.d]="
              expanded()
                ? 'M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z'
                : 'M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z'
            "
          />
        </svg>
        {{ expanded() ? 'Hide Details' : 'Show Details' }}
      </button>
    </div>
  `,
  styles: [
    `
      .performance-monitor {
        position: fixed;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        max-width: 320px;
        z-index: 1000;
        font-size: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);

        @media (max-width: 768px) {
          top: 72px; // Account for mobile header
          right: 8px;
          max-width: 280px;
        }
      }

      .performance-badge {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;

        &.badge-excellent {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        &.badge-good {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
        }

        &.badge-needs-improvement {
          background: rgba(243, 156, 18, 0.1);
          color: #f39c12;
        }

        &.badge-poor {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }

        .badge-score {
          font-size: 18px;
          font-weight: 700;
          min-width: 32px;
          text-align: center;
        }

        .badge-label {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.8;
        }
      }

      .performance-details {
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        max-height: 400px;
        overflow-y: auto;
        background: white;
      }

      .metrics-section {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);

        &:last-child {
          border-bottom: none;
        }

        h4 {
          font-size: 12px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;

        .metric-item {
          text-align: center;
          padding: 8px 4px;
          background: #f8f9fa;
          border-radius: 6px;

          .metric-value {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 2px;

            &.excellent {
              color: #27ae60;
            }

            &.good {
              color: #3498db;
            }

            &.needs-improvement {
              color: #f39c12;
            }

            &.poor {
              color: #e74c3c;
            }
          }

          .metric-label {
            font-size: 10px;
            font-weight: 600;
            color: #495057;
            margin-bottom: 2px;
          }

          .metric-description {
            font-size: 9px;
            color: #6c757d;
            line-height: 1.2;
          }
        }
      }

      .metric-list {
        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;

          .metric-name {
            color: #495057;
            font-size: 11px;
          }

          .metric-value {
            font-weight: 600;
            color: #2c3e50;
            font-size: 11px;
          }
        }
      }

      .memory-chart {
        .memory-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;

          .memory-used {
            height: 100%;
            background: linear-gradient(90deg, #27ae60, #f39c12, #e74c3c);
            transition: width 0.3s ease;
          }
        }

        .memory-stats {
          font-size: 10px;
          color: #6c757d;
          text-align: center;
        }
      }

      .tips-list {
        margin: 0;
        padding-left: 16px;
        font-size: 10px;
        color: #495057;

        li {
          margin-bottom: 4px;
          line-height: 1.3;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      .toggle-details {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
        background: #f8f9fa;
        border: none;
        color: #495057;
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background: #e9ecef;
        }

        svg {
          transition: transform 0.2s ease;
        }
      }

      /* Hide on very small screens */
      @media (max-width: 480px) {
        .performance-monitor {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobilePerformanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  metrics = signal<PerformanceMetrics>({
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

  expanded = signal(false);
  showMetrics = signal(false);

  private performanceObserver?: PerformanceObserver;
  private layoutShiftScore = 0;

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    // Only show in development or when explicitly enabled
    this.showMetrics.set(
      !environment.production ||
        localStorage.getItem('showPerformanceMetrics') === 'true',
    );

    if (this.showMetrics()) {
      this.initializePerformanceMonitoring();
      this.startPeriodicUpdates();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  private initializePerformanceMonitoring() {
    this.collectInitialMetrics();
    this.setupPerformanceObserver();
    this.collectNetworkInfo();
    this.collectDeviceInfo();
  }

  private collectInitialMetrics() {
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
      const memory = (performance as any).memory;
      this.updateMetrics({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    }
  }

  private setupPerformanceObserver() {
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

  private handlePerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        this.updateMetric('lcp', entry.startTime);
        break;

      case 'first-input':
        const fidEntry = entry as PerformanceEventTiming;
        this.updateMetric('fid', fidEntry.processingStart - fidEntry.startTime);
        break;

      case 'layout-shift':
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          this.layoutShiftScore += clsEntry.value;
          this.updateMetric('cls', this.layoutShiftScore);
        }
        break;
    }
  }

  private collectNetworkInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateMetrics({
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
      });
    }
  }

  private collectDeviceInfo() {
    this.updateMetrics({
      deviceMemory: (navigator as any).deviceMemory || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
    });
  }

  private startPeriodicUpdates() {
    // Update memory usage every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if ('memory' in performance) {
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

  private updateMetric(key: keyof PerformanceMetrics, value: any) {
    this.metrics.update((current) => ({ ...current, [key]: value }));
  }

  private updateMetrics(updates: Partial<PerformanceMetrics>) {
    this.metrics.update((current) => ({ ...current, ...updates }));
  }

  private calculateOverallScore() {
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
    const memoryUsage = m.usedJSHeapSize / m.jsHeapSizeLimit;
    if (memoryUsage > 0.9) score -= 25;
    else if (memoryUsage > 0.7) score -= 15;
    else if (memoryUsage > 0.5) score -= 5;

    let overall: PerformanceMetrics['overall'];
    if (score >= 90) overall = 'excellent';
    else if (score >= 75) overall = 'good';
    else if (score >= 50) overall = 'needs-improvement';
    else overall = 'poor';

    this.updateMetric('overall', overall);
  }

  getOverallScore(): number {
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

    const memoryUsage = m.usedJSHeapSize / m.jsHeapSizeLimit;
    if (memoryUsage > 0.9) score -= 25;
    else if (memoryUsage > 0.7) score -= 15;
    else if (memoryUsage > 0.5) score -= 5;

    return Math.max(0, Math.round(score));
  }

  getLCPStatus(): string {
    const lcp = this.metrics().lcp;
    if (lcp === null) return '';
    if (lcp <= 1500) return 'excellent';
    if (lcp <= 2500) return 'good';
    if (lcp <= 4000) return 'needs-improvement';
    return 'poor';
  }

  getFIDStatus(): string {
    const fid = this.metrics().fid;
    if (fid === null) return '';
    if (fid <= 50) return 'excellent';
    if (fid <= 100) return 'good';
    if (fid <= 300) return 'needs-improvement';
    return 'poor';
  }

  getCLSStatus(): string {
    const cls = this.metrics().cls;
    if (cls === null) return '';
    if (cls <= 0.05) return 'excellent';
    if (cls <= 0.1) return 'good';
    if (cls <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  getMemoryUsagePercent(): number {
    const m = this.metrics();
    if (m.totalJSHeapSize === 0) return 0;
    return (m.usedJSHeapSize / m.totalJSHeapSize) * 100;
  }

  formatMetric(value: number | null, unit: string): string {
    if (value === null) return 'N/A';
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === '') return value.toFixed(3);
    return `${Math.round(value)}${unit}`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getPerformanceTips(): string[] {
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

    const memoryUsage = m.usedJSHeapSize / m.jsHeapSizeLimit;
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

  toggleExpanded() {
    this.expanded.update((current) => !current);
  }
}

// Environment stub - replace with actual environment import
const environment = { production: false };
