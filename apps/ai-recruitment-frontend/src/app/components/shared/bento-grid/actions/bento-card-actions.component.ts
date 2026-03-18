import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BentoActionData, ActionIconName } from '../types/bento-card.types';

@Component({
  selector: 'arc-bento-card-actions',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card-actions" *ngIf="actions && actions.length > 0">
      <button
        *ngFor="let action of actions; trackBy: trackByActionLabel"
        class="card-action-btn"
        [class.primary]="action.primary"
        (click)="onActionClick(action)"
        [attr.aria-label]="action.label"
      >
        <svg
          *ngIf="action.icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <ng-container [ngSwitch]="action.icon">
            <path *ngSwitchCase="'plus'" d="M12 5v14m-7-7h14"></path>
            <g *ngSwitchCase="'eye'">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </g>
            <path
              *ngSwitchCase="'edit'"
              d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
            ></path>
            <path
              *ngSwitchCase="'download'"
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
            ></path>
            <path *ngSwitchDefault d="M9 5l7 7-7 7"></path>
          </ng-container>
        </svg>
        {{ action.label }}
      </button>
    </div>
  `,
  styles: [
    `
      .card-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: auto;
        flex-wrap: wrap;
      }

      .card-action-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        font-family: var(--font-family-body);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: var(--transition-base);
        box-shadow: var(--shadow-xs);

        &:hover {
          background: var(--color-bg-secondary);
          border-color: var(--color-primary-300);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          color: var(--color-primary-700);
        }

        &:active {
          transform: translateY(0);
          box-shadow: var(--shadow-xs);
        }

        &.primary {
          background: linear-gradient(
            135deg,
            var(--color-primary-600),
            var(--color-royal-600)
          );
          border-color: var(--color-primary-500);
          color: white;
          font-weight: var(--font-weight-semibold);

          &:hover {
            background: linear-gradient(
              135deg,
              var(--color-primary-700),
              var(--color-royal-700)
            );
            border-color: var(--color-primary-600);
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
          }

          &:active {
            background: linear-gradient(
              135deg,
              var(--color-primary-800),
              var(--color-royal-800)
            );
          }
        }
      }

      @media (max-width: 640px) {
        .card-actions {
          flex-direction: column;
        }

        .card-action-btn {
          justify-content: center;
        }
      }
    `,
  ],
})
export class BentoCardActionsComponent {
  @Input() actions: BentoActionData[] = [];
  @Output() actionClick = new EventEmitter<BentoActionData>();

  onActionClick(action: BentoActionData): void {
    this.actionClick.emit(action);
    if (action.onClick) {
      action.onClick();
    }
  }

  trackByActionLabel(_index: number, action: BentoActionData): string {
    return action.label;
  }
}
