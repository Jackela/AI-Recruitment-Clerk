import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the shape of a change indicator for stats.
 */
export interface StatChange {
  value: number;
  type: 'increase' | 'decrease';
  period: string;
}

/**
 * Defines the shape of a stat card.
 */
export interface DashboardStat {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  change?: StatChange;
}

/**
 * Dashboard Stats Component
 *
 * Displays overview statistics in a responsive grid layout.
 * Each stat shows an icon, value, label, and optional change indicator.
 */
@Component({
  selector: 'arc-dashboard-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-overview" *ngIf="stats.length > 0">
      <h2 class="section-title">Overview</h2>
      <div class="stats-grid">
        <div
          *ngFor="let stat of stats"
          class="stat-card"
          [class]="'stat-card--' + stat.color"
        >
          <div class="stat-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path [attr.d]="stat.icon" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.title }}</div>
            <div class="stat-change" *ngIf="stat.change">
              <span
                class="change-indicator"
                [class]="'change-' + stat.change.type"
              >
                {{ stat.change.type === 'increase' ? '↗' : '↘' }}
                {{ Math.abs(stat.change.value) }}%
              </span>
              <span class="change-period">{{ stat.change.period }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .stats-overview {
        margin-bottom: var(--spacing-6, 1.5rem);
      }

      .section-title {
        font-size: 20px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0 0 16px 0;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-3, 0.75rem);

        .stat-card {
          background: var(--color-surface, white);
          border-radius: var(--border-radius-lg, 12px);
          padding: var(--spacing-4, 1rem);
          display: flex;
          align-items: center;
          gap: var(--spacing-3, 0.75rem);
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));

          .stat-icon {
            width: var(--spacing-9, 2.25rem);
            height: var(--spacing-9, 2.25rem);
            border-radius: var(--border-radius-md, 8px);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .stat-content {
            flex: 1;
            min-width: 0;

            .stat-value {
              font-size: 18px;
              font-weight: 700;
              color: #2c3e50;
              line-height: 1.2;
            }

            .stat-label {
              font-size: 12px;
              color: #6c757d;
              font-weight: 500;
              margin-top: 2px;
            }

            .stat-change {
              display: flex;
              align-items: center;
              gap: var(--spacing-1, 0.25rem);
              margin-top: var(--spacing-1, 0.25rem);

              .change-indicator {
                font-size: 0.6875rem;
                font-weight: 600;
                padding: var(--spacing-1, 0.25rem) var(--spacing-1, 0.25rem);
                border-radius: var(--border-radius-sm, 4px);

                &.change-increase {
                  background: rgba(40, 167, 69, 0.1);
                  color: #28a745;
                }

                &.change-decrease {
                  background: rgba(231, 76, 60, 0.1);
                  color: #e74c3c;
                }
              }

              .change-period {
                font-size: 10px;
                color: #95a5a6;
              }
            }
          }

          &--primary .stat-icon {
            background: rgba(52, 152, 219, 0.1);
            color: #3498db;
          }

          &--success .stat-icon {
            background: rgba(40, 167, 69, 0.1);
            color: #28a745;
          }

          &--warning .stat-icon {
            background: rgba(255, 193, 7, 0.1);
            color: #ffc107;
          }

          &--danger .stat-icon {
            background: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
          }
        }
      }

      @media (min-width: 768px) {
        .stats-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `,
  ],
})
export class DashboardStatsComponent {
  // Multi-agent fix: template needs access to Math object
  protected readonly Math = Math;

  /** Array of statistics to display */
  @Input({ required: true }) public stats!: DashboardStat[];
}
