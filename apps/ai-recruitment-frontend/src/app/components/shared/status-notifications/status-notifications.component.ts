import { Component, computed, OnInit, OnDestroy } from '@angular/core';
// import { signal } from '@angular/core'; // Reserved for future use
import { CommonModule } from '@angular/common';
import {
  ProgressFeedbackService,
  StatusNotification,
} from '../../../services/feedback/progress-feedback.service';
import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators'; // Reserved for future use

/**
 * Represents the status notifications component.
 */
@Component({
  selector: 'arc-status-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container" *ngIf="hasNotifications()">
      <div
        class="notification"
        [class]="getNotificationClasses(notification)"
        *ngFor="
          let notification of notifications();
          trackBy: trackByNotificationId
        "
      >
        <!-- Icon -->
        <div class="notification-icon">
          <span [innerHTML]="getNotificationIcon(notification.type)"></span>
        </div>

        <!-- Content -->
        <div class="notification-content">
          <h4 class="notification-title">{{ notification.title }}</h4>
          <p class="notification-message">{{ notification.message }}</p>

          <!-- Action Button -->
          <button
            class="notification-action"
            *ngIf="notification.action"
            (click)="handleAction(notification)"
            type="button"
          >
            {{ notification.action.label }}
          </button>
        </div>

        <!-- Close Button -->
        <button
          class="notification-close"
          (click)="closeNotification(notification.id)"
          aria-label="关闭通知"
          type="button"
        >
          ✕
        </button>

        <!-- Progress Bar for persistent notifications -->
        <div
          class="notification-progress"
          *ngIf="
            !notification.persistent &&
            notification.duration &&
            notification.duration > 0
          "
        >
          <div
            class="progress-bar"
            [style.animation-duration.ms]="notification.duration"
          ></div>
        </div>
      </div>
    </div>

    <!-- Global Loading Overlay -->
    <div class="global-loading-overlay" *ngIf="globalLoading().isLoading">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-message">{{ globalLoading().message }}</p>
        <div
          class="loading-progress"
          *ngIf="globalLoading().progress !== undefined"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="globalLoading().progress"
            ></div>
          </div>
          <span class="progress-text">{{ globalLoading().progress }}%</span>
        </div>
        <p class="loading-stage" *ngIf="globalLoading().stage">
          {{ globalLoading().stage }}
        </p>
      </div>
    </div>
  `,
  styleUrls: ['./status-notifications.component.css'],
  animations: [],
})
export class StatusNotificationsComponent implements OnInit, OnDestroy {
  // Service state
  notifications = computed(() => this.feedbackService.notifications());
  globalLoading = computed(() => this.feedbackService.globalLoading());

  // Local state
  private destroy$ = new Subject<void>();
  private notificationTimers = new Map<string, number>();

  /**
   * Initializes a new instance of the Status Notifications Component.
   * @param feedbackService - The feedback service.
   */
  constructor(private feedbackService: ProgressFeedbackService) {}

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    // Setup auto-dismiss timers for notifications
    // Note: notifications is a signal, we'll use effect for watching changes
    this.setupNotificationTimers(this.notifications());
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAllTimers();
  }

  private setupNotificationTimers(notifications: StatusNotification[]): void {
    // Clear existing timers
    this.clearAllTimers();

    // Setup new timers
    notifications.forEach((notification) => {
      if (
        !notification.persistent &&
        notification.duration &&
        notification.duration > 0
      ) {
        const timer = window.setTimeout(() => {
          this.feedbackService.removeNotification(notification.id);
        }, notification.duration);

        this.notificationTimers.set(notification.id, timer);
      }
    });
  }

  private clearAllTimers(): void {
    this.notificationTimers.forEach((timer) => {
      window.clearTimeout(timer);
    });
    this.notificationTimers.clear();
  }

  // Component methods
  /**
   * Performs the has notifications operation.
   * @returns The boolean value.
   */
  hasNotifications(): boolean {
    return this.notifications().length > 0;
  }

  /**
   * Performs the close notification operation.
   * @param id - The id.
   */
  closeNotification(id: string): void {
    // Clear timer if exists
    const timer = this.notificationTimers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      this.notificationTimers.delete(id);
    }

    this.feedbackService.removeNotification(id);
  }

  /**
   * Handles action.
   * @param notification - The notification.
   */
  handleAction(notification: StatusNotification): void {
    if (notification.action?.handler) {
      notification.action.handler();
    }

    // Auto-close after action unless persistent
    if (!notification.persistent) {
      this.closeNotification(notification.id);
    }
  }

  /**
   * Retrieves notification classes.
   * @param notification - The notification.
   * @returns The string value.
   */
  getNotificationClasses(notification: StatusNotification): string {
    const classes = ['notification'];
    classes.push(`notification-${notification.type}`);

    if (notification.persistent) {
      classes.push('notification-persistent');
    }

    if (notification.action) {
      classes.push('notification-with-action');
    }

    return classes.join(' ');
  }

  /**
   * Retrieves notification icon.
   * @param type - The type.
   * @returns The string value.
   */
  getNotificationIcon(type: string): string {
    const icons = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  /**
   * Performs the track by notification id operation.
   * @param _index - The index.
   * @param notification - The notification.
   * @returns The string value.
   */
  trackByNotificationId(
    _index: number,
    notification: StatusNotification,
  ): string {
    return notification.id;
  }
}
