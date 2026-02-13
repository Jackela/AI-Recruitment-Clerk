import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Empty state component for results display.
 * Shown when no candidates match the current filters.
 */
@Component({
  selector: 'arc-mobile-results-empty',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M13,9H11V7H13M13,17H11V11H13V17Z"
          />
        </svg>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message">{{ message }}</p>
      <button class="empty-action" (click)="clearFilters.emit()">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: #6c757d;

        .empty-icon {
          margin-bottom: 16px;
          color: #95a5a6;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }

        .empty-message {
          font-size: 14px;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .empty-action {
          padding: 10px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;

          &:active {
            background: #2980b9;
            transform: scale(0.98);
          }
        }
      }
    `,
  ],
})
export class MobileResultsEmptyComponent {
  @Output() public clearFilters = new EventEmitter<void>();

  public title = 'No candidates found';
  public message = 'Try adjusting your filters or search criteria';
  public actionLabel = 'Clear Filters';
}
