import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the shape of the error action.
 */
export interface ErrorAction {
  type: 'retry' | 'start-new' | 'contact-support';
  payload?: unknown;
}

/**
 * Defines the shape of the error info.
 */
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: string;
  recoverable?: boolean;
  timestamp?: Date;
}

/**
 * Represents the analysis error component.
 */
@Component({
  selector: 'arc-analysis-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-card" [@slideIn]>
      <div class="card-header">
        <h2>❌ 分析失败</h2>
        <p>{{ getHeaderDescription() }}</p>
      </div>

      <div class="error-content">
        <div class="error-icon" [class]="getIconClass()">
          <svg
            *ngIf="!isNetworkError()"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg
            *ngIf="isNetworkError()"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
            ></path>
          </svg>
        </div>

        <h3 class="error-title">
          {{ errorInfo?.message || '处理过程中遇到问题' }}
        </h3>

        <div class="error-details" *ngIf="showDetails">
          <div class="error-code" *ngIf="errorInfo?.code">
            <span class="label">错误代码:</span>
            <span class="value">{{ errorInfo?.code }}</span>
          </div>
          <div class="error-timestamp" *ngIf="errorInfo?.timestamp">
            <span class="label">发生时间:</span>
            <span class="value">{{
              errorInfo?.timestamp
                ? formatTimestamp(errorInfo?.timestamp)
                : 'N/A'
            }}</span>
          </div>
          <div class="error-description" *ngIf="errorInfo?.details">
            <p>{{ errorInfo?.details }}</p>
          </div>
        </div>

        <div class="error-suggestions">
          <h4>可能的解决方案:</h4>
          <ul class="suggestion-list" role="list">
            <li *ngFor="let suggestion of getSuggestions()" role="listitem">
              {{ suggestion }}
            </li>
          </ul>
        </div>

        <!-- Troubleshooting Tips -->
        <div class="troubleshooting-tips" *ngIf="showTroubleshooting">
          <details class="tips-details">
            <summary>故障排除提示</summary>
            <div class="tips-content">
              <div
                class="tip-item"
                *ngFor="let tip of getTroubleshootingTips()"
              >
                <strong>{{ tip.title }}</strong>
                <p>{{ tip.description }}</p>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div class="error-actions">
        <button
          (click)="onAction('retry')"
          class="primary-btn"
          *ngIf="isRecoverable()"
          [disabled]="isRetrying"
          aria-label="重试分析操作"
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          {{ isRetrying ? '重试中...' : '重试分析' }}
        </button>

        <button
          (click)="onAction('start-new')"
          class="secondary-btn"
          [disabled]="isRetrying"
          aria-label="重新开始新的分析"
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M12 2v20M2 12h20"></path>
          </svg>
          重新开始
        </button>

        <button
          (click)="onAction('contact-support')"
          class="outline-btn"
          *ngIf="shouldShowSupport()"
          [disabled]="isRetrying"
          aria-label="联系技术支持获取帮助"
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            ></path>
          </svg>
          联系支持
        </button>
      </div>

      <!-- Error Reporting -->
      <div class="error-reporting" *ngIf="enableErrorReporting">
        <details class="reporting-details">
          <summary>报告此问题</summary>
          <div class="reporting-content">
            <p>帮助我们改进服务，您可以选择发送错误报告：</p>
            <button
              (click)="sendErrorReport()"
              class="report-btn"
              [disabled]="isReporting"
              aria-label="发送错误报告给开发团队"
            >
              {{ isReporting ? '发送中...' : '发送报告' }}
            </button>
            <p class="privacy-note">*报告将包含错误信息但不会包含个人数据</p>
          </div>
        </details>
      </div>
    </div>
  `,
  styles: [
    `
      .error-content {
        text-align: center;
        margin-bottom: 2rem;
      }

      .error-icon {
        width: 80px;
        height: 80px;
        color: #ef4444;
        margin: 0 auto 1.5rem;
        transition: color 0.3s ease;
      }

      .error-icon.network {
        color: #f59e0b;
      }

      .error-icon.server {
        color: #dc2626;
      }

      .error-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #dc2626;
        margin: 0 0 1.5rem 0;
        line-height: 1.4;
      }

      .error-details {
        background: rgba(254, 242, 242, 0.5);
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid rgba(239, 68, 68, 0.2);
        margin-bottom: 1.5rem;
        text-align: left;
      }

      .error-code,
      .error-timestamp {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(239, 68, 68, 0.1);
      }

      .error-code:last-child,
      .error-timestamp:last-child {
        border-bottom: none;
      }

      .error-code .label,
      .error-timestamp .label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 600;
        text-transform: uppercase;
      }

      .error-code .value,
      .error-timestamp .value {
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.875rem;
        color: #dc2626;
        font-weight: 500;
      }

      .error-description p {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 1rem 0 0 0;
      }

      .error-suggestions {
        text-align: left;
        margin-bottom: 1.5rem;
      }

      .error-suggestions h4 {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
      }

      .suggestion-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .suggestion-list li {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.6;
        margin-bottom: 0.5rem;
        padding-left: 1.5rem;
        position: relative;
      }

      .suggestion-list li::before {
        content: '→';
        color: #f59e0b;
        font-weight: 600;
        position: absolute;
        left: 0;
        top: 0;
      }

      .troubleshooting-tips {
        margin-top: 1.5rem;
        text-align: left;
      }

      .tips-details {
        background: rgba(249, 250, 251, 0.8);
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .tips-details summary {
        padding: 1rem;
        cursor: pointer;
        font-weight: 600;
        color: #374151;
      }

      .tips-details summary:hover {
        background: rgba(243, 244, 246, 0.8);
      }

      .tips-content {
        padding: 0 1rem 1rem;
        border-top: 1px solid #e5e7eb;
      }

      .tip-item {
        margin-bottom: 1rem;
      }

      .tip-item:last-child {
        margin-bottom: 0;
      }

      .tip-item strong {
        display: block;
        color: #374151;
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }

      .tip-item p {
        color: #6b7280;
        font-size: 0.8125rem;
        line-height: 1.5;
        margin: 0;
      }

      .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .error-reporting {
        margin-top: 2rem;
        text-align: left;
      }

      .reporting-details {
        background: rgba(249, 250, 251, 0.8);
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .reporting-details summary {
        padding: 1rem;
        cursor: pointer;
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
      }

      .reporting-content {
        padding: 0 1rem 1rem;
        border-top: 1px solid #e5e7eb;
      }

      .reporting-content p {
        color: #6b7280;
        font-size: 0.8125rem;
        line-height: 1.5;
        margin: 0 0 1rem 0;
      }

      .report-btn {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .report-btn:hover:not(:disabled) {
        background: #e5e7eb;
      }

      .report-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .privacy-note {
        font-size: 0.75rem !important;
        color: #9ca3af !important;
        margin-top: 0.5rem !important;
      }

      @media (max-width: 768px) {
        .error-actions {
          flex-direction: column;
        }

        .error-code,
        .error-timestamp {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }
      }
    `,
  ],
  styleUrls: ['../unified-analysis.component.css'],
})
export class AnalysisErrorComponent {
  @Input() errorInfo: ErrorInfo | null = null;
  @Input() showDetails = true;
  @Input() showTroubleshooting = true;
  @Input() enableErrorReporting = true;
  @Input() isRetrying = false;

  @Output() actionRequested = new EventEmitter<ErrorAction>();
  @Output() errorReported = new EventEmitter<ErrorInfo>();

  isReporting = false;

  /**
   * Performs the on action operation.
   * @param type - The type.
   */
  onAction(type: ErrorAction['type']): void {
    this.actionRequested.emit({ type });
  }

  /**
   * Performs the send error report operation.
   * @returns A promise that resolves when the operation completes.
   */
  async sendErrorReport(): Promise<void> {
    if (!this.errorInfo) return;

    this.isReporting = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      this.errorReported.emit(this.errorInfo);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * Retrieves header description.
   * @returns The string value.
   */
  getHeaderDescription(): string {
    if (this.isNetworkError()) {
      return '网络连接或服务器响应异常';
    }
    if (this.isFileError()) {
      return '文件处理过程中出现问题';
    }
    return '处理过程中遇到问题';
  }

  /**
   * Retrieves icon class.
   * @returns The string value.
   */
  getIconClass(): string {
    if (this.isNetworkError()) return 'network';
    if (this.isServerError()) return 'server';
    return '';
  }

  /**
   * Performs the is network error operation.
   * @returns The boolean value.
   */
  isNetworkError(): boolean {
    const code = this.errorInfo?.code?.toLowerCase();
    return code?.includes('network') || code?.includes('timeout') || false;
  }

  /**
   * Performs the is file error operation.
   * @returns The boolean value.
   */
  isFileError(): boolean {
    const code = this.errorInfo?.code?.toLowerCase();
    return code?.includes('file') || code?.includes('parse') || false;
  }

  /**
   * Performs the is server error operation.
   * @returns The boolean value.
   */
  isServerError(): boolean {
    const code = this.errorInfo?.code?.toLowerCase();
    return code?.includes('server') || code?.includes('internal') || false;
  }

  /**
   * Performs the is recoverable operation.
   * @returns The boolean value.
   */
  isRecoverable(): boolean {
    return this.errorInfo?.recoverable !== false;
  }

  /**
   * Performs the should show support operation.
   * @returns The boolean value.
   */
  shouldShowSupport(): boolean {
    return !this.isRecoverable() || this.isServerError();
  }

  /**
   * Retrieves suggestions.
   * @returns The an array of string value.
   */
  getSuggestions(): string[] {
    if (this.isNetworkError()) {
      return [
        '检查您的网络连接是否正常',
        '稍后重试，可能是暂时的网络问题',
        '尝试刷新页面或重启浏览器',
      ];
    }

    if (this.isFileError()) {
      return [
        '确保上传的文件格式正确 (PDF、DOC、DOCX)',
        '检查文件是否损坏或加密',
        '尝试使用其他格式的简历文件',
        '确保文件大小不超过 10MB',
      ];
    }

    if (this.isServerError()) {
      return [
        '这是一个服务器问题，我们正在处理',
        '请稍后重试或联系技术支持',
        '您可以尝试刷新页面',
      ];
    }

    return [
      '请检查文件格式是否正确',
      '确保网络连接稳定',
      '稍后重试或联系技术支持',
    ];
  }

  /**
   * Retrieves troubleshooting tips.
   * @returns The Array<{ title: string; description: string }>.
   */
  getTroubleshootingTips(): Array<{ title: string; description: string }> {
    return [
      {
        title: '检查文件格式',
        description:
          '确保上传的是 PDF、DOC 或 DOCX 格式的文件，其他格式暂不支持。',
      },
      {
        title: '文件大小限制',
        description: '单个文件大小不能超过 10MB，过大的文件可能导致处理失败。',
      },
      {
        title: '网络连接',
        description: '确保网络连接稳定，上传大文件时建议使用稳定的 WiFi 连接。',
      },
      {
        title: '浏览器兼容性',
        description:
          '建议使用最新版本的 Chrome、Firefox、Safari 或 Edge 浏览器。',
      },
    ];
  }

  /**
   * Performs the format timestamp operation.
   * @param timestamp - The timestamp.
   * @returns The string value.
   */
  formatTimestamp(timestamp: Date | undefined): string {
    if (!timestamp) return 'N/A';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  }
}
