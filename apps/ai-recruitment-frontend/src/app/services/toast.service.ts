import { Injectable, inject } from '@angular/core';
import { ProgressFeedbackService } from './feedback/progress-feedback.service';
import type { Observable} from 'rxjs';
import { BehaviorSubject } from 'rxjs';

/**
 * Defines the shape of the toast message.
 */
export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * Provides toast functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts$ = new BehaviorSubject<ToastMessage[]>([]);
  private activeToastIds: string[] = [];

  private progressFeedback = inject(ProgressFeedbackService);

  /**
   * Performs the success operation.
   * @param message - The message.
   * @param duration - The duration.
   */
  public success(message: string, duration = 3000): void {
    this.show({ message, type: 'success', duration });
  }

  /**
   * Performs the error operation.
   * @param message - The message.
   * @param duration - The duration.
   */
  public error(message: string, duration = 5000): void {
    this.show({ message, type: 'error', duration });
  }

  /**
   * Performs the warning operation.
   * @param message - The message.
   * @param duration - The duration.
   */
  public warning(message: string, duration = 4000): void {
    this.show({ message, type: 'warning', duration });
  }

  /**
   * Performs the info operation.
   * @param message - The message.
   * @param duration - The duration.
   */
  public info(message: string, duration = 3000): void {
    this.show({ message, type: 'info', duration });
  }

  private show(toast: ToastMessage): void {
    // Update local toast array for backward compatibility
    const currentToasts = this.toasts$.value;
    this.toasts$.next([...currentToasts, toast]);

    // Use ProgressFeedbackService for actual UI notification
    const title = this.getTitle(toast.type);
    const notificationId = this.progressFeedback.showNotification(
      title,
      toast.message,
      toast.type,
      toast.duration || 5000,
      undefined,
      false,
    );

    this.activeToastIds.push(notificationId);

    // Auto-remove from local array after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, toast.duration);
    }
  }

  private getTitle(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success':
        return '成功';
      case 'error':
        return '错误';
      case 'warning':
        return '警告';
      case 'info':
        return '信息';
      default:
        return '通知';
    }
  }

  private remove(toast: ToastMessage): void {
    const currentToasts = this.toasts$.value;
    const index = currentToasts.indexOf(toast);
    if (index > -1) {
      const newToasts = [...currentToasts];
      newToasts.splice(index, 1);
      this.toasts$.next(newToasts);
    }
  }

  /**
   * Retrieves toasts.
   * @returns The an array of ToastMessage.
   */
  public getToasts(): ToastMessage[] {
    return this.toasts$.value;
  }

  /**
   * Retrieves toasts$.
   * @returns The Observable<ToastMessage[]>.
   */
  public getToasts$(): Observable<ToastMessage[]> {
    return this.toasts$.asObservable();
  }

  /**
   * Performs the clear operation.
   */
  public clear(): void {
    this.toasts$.next([]);
    // Clear all notifications from ProgressFeedbackService
    this.progressFeedback.clearAllNotifications();
    this.activeToastIds = [];
  }
}
