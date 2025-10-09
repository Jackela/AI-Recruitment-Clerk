import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertType = 'success' | 'info' | 'warning' | 'danger';

/**
 * Represents the alert component.
 */
@Component({
  selector: 'arc-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="alert"
      [class]="'alert-' + type"
      [class.alert-dismissible]="dismissible"
      role="alert"
    >
      <div class="alert-icon">
        <svg
          *ngIf="type === 'success'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22,4 12,14.01 9,11.01"></polyline>
        </svg>

        <svg
          *ngIf="type === 'info'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12,16 L12,12"></path>
          <path d="M12,8 L12.01,8"></path>
        </svg>

        <svg
          *ngIf="type === 'warning'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          ></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>

        <svg
          *ngIf="type === 'danger'"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>

      <div class="alert-content">
        <div class="alert-title" *ngIf="title">{{ title }}</div>
        <div class="alert-message">
          <ng-content></ng-content>
        </div>
      </div>

      <button
        *ngIf="dismissible"
        type="button"
        class="alert-close-btn"
        (click)="onDismiss()"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  `,
  styles: [
    `
      .alert {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .alert-success {
        background-color: #f0f9ff;
        border-left-color: #10b981;
        color: #065f46;

        .alert-icon {
          color: #10b981;
        }
      }

      .alert-info {
        background-color: #eff6ff;
        border-left-color: #3b82f6;
        color: #1e40af;

        .alert-icon {
          color: #3b82f6;
        }
      }

      .alert-warning {
        background-color: #fffbeb;
        border-left-color: #f59e0b;
        color: #92400e;

        .alert-icon {
          color: #f59e0b;
        }
      }

      .alert-danger {
        background-color: #fef2f2;
        border-left-color: #ef4444;
        color: #991b1b;

        .alert-icon {
          color: #ef4444;
        }
      }

      .alert-icon {
        flex-shrink: 0;
        margin-top: 0.1rem;
      }

      .alert-content {
        flex: 1;
      }

      .alert-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .alert-message {
        margin: 0;
      }

      .alert-close-btn {
        flex-shrink: 0;
        background: none;
        border: none;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 1;
        }
      }
    `,
  ],
})
export class AlertComponent {
  @Input() type: AlertType = 'info';
  @Input() title = '';
  @Input() dismissible = false;
  @Output() dismissed = new EventEmitter<void>();

  /**
   * Performs the on dismiss operation.
   * @returns The result of the operation.
   */
  onDismiss() {
    this.dismissed.emit();
  }
}
