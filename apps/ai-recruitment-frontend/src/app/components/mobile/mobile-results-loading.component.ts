import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Loading state component for results display.
 * Shown while candidates are being fetched.
 */
@Component({
  selector: 'arc-mobile-results-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ message }}</p>
    </div>
  `,
  styles: [
    `
      .loading-state {
        text-align: center;
        padding: 48px 24px;
        color: #6c757d;

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e9ecef;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        p {
          font-size: 14px;
          margin: 0;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class MobileResultsLoadingComponent {
  public message = 'Loading candidates...';
}
