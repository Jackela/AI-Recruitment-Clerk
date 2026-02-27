import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface for processing metrics data
 */
export interface ProcessingMetrics {
  analysisInProgress: number;
  completedToday: number;
  averageProcessingTime: string;
  successRate: number;
}

/**
 * Component responsible for displaying processing metrics in a grid format.
 * Shows analysis progress, completion stats, processing time, and success rate.
 */
@Component({
  selector: 'arc-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metrics-container">
      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-value">{{ metrics.analysisInProgress }}</div>
          <div class="metric-label">进行中</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ metrics.completedToday }}</div>
          <div class="metric-label">今日完成</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ metrics.averageProcessingTime }}</div>
          <div class="metric-label">平均耗时</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ successRatePercentage }}</div>
          <div class="metric-label">成功率</div>
        </div>
      </div>

      <!-- Trend indicators (optional) -->
      <div class="metrics-trends" *ngIf="showTrends">
        <div class="trend-item" *ngIf="trendData">
          <span class="trend-indicator" [class]="trendClass">
            <svg
              *ngIf="trendData.type === 'up'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <svg
              *ngIf="trendData.type === 'down'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
              <polyline points="17 18 23 18 23 12"></polyline>
            </svg>
          </span>
          <span class="trend-text">{{ trendData.value }}</span>
          <span class="trend-period" *ngIf="trendData.period">{{ trendData.period }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .metrics-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        text-align: center;
      }

      .metric-item {
        padding: 0.75rem;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .metric-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .metric-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 0.25rem;
      }

      .metric-label {
        font-size: 0.75rem;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .metrics-trends {
        display: flex;
        justify-content: center;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      }

      .trend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .trend-indicator {
        display: flex;
        align-items: center;
      }

      .trend-indicator.trend-up {
        color: #10b981;
      }

      .trend-indicator.trend-down {
        color: #ef4444;
      }

      .trend-indicator.trend-neutral {
        color: #6b7280;
      }

      .trend-text {
        font-weight: 600;
      }

      .trend-period {
        color: #6b7280;
        font-size: 0.75rem;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .metrics-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .metric-item {
          padding: 0.5rem;
        }

        .metric-value {
          font-size: 1.1rem;
        }

        .metric-label {
          font-size: 0.7rem;
        }
      }

      @media (max-width: 480px) {
        .metrics-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class MetricsComponent {
  /**
   * Processing metrics data to display
   */
  @Input({ required: true }) public metrics!: ProcessingMetrics;

  /**
   * Whether to show trend indicators
   */
  @Input() public showTrends = false;

  /**
   * Optional trend data for display
   */
  @Input() public trendData: {
    type: 'up' | 'down' | 'neutral';
    value: string;
    period?: string;
  } | null = null;

  /**
   * Gets the success rate as a percentage string
   */
  public get successRatePercentage(): string {
    return `${(this.metrics.successRate * 100).toFixed(1)}%`;
  }

  /**
   * Gets the CSS class for the trend indicator
   */
  public get trendClass(): string {
    return `trend-${this.trendData?.type || 'neutral'}`;
  }
}
