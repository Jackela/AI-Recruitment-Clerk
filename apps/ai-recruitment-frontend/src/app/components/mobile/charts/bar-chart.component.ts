import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectionStrategy,
  inject,
  Pipe,
  PipeTransform,
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
    'charts.bar_chart': '柱状图',
    'charts.label': '标签',
    'charts.value': '数值',
    'charts.bar_chart_description': '{{title}}，包含{{items}}个数据项',
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
 * Represents the bar chart component.
 * Displays a vertical bar chart for data comparison.
 */
@Component({
  selector: 'arc-bar-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="bar-chart"
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
            chartTitle || ('charts.bar_chart' | translate)
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

      <div class="bar-chart-bars" role="list">
        <div
          *ngFor="let item of data; let i = index"
          class="bar-item"
          [class.focused]="isFocused(i)"
          [style.height.%]="getBarHeight(item.value, data)"
          role="listitem"
          tabindex="-1"
          [attr.aria-label]="getBarAriaLabel(item)"
        >
          <div
            class="bar-fill"
            [class.bar-fill--focused]="isFocused(i)"
            [style.background]="item.color || '#3498db'"
            aria-hidden="true"
          ></div>
          <span class="bar-label" *ngIf="showLabels" aria-hidden="true">{{
            item.label
          }}</span>
          <span class="bar-value" aria-hidden="true">{{ item.value }}</span>
        </div>
      </div>
      <div class="bar-chart-axis" aria-hidden="true">
        <span *ngIf="xAxisLabel" class="axis-label x-label">{{
          xAxisLabel
        }}</span>
        <span *ngIf="yAxisLabel" class="axis-label y-label">{{
          yAxisLabel
        }}</span>
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
        transition: transform 0.2s ease;

        &.focused {
          transform: scale(1.05);
          z-index: 10;
        }
      }

      .bar-fill {
        width: 100%;
        min-width: 20px;
        max-width: 40px;
        border-radius: 4px 4px 0 0;
        transition:
          height 0.3s ease,
          box-shadow 0.2s ease;

        &--focused {
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.5);
        }
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

  changeDetection: ChangeDetectionStrategy.OnPush,
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

  @Input()
  public chartTitle?: string;

  @Output()
  public dataPointSelect = new EventEmitter<ChartDataPoint>();

  public focusedIndex = signal<number>(-1);
  public isKeyboardActive = signal<boolean>(false);

  public get ariaLabel(): string {
    const title = this.chartTitle || '柱状图';
    return `${title}，包含${this.data.length}个数据项`;
  }

  public getBarHeight(value: number, data: ChartDataPoint[]): number {
    const max = Math.max(...data.map((d) => d.value));
    return max > 0 ? (value / max) * 100 : 0;
  }

  public getBarAriaLabel(item: ChartDataPoint): string {
    return `${item.label}: ${item.value}`;
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

  @HostListener('keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.data.length) return;

    const currentIndex = this.focusedIndex();

    switch (event.key) {
      case 'ArrowRight':
        this.nextDataPoint();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.previousDataPoint();
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.firstDataPoint();
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.lastDataPoint();
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        this.selectCurrent();
        event.preventDefault();
        break;
      case 'Home':
        this.firstDataPoint();
        event.preventDefault();
        break;
      case 'End':
        this.lastDataPoint();
        event.preventDefault();
        break;
    }
  }

  private nextDataPoint(): void {
    const current = this.focusedIndex();
    if (current < this.data.length - 1) {
      this.focusedIndex.set(current + 1);
    }
  }

  private previousDataPoint(): void {
    const current = this.focusedIndex();
    if (current > 0) {
      this.focusedIndex.set(current - 1);
    }
  }

  private firstDataPoint(): void {
    this.focusedIndex.set(0);
  }

  private lastDataPoint(): void {
    this.focusedIndex.set(this.data.length - 1);
  }

  private selectCurrent(): void {
    const index = this.focusedIndex();
    if (index >= 0 && index < this.data.length) {
      this.dataPointSelect.emit(this.data[index]);
    }
  }
}
