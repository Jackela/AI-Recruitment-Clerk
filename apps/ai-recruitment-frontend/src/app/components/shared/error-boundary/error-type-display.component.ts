import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents a structured error for display.
 */
export interface DisplayedError {
  message: string;
  stack?: string;
  timestamp: Date;
  url?: string;
  componentName?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'network' | 'validation' | 'runtime' | 'security' | 'business';
}

/**
 * Error type display component.
 * Shows error information with severity-based styling.
 */
@Component({
  selector: 'arc-error-type-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-type" [class]="errorType()">
      <div class="error-type-icon">
        <svg *ngIf="iconSvg()" [innerHTML]="iconSvg()"></svg>
        <span class="error-type-text">{{ typeText() }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .error-type {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        background: var(--color-bg-secondary);
      }

      .error-type-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      }

      .error-type-icon svg {
        width: 20px;
        height: 20px;
      }

      .error-type-text {
        font-size: 0.75rem;
        font-weight: 500;
      }

      .error-type.critical {
        background: linear-gradient(135deg, #fee, #fecaca);
        color: #dc2626;
      }

      .error-type.high {
        background: linear-gradient(135deg, #fef3c7, #fbbf24);
        color: #b91c1c;
      }

      .error-type.medium {
        background: linear-gradient(135deg, #fef9c3, #fde68a);
        color: #d97706;
      }

      .error-type.low {
        background: linear-gradient(135deg, #d1fae5, #fef2f2);
        color: #065f46;
      }
    `,
  ],
})
export class ErrorTypeDisplayComponent {
  /** The error severity */
  public readonly errorType = input.required<
    'network' | 'validation' | 'runtime' | 'security' | 'business'
  >();

  /** Display text for the error type */
  public readonly typeText = input.required<string>();

  /** Optional SVG icon for the error type */
  public readonly iconSvg = input<string>('');

  /**
   * Get CSS class for error type.
   */
  public getErrorTypeClass(): string {
    return `error-type ${this.errorType()}`;
  }

  /**
   * Get display text for error type.
   */
  public getDisplayText(): string {
    const typeNames: Record<string, string> = {
      network: '网络',
      validation: '验证',
      runtime: '运行',
      security: '安全',
      business: '业务',
    };
    return this.typeText() || typeNames[this.errorType()] || this.errorType();
  }
}
