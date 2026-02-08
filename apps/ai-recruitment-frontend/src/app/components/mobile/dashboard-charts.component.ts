import type {
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import type {
  Observable,
} from 'rxjs';
import {
  SparklineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from './charts/dashboard-chart-types';

/**
 * Defines the supported chart types for the dashboard.
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'sparkline';

/**
 * Defines the data point for a chart series.
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Defines a data series for multi-series charts.
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

/**
 * Defines the configuration for a dashboard chart.
 */
export interface DashboardChart {
  id: string;
  title: string;
  type: ChartType;
  data: ChartDataPoint[] | ChartSeries[];
  loading?: boolean;
  error?: string | null;
  showLegend?: boolean;
  showLabels?: boolean;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

/**
 * Defines the meta for sparkline chart.
 */
export interface SparklineMeta {
  current: number;
  previous: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
}

/**
 * Represents the dashboard charts component.
 * Displays various types of charts for data visualization.
 */
@Component({
  selector: 'arc-dashboard-charts',
  standalone: true,
  imports: [CommonModule, SparklineChartComponent, BarChartComponent, PieChartComponent],
  template: `
    <div class="dashboard-charts" *ngIf="charts.length > 0">
      <h2 class="section-title">Analytics</h2>

      <div class="charts-container">
        <div
          *ngFor="let chart of charts"
          class="chart-wrapper"
          [style.min-height.px]="chart.height || 200"
        >
          <!-- Chart Header -->
          <div class="chart-header">
            <h3 class="chart-title">{{ chart.title }}</h3>
            <div class="chart-actions">
              <button
                class="chart-action-btn"
                (click)="refreshChart(chart.id)"
                [disabled]="chart.loading"
                [attr.aria-label]="'Refresh ' + chart.title"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="chart.loading" class="chart-loading">
            <div class="loading-spinner"></div>
            <span class="loading-text">Loading chart...</span>
          </div>

          <!-- Error State -->
          <div *ngIf="chart.error && !chart.loading" class="chart-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"
              />
            </svg>
            <span>{{ chart.error }}</span>
          </div>

          <!-- Chart Content -->
          <div
            *ngIf="!chart.loading && !chart.error"
            class="chart-content"
            [class]="'chart-content--' + chart.type"
          >
            <!-- Sparkline Chart -->
            <ng-container [ngSwitch]="chart.type">
              <ng-container *ngSwitchCase="'sparkline'">
                <arc-sparkline-chart
                  [data]="getChartDataPoints(chart)"
                  [meta]="getSparklineMeta(getChartDataPoints(chart))"
                ></arc-sparkline-chart>
              </ng-container>

              <!-- Bar Chart -->
              <ng-container *ngSwitchCase="'bar'">
                <arc-bar-chart
                  [data]="getChartDataPoints(chart)"
                  [showLabels]="chart.showLabels ?? true"
                  [xAxisLabel]="chart.xAxisLabel"
                  [yAxisLabel]="chart.yAxisLabel"
                ></arc-bar-chart>
              </ng-container>

              <!-- Line Chart -->
              <ng-container *ngSwitchCase="'line'">
                <arc-line-chart
                  [data]="getChartSeries(chart)"
                  [showLabels]="chart.showLabels ?? true"
                  [xAxisLabel]="chart.xAxisLabel"
                  [yAxisLabel]="chart.yAxisLabel"
                ></arc-line-chart>
              </ng-container>

              <!-- Pie/Donut Chart -->
              <ng-container *ngSwitchCase="'pie'">
                <arc-pie-chart
                  [data]="getChartDataPoints(chart)"
                  [showLegend]="chart.showLegend ?? true"
                  [donut]="false"
                ></arc-pie-chart>
              </ng-container>

              <ng-container *ngSwitchCase="'donut'">
                <arc-pie-chart
                  [data]="getChartDataPoints(chart)"
                  [showLegend]="chart.showLegend ?? true"
                  [donut]="true"
                ></arc-pie-chart>
              </ng-container>

              <!-- Area Chart -->
              <ng-container *ngSwitchCase="'area'">
                <arc-area-chart
                  [data]="getChartSeries(chart)"
                  [showLabels]="chart.showLabels ?? true"
                ></arc-area-chart>
              </ng-container>

              <!-- Placeholder for unimplemented chart types -->
              <div *ngSwitchDefault class="chart-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.11,3 19,3M19,19H5V5H19V19M7,10H9V17H7V10M11,7H13V17H11V7M15,13H17V17H15V13Z"
                  />
                </svg>
                <span>Chart type '{{ chart.type }}' coming soon</span>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-charts {
        margin-bottom: var(--spacing-6, 1.5rem);
      }

      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0 0 16px 0;
        padding: 0 4px;
      }

      .charts-container {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4, 1rem);
      }

      .chart-wrapper {
        background: var(--color-surface, white);
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-4, 1rem);
        box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));
        overflow: hidden;
      }

      .chart-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-3, 0.75rem);
      }

      .chart-title {
        font-size: 14px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0;
      }

      .chart-actions {
        display: flex;
        gap: var(--spacing-2, 0.5rem);
      }

      .chart-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: var(--border-radius-sm, 4px);
        background: var(--color-background, #f8f9fa);
        color: var(--color-text-secondary, #6c757d);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: var(--color-border, #e9ecef);
          color: var(--color-text, #2c3e50);
        }

        &:active:not(:disabled) {
          transform: scale(0.95);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          width: 14px;
          height: 14px;
        }
      }

      .chart-loading,
      .chart-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2, 0.5rem);
        padding: var(--spacing-6, 1.5rem);
        color: var(--color-text-secondary, #6c757d);
        min-height: 150px;
      }

      .loading-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--color-border, #e9ecef);
        border-top: 2px solid var(--color-primary, #3498db);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-text,
      .chart-error span {
        font-size: 12px;
        font-weight: 500;
      }

      .chart-error {
        color: var(--color-error, #e74c3c);

        svg {
          width: 24px;
          height: 24px;
        }
      }

      .chart-content {
        position: relative;
        min-height: 150px;
      }

      .chart-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-3, 0.75rem);
        padding: var(--spacing-6, 1.5rem);
        color: var(--color-text-secondary, #6c757d);

        svg {
          opacity: 0.3;
        }

        span {
          font-size: 12px;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (min-width: 768px) {
        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }
      }
    `,
  ],
})
export class DashboardChartsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /**
   * The charts to display.
   */
  @Input({ required: true })
  public charts!: DashboardChart[];

  /**
   * Event emitted when a chart is refreshed.
   */
  @Input()
  public chartRefresh?: Observable<{ chartId: string }>;

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Subscribe to chart refresh events if provided
    if (this.chartRefresh) {
      this.chartRefresh.pipe(takeUntil(this.destroy$)).subscribe((event) => {
        this.refreshChart(event.chartId);
      });
    }
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs the refresh chart operation.
   * @param chartId - The chart identifier.
   */
  public refreshChart(chartId: string): void {
    const chart = this.charts.find((c) => c.id === chartId);
    if (chart) {
      chart.loading = true;
      chart.error = null;
      // TODO: Implement actual chart refresh logic
      setTimeout(() => {
        chart.loading = false;
      }, 1000);
    }
  }

  /**
   * Retrieves chart data as data points.
   * @param chart - The chart.
   * @returns The chart data points.
   */
  public getChartDataPoints(chart: DashboardChart): ChartDataPoint[] {
    return chart.data as ChartDataPoint[];
  }

  /**
   * Retrieves chart data as series.
   * @param chart - The chart.
   * @returns The chart series.
   */
  public getChartSeries(chart: DashboardChart): ChartSeries[] {
    return chart.data as ChartSeries[];
  }

  /**
   * Retrieves sparkline meta.
   * @param data - The data.
   * @returns The sparkline meta.
   */
  public getSparklineMeta(data: ChartDataPoint[]): SparklineMeta {
    if (data.length === 0) {
      return { current: 0, previous: 0, change: 0, changeType: 'neutral' };
    }

    const current = data[data.length - 1].value;
    const previous = data.length > 1 ? data[data.length - 2].value : current;
    const change = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;

    let changeType: SparklineMeta['changeType'];
    if (change > 0.1) {
      changeType = 'increase';
    } else if (change < -0.1) {
      changeType = 'decrease';
    } else {
      changeType = 'neutral';
    }

    return { current, previous, change, changeType };
  }
}

// Re-export chart components for convenience
export { SparklineChartComponent } from './charts/sparkline-chart.component';
export { BarChartComponent } from './charts/bar-chart.component';
export { PieChartComponent } from './charts/pie-chart.component';
