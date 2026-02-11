import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { QuickAction } from '../../services/mobile/mobile-dashboard.service';

/**
 * Represents the mobile quick actions component.
 * Displays horizontally scrollable quick action buttons.
 */
@Component({
  selector: 'arc-mobile-quick-actions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="quick-actions-bar" *ngIf="quickActions.length > 0">
      <div class="quick-actions-scroll">
        <button
          *ngFor="let action of quickActions"
          class="quick-action"
          [class]="'quick-action--' + action.color"
          [routerLink]="action.route"
          [attr.aria-label]="action.label"
        >
          <div class="action-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path [attr.d]="action.icon" />
            </svg>
            <span class="action-badge" *ngIf="action.badge">{{
              action.badge
            }}</span>
          </div>
          <span class="action-label">{{ action.label }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .quick-actions-bar {
        margin-bottom: var(--spacing-6, 1.5rem);
      }

      .quick-actions-scroll {
        display: flex;
        gap: var(--spacing-3, 0.75rem);
        overflow-x: auto;
        padding: var(--spacing-1, 0.25rem) 0 var(--spacing-2, 0.5rem);
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
          display: none;
        }

        .quick-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-2, 0.5rem);
          padding: var(--spacing-3, 0.75rem);
          border: none;
          border-radius: var(--border-radius-lg, 12px);
          background: var(--color-surface, white);
          color: var(--color-text, #495057);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: calc(var(--spacing-16, 4rem) + var(--spacing-2, 0.5rem));
          flex-shrink: 0;
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));

          &:active {
            transform: scale(0.96);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }

          .action-icon {
            position: relative;
            width: var(--spacing-10, 2.5rem);
            height: var(--spacing-10, 2.5rem);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;

            .action-badge {
              position: absolute;
              top: calc(-1 * var(--spacing-1, 0.25rem));
              right: calc(-1 * var(--spacing-1, 0.25rem));
              background: var(--color-error, #e74c3c);
              color: white;
              font-size: 0.625rem;
              font-weight: 600;
              padding: var(--spacing-1, 0.25rem) var(--spacing-2, 0.5rem);
              border-radius: var(--border-radius-full, 10px);
              min-width: var(--spacing-4, 1rem);
              text-align: center;
            }
          }

          .action-label {
            font-size: 11px;
            font-weight: 500;
            text-align: center;
            line-height: 1.2;
          }

          &--primary {
            .action-icon {
              background: rgba(52, 152, 219, 0.1);
              color: #3498db;
            }
          }

          &--success {
            .action-icon {
              background: rgba(40, 167, 69, 0.1);
              color: #28a745;
            }
          }

          &--warning {
            .action-icon {
              background: rgba(255, 193, 7, 0.1);
              color: #ffc107;
            }
          }

          &--danger {
            .action-icon {
              background: rgba(231, 76, 60, 0.1);
              color: #e74c3c;
            }
          }
        }
      }
    `,
  ],
})
export class MobileQuickActionsComponent {
  @Input({ required: true })
  public quickActions!: QuickAction[];
}
