import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents a single analytics stat card component.
 * Displays a metric value with its label in a styled card.
 */
@Component({
  selector: 'arc-analytics-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-item">
      <span class="stat-value">{{ value() }}</span>
      <span class="stat-label">{{ label() }}</span>
    </div>
  `,
  styles: [
    `
      .stat-item {
        text-align: center;
        padding: var(--space-4);
        background: linear-gradient(
          135deg,
          var(--color-bg-secondary),
          var(--color-bg-tertiary)
        );
        border-radius: var(--radius-xl);
        border: 1px solid var(--color-border-fantasy);
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-base);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          pointer-events: none;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-300);
        }
      }

      .stat-value {
        display: block;
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-fantasy-h1);
        background: linear-gradient(
          135deg,
          var(--color-primary-800),
          var(--color-royal-700)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: var(--space-1);
        letter-spacing: -0.02em;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .stat-label {
        font-family: var(--font-family-body);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
      }

      @media (max-width: 768px) {
        .stat-item {
          padding: var(--space-3);

          &:hover {
            transform: translateY(-1px);
          }
        }

        .stat-value {
          font-size: var(--font-size-2xl);
        }
      }
    `,
  ],
})
export class AnalyticsStatsCardComponent {
  /** The value to display (e.g., count, percentage) */
  public readonly value = input.required<string | number>();

  /** The label describing the metric */
  public readonly label = input.required<string>();
}
