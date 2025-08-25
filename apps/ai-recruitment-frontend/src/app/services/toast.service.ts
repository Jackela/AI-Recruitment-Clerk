import { Injectable } from '@angular/core';
import { ProgressFeedbackService } from './feedback/progress-feedback.service';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<ToastMessage[]>([]);
  private activeToastIds: string[] = [];

  constructor(private progressFeedback: ProgressFeedbackService) {}

  success(message: string, duration = 3000): void {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration = 5000): void {
    this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration = 4000): void {
    this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration = 3000): void {
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
      false
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

  getToasts(): ToastMessage[] {
    return this.toasts$.value;
  }

  getToasts$(): Observable<ToastMessage[]> {
    return this.toasts$.asObservable();
  }

  clear(): void {
    this.toasts$.next([]);
    // Clear all notifications from ProgressFeedbackService
    this.progressFeedback.clearAllNotifications();
    this.activeToastIds = [];
  }
}