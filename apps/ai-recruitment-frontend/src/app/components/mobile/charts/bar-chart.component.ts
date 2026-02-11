import {
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the data point for a chart series.
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Represents the bar chart component.
 * Displays a vertical bar chart for data comparison.
 */
@Component({
  selector: 'arc-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart">
      <div class="bar-chart-bars">
        <div
          *ngFor="let item of data"
          class="bar-item"
          [style.height.%]="getBarHeight(item.value, data)"
        >
          <div class="bar-fill" [style.background]="item.color || '#3498db'"></div>
          <span class="bar-label" *ngIf="showLabels">{{ item.label }}</span>
          <span class="bar-value">{{ item.value }}</span>
        </div>
      </div>
      <div class="bar-chart-axis">
        <span *ngIf="xAxisLabel" class="axis-label x-label">{{ xAxisLabel }}</span>
        <span *ngIf="yAxisLabel" class="axis-label y-label">{{ yAxisLabel }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .bar-chart {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 150px;
      }

      .bar-chart-bars {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        flex: 1;
        gap: 8px;
        padding: 0 8px;
      }

      .bar-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        min-height: 4px;
      }

      .bar-fill {
        width: 100%;
        min-width: 20px;
        max-width: 40px;
        border-radius: 4px 4px 0 0;
        transition: height 0.3s ease;
      }

      .bar-label {
        position: absolute;
        bottom: -24px;
        font-size: 10px;
        color: #6c757d;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .bar-value {
        position: absolute;
        top: -20px;
        font-size: 11px;
        font-weight: 600;
        color: #2c3e50;
      }

      .bar-chart-axis {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        border-top: 1px solid #e9ecef;
      }

      .axis-label {
        font-size: 10px;
        color: #6c757d;
        font-weight: 500;
      }
    `,
  ],
})
export class BarChartComponent {
  @Input({ required: true })
  public data!: ChartDataPoint[];

  @Input()
  public showLabels = true;

  @Input()
  public xAxisLabel?: string;

  @Input()
  public yAxisLabel?: string;

  public getBarHeight(value: number, data: ChartDataPoint[]): number {
    const max = Math.max(...data.map((d) => d.value));
    return max > 0 ? (value / max) * 100 : 0;
  }
}
