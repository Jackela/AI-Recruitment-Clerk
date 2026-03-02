import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents the error display data.
 */
export interface ErrorDisplayData {
  message: string;
  stack?: string;
  timestamp: Date;
  url?: string;
  componentName?: string;
  correlationId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'network' | 'validation' | 'runtime' | 'security' | 'business';
  recoverable?: boolean;
}

/**
 * Error display component.
 * Pure presentational component for rendering error UI.
 */
@Component({
  selector: 'arc-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-boundary-container">
      <div class="error-content">
        <div class="error-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <h1 class="error-title">哎呀，出错了！</h1>

        <p class="error-message">{{ errorData().message }}</p>

        <div class="error-details" *ngIf="showDetails()">
          <h3>错误详情</h3>
          <div class="error-info">
            <p>
              <strong>时间:</strong> {{ errorData().timestamp | date: 'medium' }}
            </p>
            <p *ngIf="errorData().componentName">
              <strong>组件:</strong> {{ errorData().componentName }}
            </p>
            <p><strong>URL:</strong> {{ errorData().url }}</p>
          </div>

          <div class="error-stack" *ngIf="isDevelopment() && errorData().stack">
            <h4>Stack Trace:</h4>
            <pre>{{ errorData().stack }}</pre>
          </div>
        </div>

        <div class="error-actions">
          <button (click)="reload.emit()" class="btn-primary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
              ></path>
            </svg>
            刷新页面
          </button>

          <button (click)="goHome.emit()" class="btn-secondary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
            返回首页
          </button>

          <button (click)="toggleDetails.emit()" class="btn-link">
            {{ showDetails() ? '隐藏' : '显示' }}详情
          </button>
        </div>

        <div class="error-history" *ngIf="errorHistory().length > 1">
          <h3>最近的错误 ({{ errorHistory().length }})</h3>
          <ul>
            <li *ngFor="let error of errorHistory(); let i = index">
              <span class="error-time">{{
                error.timestamp | date: 'short'
              }}</span>
              <span class="error-msg">{{ error.message }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-boundary-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
      }

      .error-content {
        background: white;
        border-radius: 20px;
        padding: 3rem;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
      }

      .error-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        background: #fee;
        border-radius: 50%;
        margin-bottom: 1.5rem;
        color: #ef4444;
      }

      .error-title {
        font-size: 2rem;
        font-weight: 700;
        color: #111827;
        margin-bottom: 1rem;
      }

      .error-message {
        font-size: 1.125rem;
        color: #6b7280;
        margin-bottom: 2rem;
        line-height: 1.6;
      }

      .error-details {
        background: #f9fafb;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        text-align: left;
      }

      .error-details h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 1rem;
      }

      .error-info p {
        margin: 0.5rem 0;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .error-info strong {
        color: #111827;
        font-weight: 600;
      }

      .error-stack {
        margin-top: 1rem;
      }

      .error-stack h4 {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.5rem;
      }

      .error-stack pre {
        background: #111827;
        color: #10b981;
        padding: 1rem;
        border-radius: 8px;
        font-size: 0.75rem;
        overflow-x: auto;
        max-height: 200px;
        overflow-y: auto;
        font-family: 'Courier New', monospace;
      }

      .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 2rem;
      }

      .error-actions button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.875rem;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
      }

      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .btn-secondary:hover {
        background: #e5e7eb;
      }

      .btn-link {
        background: transparent;
        color: #6366f1;
        text-decoration: underline;
      }

      .btn-link:hover {
        color: #4f46e5;
      }

      .error-history {
        background: #fef2f2;
        border-radius: 12px;
        padding: 1rem;
        text-align: left;
      }

      .error-history h3 {
        font-size: 0.875rem;
        font-weight: 600;
        color: #991b1b;
        margin-bottom: 0.75rem;
      }

      .error-history ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .error-history li {
        display: flex;
        gap: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #fecaca;
        font-size: 0.75rem;
      }

      .error-history li:last-child {
        border-bottom: none;
      }

      .error-time {
        color: #dc2626;
        font-weight: 600;
        white-space: nowrap;
      }

      .error-msg {
        color: #7f1d1d;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (max-width: 640px) {
        .error-content {
          padding: 2rem 1.5rem;
        }

        .error-title {
          font-size: 1.5rem;
        }

        .error-actions {
          flex-direction: column;
        }

        .error-actions button {
          width: 100%;
        }
      }
    `,
  ],
})
export class ErrorDisplayComponent {
  /** The error data to display */
  public readonly errorData = input.required<ErrorDisplayData>();

  /** Whether to show detailed error information */
  public readonly showDetails = input<boolean>(false);

  /** History of previous errors */
  public readonly errorHistory = input<ErrorDisplayData[]>([]);

  /** Whether running in development mode */
  public readonly isDevMode = input<boolean>(false);

  /** Event emitted when user requests page reload */
  public readonly reload = output<void>();

  /** Event emitted when user requests to go home */
  public readonly goHome = output<void>();

  /** Event emitted when user toggles details visibility */
  public readonly toggleDetails = output<void>();

  /**
   * Check if running in development environment.
   */
  public isDevelopment(): boolean {
    if (this.isDevMode() !== undefined) {
      return this.isDevMode();
    }
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('127.') ||
      window.location.hostname.startsWith('192.')
    );
  }
}
