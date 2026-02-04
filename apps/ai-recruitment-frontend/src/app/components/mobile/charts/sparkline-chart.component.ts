import {
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

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
 * Defines the data point for a chart series.
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Represents the sparkline chart component.
 * Displays a mini line chart for trend visualization.
 */
@Component({
  selector: 'arc-sparkline-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sparkline-chart">
      <svg [attr.viewBox]="viewBox" preserveAspectRatio="none">
        <polyline
          [attr.points]="points"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <circle
          *ngFor="let point of pointsArray"
          [attr.cx]="point.x"
          [attr.cy]="point.y"
          r="3"
          fill="currentColor"
        />
      </svg>
      <div class="sparkline-meta">
        <span class="sparkline-value">{{ meta.current }}</span>
        <span
          class="sparkline-change"
          [class]="'sparkline-change--' + meta.changeType"
        >
          {{ meta.changeType === 'increase' ? '↗' : meta.changeType === 'decrease' ? '↘' : '→' }}
          {{ Math.abs(meta.change).toFixed(1) }}%
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .sparkline-chart {
        position: relative;
        width: 100%;
        height: 80px;
        color: var(--color-primary, #3498db);
      }

      .sparkline-chart svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      .sparkline-chart polyline {
        vector-effect: non-scaling-stroke;
      }

      .sparkline-chart circle {
        vector-effect: non-scaling-stroke;
      }

      .sparkline-meta {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-top: 8px;
      }

      .sparkline-value {
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
      }

      .sparkline-change {
        font-size: 12px;
        font-weight: 600;

        &.sparkline-change--increase {
          color: #27ae60;
        }

        &.sparkline-change--decrease {
          color: #e74c3c;
        }

        &.sparkline-change--neutral {
          color: #95a5a6;
        }
      }
    `,
  ],
})
export class SparklineChartComponent {
  @Input({ required: true })
  public data!: ChartDataPoint[];

  @Input({ required: true })
  public meta!: SparklineMeta;

  public get viewBox(): string {
    return `0 0 ${this.data.length || 1} 100`;
  }

  public get points(): string {
    if (this.data.length === 0) return '';
    const max = Math.max(...this.data.map((d) => d.value));
    const min = Math.min(...this.data.map((d) => d.value));
    const range = max - min || 1;

    return this.data
      .map((d, i) => {
        const x = i;
        const y = 100 - ((d.value - min) / range) * 80 - 10;
        return `${x},${y}`;
      })
      .join(' ');
  }

  public get pointsArray(): Array<{ x: number; y: number }> {
    if (this.data.length === 0) return [];
    const max = Math.max(...this.data.map((d) => d.value));
    const min = Math.min(...this.data.map((d) => d.value));
    const range = max - min || 1;

    return this.data.map((d, i) => ({
      x: i,
      y: 100 - ((d.value - min) / range) * 80 - 10,
    }));
  }
}
