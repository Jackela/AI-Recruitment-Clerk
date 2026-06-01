import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BentoTrendIndicatorComponent } from '../trend/bento-trend-indicator.component';
import type { BentoMetricData } from '../types/bento-card.types';

@Component({
  selector: 'arc-bento-metric-item',
  standalone: true,
  imports: [CommonModule, BentoTrendIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="metric-item" [attr.aria-label]="ariaLabel">
      <div class="metric-label">{{ metric.label }}</div>
      <div class="metric-value-container">
        <span class="metric-value">{{ formattedValue }}</span>
        <arc-bento-trend-indicator
          *ngIf="metric.trend"
          [trend]="metric.trend"
        ></arc-bento-trend-indicator>
      </div>
    </div>
  `,
  styles: [
    `
      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);

        &:last-child {
          border-bottom: none;
        }
      }

      .metric-label {
        font-size: 0.875rem;
        opacity: 0.8;
        flex: 1;
      }

      .metric-value-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .metric-value {
        font-weight: 600;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class BentoMetricItemComponent {
  @Input() metric!: BentoMetricData;

  get formattedValue(): string {
    const value = this.metric.value;
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toString();
    }
    return value;
  }

  get ariaLabel(): string {
    let label = `${this.metric.label}: ${this.formattedValue}`;
    if (this.metric.trend) {
      const direction =
        this.metric.trend.type === 'up'
          ? 'increased'
          : this.metric.trend.type === 'down'
            ? 'decreased'
            : 'unchanged';
      label += `, ${direction} by ${this.metric.trend.value}`;
    }
    return label;
  }
}
