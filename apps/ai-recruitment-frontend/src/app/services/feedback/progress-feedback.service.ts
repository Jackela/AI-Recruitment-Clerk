import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Defines the shape of the progress update.
 */
export interface ProgressUpdate {
  id: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  details?: any;
}

/**
 * Defines the shape of the status notification.
 */
export interface StatusNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
  persistent?: boolean;
}

/**
 * Defines the shape of the loading state.
 */
export interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  stage?: string;
}

/**
 * Provides progress feedback functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class ProgressFeedbackService {
  // Progress tracking
  private progressUpdates$ = new BehaviorSubject<ProgressUpdate[]>([]);
  private activeOperations = new Map<string, ProgressUpdate>();

  // Notifications
  private notifications$ = new BehaviorSubject<StatusNotification[]>([]);
  private notificationId = 0;

  // Loading states
  private loadingStates = new Map<string, LoadingState>();
  private globalLoading$ = new BehaviorSubject<LoadingState>({
    isLoading: false,
    message: '',
  });

  // Signals for reactive access
  progressUpdates = signal<ProgressUpdate[]>([]);
  notifications = signal<StatusNotification[]>([]);
  globalLoading = signal<LoadingState>({
    isLoading: false,
    message: '',
  });

  /**
   * Initializes a new instance of the Progress Feedback Service.
   */
  constructor() {
    // Sync BehaviorSubjects with signals
    this.progressUpdates$.subscribe((updates) => {
      this.progressUpdates.set(updates);
    });

    this.notifications$.subscribe((notifications) => {
      this.notifications.set(notifications);
    });

    this.globalLoading$.subscribe((loading) => {
      this.globalLoading.set(loading);
    });
  }

  // Progress tracking methods
  /**
   * Performs the start progress operation.
   * @param id - The id.
   * @param initialMessage - The initial message.
   */
  startProgress(id: string, initialMessage: string): void {
    const update: ProgressUpdate = {
      id,
      stage: 'initializing',
      progress: 0,
      message: initialMessage,
      timestamp: new Date(),
      type: 'info',
    };

    this.activeOperations.set(id, update);
    this.updateProgressList();
  }

  /**
   * Updates progress.
   * @param id - The id.
   * @param progress - The progress.
   * @param message - The message.
   * @param stage - The stage.
   * @param type - The type.
   */
  updateProgress(
    id: string,
    progress: number,
    message: string,
    stage?: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
  ): void {
    const existing = this.activeOperations.get(id);
    if (!existing) return;

    const update: ProgressUpdate = {
      ...existing,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      stage: stage || existing.stage,
      timestamp: new Date(),
      type,
    };

    this.activeOperations.set(id, update);
    this.updateProgressList();

    // Auto-complete if progress reaches 100%
    if (progress >= 100) {
      setTimeout(() => this.completeProgress(id), 1500);
    }
  }

  /**
   * Performs the complete progress operation.
   * @param id - The id.
   * @param finalMessage - The final message.
   */
  completeProgress(id: string, finalMessage?: string): void {
    const existing = this.activeOperations.get(id);
    if (!existing) return;

    const update: ProgressUpdate = {
      ...existing,
      progress: 100,
      message: finalMessage || '完成',
      timestamp: new Date(),
      type: 'success',
    };

    this.activeOperations.set(id, update);
    this.updateProgressList();

    // Remove after delay
    setTimeout(() => {
      this.activeOperations.delete(id);
      this.updateProgressList();
    }, 3000);
  }

  /**
   * Performs the error progress operation.
   * @param id - The id.
   * @param errorMessage - The error message.
   */
  errorProgress(id: string, errorMessage: string): void {
    const existing = this.activeOperations.get(id);
    if (!existing) return;

    const update: ProgressUpdate = {
      ...existing,
      message: errorMessage,
      timestamp: new Date(),
      type: 'error',
    };

    this.activeOperations.set(id, update);
    this.updateProgressList();

    // Remove after delay
    setTimeout(() => {
      this.activeOperations.delete(id);
      this.updateProgressList();
    }, 5000);
  }

  private updateProgressList(): void {
    const updates = Array.from(this.activeOperations.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
    this.progressUpdates$.next(updates);
  }

  // Notification methods
  /**
   * Performs the show notification operation.
   * @param title - The title.
   * @param message - The message.
   * @param type - The type.
   * @param duration - The duration.
   * @param action - The action.
   * @param persistent - The persistent.
   * @returns The string value.
   */
  showNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration = 5000,
    action?: { label: string; handler: () => void },
    persistent = false,
  ): string {
    const id = `notification-${++this.notificationId}`;
    const notification: StatusNotification = {
      id,
      title,
      message,
      type,
      duration,
      action,
      persistent,
    };

    const current = this.notifications$.value;
    this.notifications$.next([...current, notification]);

    // Auto-remove after duration (if not persistent)
    if (!persistent && duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }

    return id;
  }

  /**
   * Removes notification.
   * @param id - The id.
   */
  removeNotification(id: string): void {
    const current = this.notifications$.value;
    const filtered = current.filter((n) => n.id !== id);
    this.notifications$.next(filtered);
  }

  /**
   * Performs the clear all notifications operation.
   */
  clearAllNotifications(): void {
    this.notifications$.next([]);
  }

  // Convenience notification methods
  /**
   * Performs the show success operation.
   * @param title - The title.
   * @param message - The message.
   * @param duration - The duration.
   * @returns The string value.
   */
  showSuccess(title: string, message: string, duration = 4000): string {
    return this.showNotification(title, message, 'success', duration);
  }

  /**
   * Performs the show error operation.
   * @param title - The title.
   * @param message - The message.
   * @param persistent - The persistent.
   * @returns The string value.
   */
  showError(title: string, message: string, persistent = true): string {
    return this.showNotification(
      title,
      message,
      'error',
      0,
      undefined,
      persistent,
    );
  }

  /**
   * Performs the show warning operation.
   * @param title - The title.
   * @param message - The message.
   * @param duration - The duration.
   * @returns The string value.
   */
  showWarning(title: string, message: string, duration = 6000): string {
    return this.showNotification(title, message, 'warning', duration);
  }

  /**
   * Performs the show info operation.
   * @param title - The title.
   * @param message - The message.
   * @param duration - The duration.
   * @returns The string value.
   */
  showInfo(title: string, message: string, duration = 5000): string {
    return this.showNotification(title, message, 'info', duration);
  }

  // Loading state methods
  /**
   * Performs the start loading operation.
   * @param key - The key.
   * @param message - The message.
   * @param progress - The progress.
   */
  startLoading(key: string, message: string, progress?: number): void {
    const state: LoadingState = {
      isLoading: true,
      message,
      progress,
    };

    this.loadingStates.set(key, state);
    this.updateGlobalLoading();
  }

  /**
   * Updates loading.
   * @param key - The key.
   * @param message - The message.
   * @param progress - The progress.
   * @param stage - The stage.
   */
  updateLoading(
    key: string,
    message?: string,
    progress?: number,
    stage?: string,
  ): void {
    const existing = this.loadingStates.get(key);
    if (!existing) return;

    const updated: LoadingState = {
      ...existing,
      message: message || existing.message,
      progress,
      stage,
    };

    this.loadingStates.set(key, updated);
    this.updateGlobalLoading();
  }

  /**
   * Performs the stop loading operation.
   * @param key - The key.
   */
  stopLoading(key: string): void {
    this.loadingStates.delete(key);
    this.updateGlobalLoading();
  }

  private updateGlobalLoading(): void {
    const activeStates = Array.from(this.loadingStates.values());

    if (activeStates.length === 0) {
      this.globalLoading$.next({
        isLoading: false,
        message: '',
      });
      return;
    }

    // Use the most recent loading state
    const latest = activeStates[activeStates.length - 1];
    this.globalLoading$.next(latest);
  }

  // Helper methods
  /**
   * Performs the is operation active operation.
   * @param id - The id.
   * @returns The boolean value.
   */
  isOperationActive(id: string): boolean {
    return this.activeOperations.has(id);
  }

  /**
   * Retrieves operation progress.
   * @param id - The id.
   * @returns The number value.
   */
  getOperationProgress(id: string): number {
    const operation = this.activeOperations.get(id);
    return operation?.progress || 0;
  }

  /**
   * Performs the has active operations operation.
   * @returns The boolean value.
   */
  hasActiveOperations(): boolean {
    return this.activeOperations.size > 0;
  }

  /**
   * Performs the has notifications operation.
   * @returns The boolean value.
   */
  hasNotifications(): boolean {
    return this.notifications$.value.length > 0;
  }

  // Batch operations
  /**
   * Performs the show batch progress operation.
   * @param operations - The operations.
   */
  showBatchProgress(operations: Array<{ id: string; message: string }>): void {
    operations.forEach((op) => {
      this.startProgress(op.id, op.message);
    });
  }

  /**
   * Updates batch progress.
   * @param updates - The updates.
   */
  updateBatchProgress(
    updates: Array<{ id: string; progress: number; message?: string }>,
  ): void {
    updates.forEach((update) => {
      this.updateProgress(
        update.id,
        update.progress,
        update.message || this.activeOperations.get(update.id)?.message || '',
      );
    });
  }

  // Analytics and debugging
  /**
   * Retrieves progress summary.
   * @returns The { active: number; completed: number; averageProgress: number; }.
   */
  getProgressSummary(): {
    active: number;
    completed: number;
    averageProgress: number;
  } {
    const active = this.activeOperations.size;
    const operations = Array.from(this.activeOperations.values());
    const totalProgress = operations.reduce((sum, op) => sum + op.progress, 0);
    const averageProgress = active > 0 ? totalProgress / active : 0;

    return {
      active,
      completed: operations.filter((op) => op.progress === 100).length,
      averageProgress,
    };
  }

  // Reset for testing
  /**
   * Performs the reset operation.
   */
  reset(): void {
    this.activeOperations.clear();
    this.loadingStates.clear();
    this.progressUpdates$.next([]);
    this.notifications$.next([]);
    this.globalLoading$.next({
      isLoading: false,
      message: '',
    });
  }
}
