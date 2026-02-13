import { Component } from '@angular/core';

/**
 * Loading indicator component for virtual scroll.
 * Displays a spinner and loading message at the bottom of the list.
 */
@Component({
  selector: 'arc-virtual-scroll-loading',
  standalone: true,
  template: `
    <div class="virtual-scroll-loading" role="status" aria-live="polite">
      <div class="loading-spinner"></div>
      <span class="loading-text">{{ message }}</span>
    </div>
  `,
  styles: [
    `
      .virtual-scroll-loading {
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        background: linear-gradient(
          to top,
          var(--color-surface, white) 0%,
          transparent 100%
        );
        color: var(--color-text-secondary, #6b7280);
        font-size: 0.875rem;
      }

      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--color-border, #e5e7eb);
        border-top-color: var(--color-primary, #667eea);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      .loading-text {
        font-weight: 500;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .loading-spinner {
          animation: none;
          opacity: 0.5;
        }
      }
    `,
  ],
})
export class VirtualScrollLoadingComponent {
  /** Loading message to display. */
  public message = '加载中...';
}
