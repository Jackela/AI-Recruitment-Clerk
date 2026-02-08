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
 * Represents the pie chart component.
 * Displays a pie or donut chart for proportional data visualization.
 */
@Component({
  selector: 'arc-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pie-chart">
      <svg [attr.viewBox]="donut ? '-50 -50 100 100' : '-50 -50 100 100'">
        <g *ngFor="let slice of slices; let i = index">
          <path
            [attr.d]="slice.path"
            [attr.fill]="slice.color || defaultColors[i % defaultColors.length]"
            [attr.stroke]="donut ? 'white' : 'none'"
            [attr.stroke-width]="donut ? 30 : 0"
          />
        </g>
      </svg>
      <div class="pie-legend" *ngIf="showLegend">
        <div *ngFor="let item of data; let i = index" class="legend-item">
          <span
            class="legend-color"
            [style.background]="item.color || defaultColors[i % defaultColors.length]"
          ></span>
          <span class="legend-label">{{ item.label }}</span>
          <span class="legend-value">{{ item.value }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .pie-chart {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
      }

      .pie-chart svg {
        width: 150px;
        height: 150px;
        overflow: visible;
      }

      .pie-chart path {
        transition: transform 0.2s ease;
        cursor: pointer;

        &:hover {
          transform: scale(1.05);
        }
      }

      .pie-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
        justify-content: center;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
      }

      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      .legend-label {
        color: #495057;
      }

      .legend-value {
        font-weight: 600;
        color: #2c3e50;
      }
    `,
  ],
})
export class PieChartComponent {
  @Input({ required: true })
  public data!: ChartDataPoint[];

  @Input()
  public showLegend = true;

  @Input()
  public donut = false;

  public readonly defaultColors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c'];

  public get slices(): Array<{ path: string; color?: string }> {
    const total = this.data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return [];

    let currentAngle = -90;
    const radius = 50;

    return this.data.map((item) => {
      const sliceAngle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const x1 = radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = radius * Math.sin((endAngle * Math.PI) / 180);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      currentAngle = endAngle;

      return { path, color: item.color };
    });
  }
}
