import type {
  PipeTransform} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectionStrategy,
  Pipe,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Simple translate pipe for accessibility labels
@Pipe({
  name: 'translate',
  standalone: true,
})
class TranslatePipe implements PipeTransform {
  private translations: Record<string, string> = {
    'charts.pie_chart': '饼图',
    'charts.donut_chart': '环形图',
    'charts.label': '标签',
    'charts.value': '数值',
    'charts.navigation_hint': '使用方向键浏览数据点，按Enter或空格键选择',
  };

  transform(key: string): string {
    return this.translations[key] || key;
  }
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
 * Represents the pie chart component.
 * Displays a pie or donut chart for proportional data visualization.
 */
@Component({
  selector: 'arc-pie-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="pie-chart"
      role="img"
      [attr.aria-label]="ariaLabel"
      tabindex="0"
      [attr.aria-description]="'charts.navigation_hint' | translate"
      (focus)="onFocus()"
      (blur)="onBlur()"
    >
      <!-- 为屏幕阅读器提供隐藏的表格数据 -->
      <table class="sr-only">
        <caption>
          {{
            chartTitle ||
              (donut
                ? ('charts.donut_chart' | translate)
                : ('charts.pie_chart' | translate))
          }}
        </caption>
        <thead>
          <tr>
            <th>{{ 'charts.label' | translate }}</th>
            <th>{{ 'charts.value' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let item of data; let i = index"
            [class.focused]="isFocused(i)"
          >
            <th>{{ item.label }}</th>
            <td>{{ item.value }}</td>
          </tr>
        </tbody>
      </table>

      <svg
        [attr.viewBox]="donut ? '-50 -50 100 100' : '-50 -50 100 100'"
        [attr.aria-label]="chartTitle || (donut ? '环形图' : '饼图')"
        role="img"
      >
        <g *ngFor="let slice of slices; let i = index">
          <path
            [attr.d]="slice.path"
            [attr.fill]="slice.color || defaultColors[i % defaultColors.length]"
            [attr.stroke]="donut ? 'white' : 'none'"
            [attr.stroke-width]="donut ? 30 : 0"
            [class.slice--focused]="isFocused(i)"
            [attr.tabindex]="isFocused(i) ? 0 : -1"
            [attr.aria-label]="getSliceAriaLabel(i)"
            role="listitem"
            (click)="onSliceClick(i)"
          />
        </g>
      </svg>
      <div class="pie-legend" *ngIf="showLegend" role="list">
        <div
          *ngFor="let item of data; let i = index"
          class="legend-item"
          [class.legend-item--focused]="isFocused(i)"
          [attr.tabindex]="isFocused(i) ? 0 : -1"
          [attr.aria-label]="getSliceAriaLabel(i)"
          role="listitem"
          (click)="onSliceClick(i)"
        >
          <span
            class="legend-color"
            [style.background]="
              item.color || defaultColors[i % defaultColors.length]
            "
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
        outline: none;

        &:focus-visible {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }

      .pie-chart svg {
        width: 150px;
        height: 150px;
        overflow: visible;
      }

      .pie-chart path {
        transition:
          transform 0.2s ease,
          filter 0.2s ease;
        cursor: pointer;

        &:hover {
          transform: scale(1.05);
        }

        &.slice--focused {
          transform: scale(1.1);
          filter: drop-shadow(0 0 6px rgba(52, 152, 219, 0.6));
          outline: none;
        }

        &:focus-visible {
          outline: 3px solid #3498db;
          outline-offset: 2px;
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
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: #f8f9fa;
        }

        &--focused {
          background-color: #e3f2fd;
          box-shadow: 0 0 0 2px #3498db;
        }

        &:focus-visible {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }
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

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieChartComponent {
  @Input({ required: true })
  public data!: ChartDataPoint[];

  @Input()
  public showLegend = true;

  @Input()
  public donut = false;

  @Input()
  public chartTitle?: string;

  @Output()
  public sliceSelect = new EventEmitter<ChartDataPoint>();

  public focusedIndex = signal<number>(-1);
  public isKeyboardActive = signal<boolean>(false);

  public readonly defaultColors = [
    '#3498db',
    '#e74c3c',
    '#27ae60',
    '#f39c12',
    '#9b59b6',
    '#1abc9c',
  ];

  public get ariaLabel(): string {
    const title = this.chartTitle || (this.donut ? '环形图' : '饼图');
    return `${title}，包含${this.data.length}个数据项`;
  }

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

  public getSliceAriaLabel(index: number): string {
    if (index >= 0 && index < this.data.length) {
      const item = this.data[index];
      return `${item.label}: ${item.value}`;
    }
    return '';
  }

  public isFocused(index: number): boolean {
    return this.isKeyboardActive() && this.focusedIndex() === index;
  }

  public onFocus(): void {
    if (this.focusedIndex() === -1 && this.data.length > 0) {
      this.focusedIndex.set(0);
    }
    this.isKeyboardActive.set(true);
  }

  public onBlur(): void {
    this.isKeyboardActive.set(false);
  }

  public onSliceClick(index: number): void {
    this.focusedIndex.set(index);
    this.selectCurrent();
  }

  @HostListener('keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.data.length) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.nextSlice();
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.previousSlice();
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        this.selectCurrent();
        event.preventDefault();
        break;
      case 'Home':
        this.firstSlice();
        event.preventDefault();
        break;
      case 'End':
        this.lastSlice();
        event.preventDefault();
        break;
    }
  }

  private nextSlice(): void {
    const current = this.focusedIndex();
    if (current < this.data.length - 1) {
      this.focusedIndex.set(current + 1);
    } else {
      this.focusedIndex.set(0);
    }
  }

  private previousSlice(): void {
    const current = this.focusedIndex();
    if (current > 0) {
      this.focusedIndex.set(current - 1);
    } else {
      this.focusedIndex.set(this.data.length - 1);
    }
  }

  private firstSlice(): void {
    this.focusedIndex.set(0);
  }

  private lastSlice(): void {
    this.focusedIndex.set(this.data.length - 1);
  }

  private selectCurrent(): void {
    const index = this.focusedIndex();
    if (index >= 0 && index < this.data.length) {
      this.sliceSelect.emit(this.data[index]);
    }
  }
}
