import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PerformanceMetrics } from '../../types/performance-metrics.type';
import { MobilePerformanceService } from '../../services/mobile-performance.service';

/**
 * Component displaying detailed performance metrics.
 * Shows Core Web Vitals, loading performance, memory usage, network info, device info, and tips.
 */
@Component({
  selector: 'arc-mobile-performance-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="performance-details">
      <!-- Core Web Vitals -->
      <div class="metrics-section">
        <h4>Core Web Vitals</h4>
        <div class="metric-grid">
          <div class="metric-item">
            <div class="metric-value" [class]="performanceService.getLCPStatus()">
              {{ performanceService.formatMetric(metrics.lcp, 'ms') }}
            </div>
            <div class="metric-label">LCP</div>
            <div class="metric-description">Largest Contentful Paint</div>
          </div>

          <div class="metric-item">
            <div class="metric-value" [class]="performanceService.getFIDStatus()">
              {{ performanceService.formatMetric(metrics.fid, 'ms') }}
            </div>
            <div class="metric-label">FID</div>
            <div class="metric-description">First Input Delay</div>
          </div>

          <div class="metric-item">
            <div class="metric-value" [class]="performanceService.getCLSStatus()">
              {{ performanceService.formatMetric(metrics.cls, '') }}
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
              performanceService.formatMetric(metrics.fcp, 'ms')
            }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Time to First Byte</span>
            <span class="metric-value">{{
              performanceService.formatMetric(metrics.ttfb, 'ms')
            }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Total Blocking Time</span>
            <span class="metric-value">{{
              performanceService.formatMetric(metrics.tbt, 'ms')
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
              [style.width.%]="performanceService.getMemoryUsagePercent()"
            ></div>
          </div>
          <div class="memory-stats">
            <span
              >{{ performanceService.formatBytes(metrics.usedJSHeapSize) }} /
              {{ performanceService.formatBytes(metrics.totalJSHeapSize) }}</span
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
            <span class="metric-value">{{ metrics.connectionType }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Effective Type</span>
            <span class="metric-value">{{ metrics.effectiveType }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Downlink</span>
            <span class="metric-value">{{ metrics.downlink }} Mbps</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">RTT</span>
            <span class="metric-value">{{ metrics.rtt }}ms</span>
          </div>
        </div>
      </div>

      <!-- Device Info -->
      <div class="metrics-section">
        <h4>Device</h4>
        <div class="metric-list">
          <div class="metric-row">
            <span class="metric-name">Device Memory</span>
            <span class="metric-value">{{ metrics.deviceMemory }} GB</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">CPU Cores</span>
            <span class="metric-value">{{
              metrics.hardwareConcurrency
            }}</span>
          </div>
        </div>
      </div>

      <!-- Performance Tips -->
      <div class="metrics-section" *ngIf="performanceService.getPerformanceTips().length > 0">
        <h4>Optimization Tips</h4>
        <ul class="tips-list">
          <li *ngFor="let tip of performanceService.getPerformanceTips()">{{ tip }}</li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
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
    `,
  ],
  changeDetection: undefined,
})
export class MobilePerformanceDetailsComponent {
  protected readonly performanceService = inject(MobilePerformanceService);

  @Input({ required: true })
  public metrics!: PerformanceMetrics;
}
