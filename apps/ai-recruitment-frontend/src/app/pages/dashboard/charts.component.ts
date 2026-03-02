import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ActivityItem } from '../../services/dashboard-api.service';

/**
 * Component responsible for displaying recent activity and chart-like visualizations.
 * Shows activity list with timestamps and provides empty state handling.
 */
@Component({
  selector: 'arc-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="charts-container">
      <!-- Recent Activity List -->
      <div class="activity-section">
        <div class="section-header">
          <h3 class="section-title">最近活动</h3>
          <span class="activity-count" *ngIf="activities.length > 0">
            {{ activities.length }} 条记录
          </span>
        </div>

        <div class="activity-list" *ngIf="activities.length > 0; else emptyState">
          <div
            class="activity-item"
            *ngFor="let activity of displayedActivities; trackBy: trackByActivityId"
            [class]="'activity-status-' + activity.status"
            (click)="onActivityClick(activity)"
            [attr.tabindex]="0"
            (keydown.enter)="onActivityClick(activity)"
            role="button"
            [attr.aria-label]="activity.title + ': ' + activity.description"
          >
            <div class="activity-icon">
              <ng-container [ngSwitch]="activity.type">
                <svg
                  *ngSwitchCase="'analysis-completed'"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="icon-success"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <svg
                  *ngSwitchCase="'analysis-active'"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="icon-processing"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <svg
                  *ngSwitchDefault
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </ng-container>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
            </div>
            <div class="activity-status" *ngIf="activity.status">
              <span class="status-badge" [class]="'status-' + activity.status">
                {{ getStatusLabel(activity.status) }}
              </span>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="no-activity">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class="empty-icon"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <p class="empty-text">暂无最近活动</p>
          </div>
        </ng-template>

        <!-- View More Button -->
        <button
          class="view-more-btn"
          *ngIf="activities.length > maxDisplay"
          (click)="onViewMore()"
        >
          查看更多 ({{ activities.length - maxDisplay }} 条)
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .charts-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: #2c3e50;
        margin: 0;
      }

      .activity-count {
        font-size: 0.75rem;
        color: #6b7280;
        background: rgba(0, 0, 0, 0.05);
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
      }

      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease;
      }

      .activity-item:hover {
        background: rgba(0, 0, 0, 0.05);
        transform: translateX(4px);
      }

      .activity-item:focus {
        outline: 2px solid #667eea;
        outline-offset: 2px;
      }

      .activity-item.activity-status-processing {
        border-left: 3px solid #f59e0b;
      }

      .activity-item.activity-status-completed {
        border-left: 3px solid #10b981;
      }

      .activity-item.activity-status-failed {
        border-left: 3px solid #ef4444;
      }

      .activity-icon {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
      }

      .icon-success {
        color: #10b981;
      }

      .icon-processing {
        color: #f59e0b;
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .activity-content {
        flex: 1;
        min-width: 0;
      }

      .activity-title {
        font-weight: 600;
        font-size: 0.875rem;
        color: #2c3e50;
        margin-bottom: 0.25rem;
      }

      .activity-description {
        font-size: 0.8rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
        line-height: 1.4;
      }

      .activity-time {
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .activity-status {
        flex-shrink: 0;
      }

      .status-badge {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        font-size: 0.7rem;
        font-weight: 500;
        border-radius: 12px;
        text-transform: uppercase;
      }

      .status-badge.status-processing {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }

      .status-badge.status-completed {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }

      .status-badge.status-failed {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      .no-activity {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 0;
        color: #9ca3af;
      }

      .empty-icon {
        margin-bottom: 0.75rem;
        opacity: 0.5;
      }

      .empty-text {
        margin: 0;
        font-size: 0.9rem;
      }

      .view-more-btn {
        margin-top: 0.75rem;
        padding: 0.5rem 1rem;
        background: transparent;
        border: 1px solid #667eea;
        color: #667eea;
        border-radius: 8px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .view-more-btn:hover {
        background: #667eea;
        color: white;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .activity-item {
          padding: 0.5rem;
        }

        .activity-icon {
          width: 28px;
          height: 28px;
        }

        .activity-title {
          font-size: 0.8rem;
        }

        .activity-description {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class ChartsComponent {
  /**
   * List of activities to display
   */
  @Input() public activities: ActivityItem[] = [];

  /**
   * Maximum number of activities to display before showing "View More"
   */
  @Input() public maxDisplay = 5;

  /**
   * Event emitted when an activity item is clicked
   */
  @Output() public activityClick = new EventEmitter<ActivityItem>();

  /**
   * Event emitted when user clicks "View More"
   */
  @Output() public viewMore = new EventEmitter<void>();

  /**
   * Gets the activities to display (limited by maxDisplay)
   */
  public get displayedActivities(): ActivityItem[] {
    return this.activities.slice(0, this.maxDisplay);
  }

  /**
   * Formats a timestamp for display
   * @param timestamp - The timestamp to format
   * @returns Formatted time string
   */
  public formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Gets the localized label for a status
   * @param status - The status string
   * @returns Localized status label
   */
  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    };
    return labels[status] || status;
  }

  /**
   * TrackBy function for activity items
   * @param _index - The index (unused)
   * @param activity - The activity item
   * @returns The activity ID
   */
  public trackByActivityId(_index: number, activity: ActivityItem): string {
    return activity.id;
  }

  /**
   * Handler for activity item click
   * @param activity - The clicked activity
   */
  public onActivityClick(activity: ActivityItem): void {
    this.activityClick.emit(activity);
  }

  /**
   * Handler for view more button click
   */
  public onViewMore(): void {
    this.viewMore.emit();
  }
}
