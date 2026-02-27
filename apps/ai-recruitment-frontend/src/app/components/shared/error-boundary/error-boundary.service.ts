import { Injectable, signal } from '@angular/core';
import type { Router } from '@angular/router';
import type { ToastService } from '../../../services/toast.service';
import type { ErrorInfo } from './error-boundary.component';

/**
 * Service for managing error boundary state and operations.
 * Extracts error handling logic from the component for better testability and reusability.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorBoundaryService {
  // Error state signals
  public readonly hasError = signal(false);
  public readonly errorMessage = signal('页面遇到了一个意外错误。请刷新页面重试。');
  public readonly errorStack = signal<string | undefined>(undefined);
  public readonly errorTimestamp = signal<Date>(new Date());
  public readonly errorUrl = signal<string>('');
  public readonly componentName = signal<string | undefined>(undefined);

  // UI state signals
  public readonly showDetails = signal(false);
  public readonly errorHistory = signal<ErrorInfo[]>([]);

  private readonly router: Router;
  private readonly toastService: ToastService;

  constructor(
    router: Router,
    toastService: ToastService,
  ) {
    this.router = router;
    this.toastService = toastService;
  }

  /**
   * Load error history from session storage.
   */
  public loadErrorHistory(): void {
    const stored = sessionStorage.getItem('app-errors');
    if (stored) {
      try {
        const errors = JSON.parse(stored) as ErrorInfo[];
        this.errorHistory.set(errors);

        // Display the most recent error if any
        if (errors.length > 0) {
          const latestError = errors[errors.length - 1];
          this.displayError(latestError);
        }
      } catch (_e) {
        // Invalid stored data, clear it
        sessionStorage.removeItem('app-errors');
      }
    }
  }

  /**
   * Display an error in the error boundary.
   * @param errorInfo - The error information to display.
   */
  public displayError(errorInfo: ErrorInfo): void {
    this.hasError.set(true);
    this.errorMessage.set(errorInfo.message);
    this.errorStack.set(errorInfo.stack);
    this.errorTimestamp.set(errorInfo.timestamp);
    this.errorUrl.set(errorInfo.url || window.location.href);
    this.componentName.set(errorInfo.componentName);
  }

  /**
   * Reset the error state.
   */
  public resetError(): void {
    this.hasError.set(false);
    this.showDetails.set(false);
  }

  /**
   * Reload the current page.
   */
  public reload(): void {
    window.location.reload();
  }

  /**
   * Navigate to the home page.
   */
  public goHome(): void {
    this.resetError();
    this.router.navigate(['/']);
  }

  /**
   * Toggle the visibility of error details.
   */
  public toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  /**
   * Clear the error history.
   */
  public clearHistory(): void {
    sessionStorage.removeItem('app-errors');
    this.errorHistory.set([]);
    this.toastService.info('错误历史已清除');
  }

  /**
   * Store an error in session storage.
   * @param errorInfo - The error information to store.
   */
  public storeError(errorInfo: ErrorInfo): void {
    const errors = this.getStoredErrors();
    errors.push(errorInfo);

    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.shift();
    }

    sessionStorage.setItem('app-errors', JSON.stringify(errors));
    this.errorHistory.set(errors);
  }

  /**
   * Get stored errors from session storage.
   */
  public getStoredErrors(): ErrorInfo[] {
    const stored = sessionStorage.getItem('app-errors');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Check if running in development environment.
   */
  public isDevelopment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('127.') ||
      window.location.hostname.startsWith('192.')
    );
  }

  /**
   * Categorize an error based on its message.
   * @param error - The error to categorize.
   * @returns The error category.
   */
  public categorizeError(
    error: Error,
  ): 'network' | 'validation' | 'runtime' | 'security' | 'business' {
    const message = error.message?.toLowerCase() || '';

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('xhr')
    ) {
      return 'network';
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 'validation';
    }

    // Security-related errors
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'security';
    }

    // Business logic errors
    if (
      message.includes('business') ||
      message.includes('rule') ||
      message.includes('constraint')
    ) {
      return 'business';
    }

    // Default to runtime errors
    return 'runtime';
  }

  /**
   * Get the severity of an error based on its message.
   * @param error - The error to evaluate.
   * @returns The error severity level.
   */
  public getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message?.toLowerCase() || '';

    // Critical errors that can crash the app
    const criticalPatterns = [
      /out of memory/i,
      /maximum call stack/i,
      /script error/i,
    ];

    // High severity errors that significantly impact functionality
    const highPatterns = [
      /cannot read prop.*undefined/i,
      /cannot read prop.*null/i,
      /is not a function/i,
      /permission denied/i,
    ];

    // Medium severity errors
    const mediumPatterns = [/validation/i, /invalid/i, /not found/i];

    if (criticalPatterns.some((pattern) => pattern.test(message)))
      return 'critical';
    if (highPatterns.some((pattern) => pattern.test(message))) return 'high';
    if (mediumPatterns.some((pattern) => pattern.test(message)))
      return 'medium';

    return 'medium'; // Default
  }

  /**
   * Get notification duration based on severity.
   * @param severity - The error severity level.
   * @returns Duration in milliseconds.
   */
  public getNotificationDuration(severity: string): number {
    switch (severity) {
      case 'critical':
        return 15000;
      case 'high':
        return 12000;
      case 'medium':
        return 8000;
      case 'low':
        return 5000;
      default:
        return 8000;
    }
  }
}
