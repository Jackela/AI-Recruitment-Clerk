import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SystemHealth } from '../../services/dashboard-api.service';
import type { GuestStats } from './dashboard.service';

/**
 * Component responsible for displaying system health status and statistics.
 * Shows system status indicator, health overview, and guest statistics.
 */
@Component({
  selector: 'arc-stats-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-display">
      <!-- System Status Section -->
      <div
        class="system-status"
        [class]="'status-' + (systemHealth?.status || 'unknown')"
      >
        <span class="status-indicator"></span>
        系统状态: {{ statusText }}
      </div>

      <!-- Health Overview -->
      <div class="health-overview-container" *ngIf="systemHealth">
        <div class="health-summary">
          {{ healthyServicesCount }}/{{ totalServicesCount }} 服务正常
        </div>
        <div class="queue-status">
          队列深度: {{ systemHealth.processingMetrics.queueDepth }}
        </div>
        <div class="success-rate">
          成功率: {{ (systemHealth.processingMetrics.successRate * 100).toFixed(1) }}%
        </div>
      </div>

      <!-- Guest Stats -->
      <div class="guest-stats-container" *ngIf="guestStats">
        <h4 class="stats-title">访客统计</h4>
        <div class="guest-stats">
          <div class="stat-row">
            <span class="stat-label">总访客数:</span>
            <strong class="stat-value">{{ guestStats.totalGuests }}</strong>
          </div>
          <div class="stat-row">
            <span class="stat-label">活跃访客:</span>
            <strong class="stat-value">{{ guestStats.activeGuests }}</strong>
          </div>
          <div class="stat-row">
            <span class="stat-label">待反馈:</span>
            <strong class="stat-value">{{ guestStats.pendingFeedbackCodes }}</strong>
          </div>
          <div class="stat-row">
            <span class="stat-label">已兑换:</span>
            <strong class="stat-value">{{ guestStats.redeemedFeedbackCodes }}</strong>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .stats-display {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .system-status {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        font-size: 0.9rem;
        backdrop-filter: blur(10px);
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        animation: pulse 2s infinite;
      }

      .system-status.status-warning .status-indicator {
        background: #f59e0b;
      }

      .system-status.status-error .status-indicator {
        background: #ef4444;
      }

      .system-status.status-unknown .status-indicator {
        background: #6b7280;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .health-overview-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        font-size: 0.875rem;
      }

      .health-summary {
        font-weight: 600;
        color: #10b981;
      }

      .queue-status,
      .success-rate {
        color: #6b7280;
      }

      .guest-stats-container {
        padding: 1rem;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
      }

      .stats-title {
        font-size: 0.9rem;
        font-weight: 600;
        margin: 0 0 0.75rem 0;
        color: #2c3e50;
      }

      .guest-stats {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.25rem 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .stat-row:last-child {
        border-bottom: none;
      }

      .stat-label {
        color: #6b7280;
        font-size: 0.875rem;
      }

      .stat-value {
        color: #2c3e50;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .health-overview-container,
        .guest-stats-container {
          padding: 0.75rem;
        }

        .stats-title {
          font-size: 0.85rem;
        }
      }
    `,
  ],
})
export class StatsDisplayComponent {
  /**
   * System health data to display
   */
  @Input() public systemHealth: SystemHealth | null = null;

  /**
   * Guest statistics to display
   */
  @Input() public guestStats: GuestStats | null = null;

  /**
   * Gets the localized status text
   */
  public get statusText(): string {
    switch (this.systemHealth?.status) {
      case 'healthy':
        return '正常';
      case 'warning':
        return '警告';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  }

  /**
   * Gets the count of healthy services
   */
  public get healthyServicesCount(): number {
    if (!this.systemHealth) return 0;
    return Object.values(this.systemHealth.services).filter(
      (service) => service.status === 'healthy',
    ).length;
  }

  /**
   * Gets the total count of services
   */
  public get totalServicesCount(): number {
    if (!this.systemHealth) return 0;
    return Object.keys(this.systemHealth.services).length;
  }
}
