import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ActivityItem } from '../../services/mobile/mobile-dashboard.service';

/**
 * Represents the mobile activity list component.
 * Displays recent activity items in a scrollable list.
 */
@Component({
  selector: 'arc-mobile-activity-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recent-activity" *ngIf="activities.length > 0">
      <h2 class="section-title">Recent Activity</h2>
      <div class="activity-list">
        <div
          *ngFor="let activity of activities"
          class="activity-item"
          (click)="onActivityClick(activity)"
          (keydown.enter)="onActivityClick(activity)"
          (keydown.space)="onActivityClick(activity)"
          tabindex="0"
          role="button"
        >
          <div
            class="activity-icon"
            [class]="'activity-icon--' + activity.type"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path [attr.d]="activity.icon" />
            </svg>
          </div>
          <div class="activity-content">
            <div class="activity-title">{{ activity.title }}</div>
            <div class="activity-subtitle">{{ activity.subtitle }}</div>
            <div class="activity-time">{{ activity.timeAgo }}</div>
          </div>
          <div class="activity-action">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .recent-activity {
        margin-bottom: var(--spacing-6, 1.5rem);

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 12px 0;
        }
      }

      .activity-list {
        background: var(--color-surface, white);
        border-radius: var(--border-radius-lg, 12px);
        overflow: hidden;
        box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #f1f3f4;
          cursor: pointer;
          transition: background-color 0.2s ease;

          &:last-child {
            border-bottom: none;
          }

          &:active {
            background-color: #f8f9fa;
          }

          .activity-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            &--success {
              background: rgba(40, 167, 69, 0.1);
              color: #28a745;
            }

            &--info {
              background: rgba(52, 152, 219, 0.1);
              color: #3498db;
            }

            &--warning {
              background: rgba(255, 193, 7, 0.1);
              color: #ffc107;
            }

            &--error {
              background: rgba(231, 76, 60, 0.1);
              color: #e74c3c;
            }
          }

          .activity-content {
            flex: 1;
            min-width: 0;

            .activity-title {
              font-size: 14px;
              font-weight: 500;
              color: #2c3e50;
              margin-bottom: 2px;
            }

            .activity-subtitle {
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 2px;
            }

            .activity-time {
              font-size: 11px;
              color: #95a5a6;
            }
          }

          .activity-action {
            color: #95a5a6;
            flex-shrink: 0;
          }
        }
      }
    `,
  ],
})
export class MobileActivityListComponent {
  @Input({ required: true })
  public activities!: ActivityItem[];

  @Output()
  public activityClick = new EventEmitter<ActivityItem>();

  public onActivityClick(activity: ActivityItem): void {
    this.activityClick.emit(activity);
  }
}
