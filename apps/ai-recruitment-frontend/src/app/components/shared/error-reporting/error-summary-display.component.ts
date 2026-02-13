import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Error summary data interface.
 */
export interface ErrorSummaryData {
  summary: string;
  technicalDetails: string;
  userGuidance: string;
}

/**
 * Displays error summary with technical details and user guidance.
 * Shows the problem overview, expandable technical details, and suggested solutions.
 */
@Component({
  selector: 'arc-error-summary-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-summary">
      <h3>问题概述</h3>
      <div class="summary-content">
        <p>{{ summaryData().summary }}</p>
        <details class="technical-details">
          <summary>技术详情</summary>
          <pre>{{ summaryData().technicalDetails }}</pre>
        </details>
      </div>
    </div>

    <div class="user-guidance" *ngIf="summaryData().userGuidance">
      <h4>建议的解决方案</h4>
      <div
        class="guidance-content"
        [innerHTML]="formattedGuidance()"
      ></div>
    </div>
  `,
  styles: [
    `
      .error-summary {
        background: #fef2f2;
        border-left: 4px solid #ef4444;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 2rem;
      }

      .error-summary h3 {
        margin: 0 0 0.5rem 0;
        color: #dc2626;
        font-size: 1rem;
        font-weight: 600;
      }

      .summary-content p {
        margin: 0 0 1rem 0;
        color: #7f1d1d;
      }

      .technical-details {
        margin-top: 1rem;
      }

      .technical-details summary {
        cursor: pointer;
        font-weight: 500;
        color: #dc2626;
        margin-bottom: 0.5rem;
      }

      .technical-details pre {
        background: #f3f4f6;
        border-radius: 6px;
        padding: 1rem;
        overflow-x: auto;
        font-size: 0.875rem;
        color: #374151;
        margin: 0.5rem 0 0 0;
      }

      .user-guidance {
        background: #f0f9ff;
        border-left: 4px solid #0ea5e9;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 2rem;
      }

      .user-guidance h4 {
        margin: 0 0 0.75rem 0;
        color: #0c4a6e;
        font-size: 1rem;
        font-weight: 600;
      }

      .guidance-content {
        color: #164e63;
        line-height: 1.6;
      }
    `,
  ],
})
export class ErrorSummaryDisplayComponent {
  /**
   * Error summary data to display.
   */
  public readonly summaryData = input.required<ErrorSummaryData>();

  /**
   * Formats guidance text for HTML display.
   * @returns The formatted guidance string with line breaks and bullets.
   */
  protected formattedGuidance = computed(() => {
    const guidance = this.summaryData().userGuidance;
    return guidance.replace(/\n/g, '<br>').replace(/•/g, '&bull;');
  });
}
