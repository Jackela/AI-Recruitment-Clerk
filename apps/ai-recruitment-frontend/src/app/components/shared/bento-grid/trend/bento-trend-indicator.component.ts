import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BentoTrendData, TrendType } from '../types/bento-card.types';

@Component({
  selector: 'arc-bento-trend-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="metric-trend"
      [class]="'trend-' + trend.type"
      [attr.aria-label]="ariaLabel"
    >
      <svg
        *ngIf="trend.type === 'up'"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
      <svg
        *ngIf="trend.type === 'down'"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
        <polyline points="17 18 23 18 23 12"></polyline>
      </svg>
      <svg
        *ngIf="trend.type === 'neutral'"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      {{ trend.value }}
    </span>
  `,
  styles: [
    `
      .metric-trend {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;

        &.trend-up {
          color: var(--color-success-600);
          background: var(--color-success-50);
          border: 1px solid var(--color-success-200);
          border-radius: var(--radius-md);
          padding: var(--space-1) var(--space-2);
        }

        &.trend-down {
          color: var(--color-error-600);
          background: var(--color-error-50);
          border: 1px solid var(--color-error-200);
          border-radius: var(--radius-md);
          padding: var(--space-1) var(--space-2);
        }

        &.trend-neutral {
          color: var(--color-neutral-600);
          background: var(--color-neutral-50);
          border: 1px solid var(--color-neutral-200);
          border-radius: var(--radius-md);
          padding: var(--space-1) var(--space-2);
        }
      }
    `,
  ],
})
export class BentoTrendIndicatorComponent {
  @Input() trend!: BentoTrendData;

  get ariaLabel(): string {
    const direction =
      this.trend.type === 'up'
        ? 'increased'
        : this.trend.type === 'down'
          ? 'decreased'
          : 'unchanged';
    return `Trend: ${direction} by ${this.trend.value}`;
  }

  getTrendIcon(type: TrendType): string {
    switch (type) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      case 'neutral':
      default:
        return 'trending_flat';
    }
  }
}
