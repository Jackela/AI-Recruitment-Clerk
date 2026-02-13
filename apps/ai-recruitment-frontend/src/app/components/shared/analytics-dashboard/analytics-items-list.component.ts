import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents a single item in the analytics list.
 */
export interface AnalyticsListItem {
  /** Display title or name */
  title: string;
  /** Status identifier for styling */
  status?: string;
  /** Optional subtitle or additional info */
  subtitle?: string;
  /** Optional badge/score to display */
  badge?: string | number;
}

/**
 * Analytics items list component.
 * Displays a list of items with title, status, and optional badge.
 */
@Component({
  selector: 'arc-analytics-items-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recent-items" *ngIf="items().length > 0">
      <h4>{{ title() }}</h4>
      <div class="item-list">
        <div class="item" *ngFor="let item of items()">
          <span class="item-title">{{ item.title }}</span>
          @if (item.badge !== undefined) {
            <span class="item-score">{{ item.badge }}</span>
          } @else if (item.status) {
            <span class="item-status" [class]="'status-' + item.status">{{
              item.status
            }}</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .recent-items {
        margin-top: var(--space-6);
      }

      .recent-items h4 {
        margin: 0 0 var(--space-3) 0;
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-fantasy-large);
        color: var(--color-text-fantasy);
        opacity: 0.95;
      }

      .item-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-3);
        background: linear-gradient(
          135deg,
          var(--color-bg-secondary),
          rgba(255, 255, 255, 0.02)
        );
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border-secondary);
        transition: all var(--transition-base);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0;
          background: linear-gradient(
            180deg,
            var(--color-primary-600),
            var(--color-royal-600)
          );
          border-radius: var(--radius-full);
          transition: height var(--transition-base);
        }

        &:hover {
          background: linear-gradient(
            135deg,
            var(--color-primary-25),
            var(--color-royal-25)
          );
          transform: translateX(4px);
          border-color: var(--color-primary-200);

          &::before {
            height: 60%;
          }
        }
      }

      .item-title {
        font-family: var(--font-family-body);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .item-status {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-lg);
        font-family: var(--font-family-body);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 1px solid transparent;
        box-shadow: var(--shadow-xs);
      }

      .status-active {
        background: linear-gradient(
          135deg,
          var(--color-primary-100),
          var(--color-primary-50)
        );
        color: var(--color-primary-800);
        border-color: var(--color-primary-200);
      }

      .status-draft {
        background: linear-gradient(
          135deg,
          var(--color-warning-100),
          var(--color-warning-50)
        );
        color: var(--color-warning-800);
        border-color: var(--color-warning-200);
      }

      .status-closed {
        background: linear-gradient(
          135deg,
          var(--color-error-100),
          var(--color-error-50)
        );
        color: var(--color-error-800);
        border-color: var(--color-error-200);
      }

      .status-completed {
        background: linear-gradient(
          135deg,
          var(--color-success-100),
          var(--color-success-50)
        );
        color: var(--color-success-800);
        border-color: var(--color-success-200);
      }

      .status-processing {
        background: linear-gradient(
          135deg,
          var(--color-warning-100),
          var(--color-ember-50)
        );
        color: var(--color-warning-800);
        border-color: var(--color-warning-200);
      }

      .status-failed {
        background: linear-gradient(
          135deg,
          var(--color-error-100),
          var(--color-error-50)
        );
        color: var(--color-error-800);
        border-color: var(--color-error-200);
      }

      .status-processed {
        background: linear-gradient(
          135deg,
          var(--color-success-100),
          var(--color-emerald-50)
        );
        color: var(--color-success-800);
        border-color: var(--color-success-200);
      }

      .status-pending {
        background: linear-gradient(
          135deg,
          var(--color-royal-100),
          var(--color-royal-50)
        );
        color: var(--color-royal-800);
        border-color: var(--color-royal-200);
      }

      .item-score {
        font-family: var(--font-family-fantasy-heading);
        font-weight: var(--font-weight-fantasy-large);
        color: var(--color-success-700);
        font-size: var(--font-size-sm);
        background: linear-gradient(
          135deg,
          var(--color-success-700),
          var(--color-emerald-600)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      @media (max-width: 768px) {
        .item {
          padding: var(--space-2);

          &:hover {
            transform: translateX(2px);
          }
        }
      }
    `,
  ],
})
export class AnalyticsItemsListComponent {
  /** Section title */
  public readonly title = input.required<string>();

  /** List of items to display */
  public readonly items = input.required<AnalyticsListItem[]>();
}
