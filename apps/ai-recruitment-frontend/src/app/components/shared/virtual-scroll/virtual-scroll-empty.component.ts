import { Component } from '@angular/core';

/**
 * Empty state component for virtual scroll.
 * Displays when no items are available in the list.
 */
@Component({
  selector: 'arc-virtual-scroll-empty',
  standalone: true,
  template: `
    <div class="virtual-scroll-empty" role="status">
      <ng-content>
        <p class="empty-message">{{ message }}</p>
      </ng-content>
    </div>
  `,
  styles: [
    `
      .virtual-scroll-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: var(--color-text-secondary, #6b7280);
        text-align: center;
      }

      .empty-message {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
      }
    `,
  ],
})
export class VirtualScrollEmptyComponent {
  /** Empty state message to display. */
  public message = '暂无数据';
}
