import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionService } from '../../services/connection.service';

/**
 * Service Unavailable Error Component
 *
 * Displays a full-screen error when backend services are unavailable.
 * This is a HARD STOP - users cannot proceed without backend services.
 */
@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="service-unavailable-overlay"
      *ngIf="connectionService.getConnectionStatus().isOffline"
    >
      <div class="error-container">
        <div class="error-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 class="error-title">服务暂时不可用</h1>

        <p class="error-message">
          {{ connectionService.getConnectionStatus().errorMessage }}
        </p>

        <div class="error-details">
          <p>AI Recruitment Clerk 需要以下服务才能正常工作：</p>
          <ul>
            <li>后端 API 服务 (Gateway)</li>
            <li>AI/LLM 分析服务</li>
            <li>数据库存储服务</li>
          </ul>
        </div>

        <div class="error-actions">
          <button
            class="retry-btn"
            (click)="retryConnection()"
            [disabled]="connectionService.getIsChecking()"
          >
            <span *ngIf="!connectionService.getIsChecking()"> 重新连接 </span>
            <span *ngIf="connectionService.getIsChecking()"> 检查中... </span>
          </button>

          <button class="config-btn" (click)="showConfig()">检查配置</button>
        </div>

        <div
          class="last-checked"
          *ngIf="connectionService.getConnectionStatus().lastChecked"
        >
          上次检查:
          {{
            connectionService.getConnectionStatus().lastChecked | date: 'medium'
          }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .service-unavailable-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }

      .error-container {
        background: white;
        border-radius: 16px;
        padding: 48px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .error-icon {
        color: #e53e3e;
        margin-bottom: 24px;
      }

      .error-title {
        font-size: 28px;
        font-weight: 700;
        color: #1a202c;
        margin-bottom: 16px;
      }

      .error-message {
        font-size: 16px;
        color: #4a5568;
        margin-bottom: 24px;
        line-height: 1.6;
      }

      .error-details {
        background: #f7fafc;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 24px;
        text-align: left;
      }

      .error-details p {
        font-size: 14px;
        color: #2d3748;
        margin-bottom: 12px;
        font-weight: 600;
      }

      .error-details ul {
        margin: 0;
        padding-left: 20px;
      }

      .error-details li {
        font-size: 14px;
        color: #4a5568;
        margin-bottom: 8px;
      }

      .error-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 20px;
      }

      .retry-btn {
        background: #4299e1;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }

      .retry-btn:hover:not(:disabled) {
        background: #3182ce;
      }

      .retry-btn:disabled {
        background: #a0aec0;
        cursor: not-allowed;
      }

      .config-btn {
        background: transparent;
        color: #4299e1;
        border: 2px solid #4299e1;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .config-btn:hover {
        background: #ebf8ff;
      }

      .last-checked {
        font-size: 12px;
        color: #718096;
      }
    `,
  ],
})
export class ServiceUnavailableComponent {
  connectionService = inject(ConnectionService);

  async retryConnection(): Promise<void> {
    await this.connectionService.retryConnection();
  }

  showConfig(): void {
    alert(
      '请检查以下配置：\n\n' +
        '1. 后端服务是否已启动\n' +
        '2. 环境变量是否正确设置\n' +
        '3. 网络连接是否正常\n' +
        '4. API 地址是否正确\n\n' +
        '启动命令：npm run dev:gateway',
    );
  }
}
