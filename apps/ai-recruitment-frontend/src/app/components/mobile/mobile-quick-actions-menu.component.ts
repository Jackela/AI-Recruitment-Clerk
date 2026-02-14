import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the shape of a quick action menu item.
 */
export interface QuickActionMenuItem {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'danger';
}

/**
 * Quick actions dropdown menu component.
 * Displays a dropdown menu of quick actions for a candidate.
 */
@Component({
  selector: 'arc-mobile-quick-actions-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quick-actions-menu" *ngIf="visible">
      <button
        *ngFor="let action of actions"
        class="quick-action-btn"
        [class]="'action-' + action.color"
        (click)="onActionClick(action, $event)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path [attr.d]="action.icon" />
        </svg>
        {{ action.label }}
      </button>
    </div>
  `,
  styles: [
    `
      .quick-actions-menu {
        position: absolute;
        top: 100%;
        right: 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10;
        min-width: 150px;

        .quick-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          background: white;
          color: #495057;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;

          &:first-child {
            border-radius: 8px 8px 0 0;
          }

          &:last-child {
            border-radius: 0 0 8px 8px;
          }

          &:only-child {
            border-radius: 8px;
          }

          &:hover {
            background: #f8f9fa;
          }

          &.action-primary {
            color: #3498db;
          }

          &.action-success {
            color: #27ae60;
          }

          &.action-danger {
            color: #e74c3c;
          }
        }
      }
    `,
  ],
})
export class MobileQuickActionsMenuComponent {
  @Input() public visible = false;
  @Input() public actions: QuickActionMenuItem[] = [];

  @Output() public actionClick = new EventEmitter<QuickActionMenuItem>();

  protected onActionClick(action: QuickActionMenuItem, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit(action);
  }
}
