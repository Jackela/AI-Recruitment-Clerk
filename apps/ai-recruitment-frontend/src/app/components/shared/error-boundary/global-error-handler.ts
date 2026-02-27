import type { ErrorHandler } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import {
  ErrorCorrelationService,
} from '../../../services/error/error-correlation.service';
import type { StructuredError } from '../../../services/error/error-correlation.service';
import type { ErrorInfo } from './error-boundary.component';

/**
 * Global error handler for the application.
 * Implements Angular's ErrorHandler interface to catch unhandled errors.
 * Provides structured error logging, user notifications, and error recovery.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly errorCorrelation = inject(ErrorCorrelationService);

  /**
   * Handles error by logging, reporting, and notifying user.
   * @param error - The error to handle.
   */
  public handleError(error: Error): void {
    try {
      // Create structured error with correlation
      const structuredError = this.errorCorrelation.createStructuredError(
        error,
        this.categorizeError(error),
        this.getSeverity(error),
        'Global Error Handler',
      );

      // Enhanced error logging
      this.logStructuredError(error, structuredError);

      // Parse error information for UI
      const errorInfo = this.parseError(error, structuredError);

      // Report error to backend (async)
      this.errorCorrelation.reportError(structuredError).catch(() => { /* Swallow error silently */ });

      // Show user-friendly error notification
      this.showErrorNotification(errorInfo, structuredError);

      // Store error for error boundary component
      this.storeError(errorInfo);

      // Handle recovery or navigation based on severity
      this.handleErrorRecovery(error, structuredError, errorInfo);
    } catch (handlerError) {
      // Prevent infinite recursion in error handler
      console.error('Error in Global Error Handler:', handlerError);
      this.fallbackErrorHandling(error);
    }
  }

  private parseError(
    error: Error,
    structuredError: StructuredError,
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      message: structuredError.message || error.message || '发生了未知错误',
      stack: error.stack,
      timestamp: structuredError.context.timestamp,
      url: structuredError.context.url,
      correlationId: structuredError.correlationId,
      severity: structuredError.severity,
      category: structuredError.category,
      recoverable: structuredError.recoverable,
    };

    // Enhanced component name extraction
    if (error.stack) {
      const componentMatch = error.stack.match(
        /at (\w+(?:Component|Service|Directive|Pipe))/,
      );
      if (componentMatch) {
        errorInfo.componentName = componentMatch[1];
      }
    }

    return errorInfo;
  }

  private showErrorNotification(
    errorInfo: ErrorInfo,
    _structuredError: StructuredError,
  ): void {
    let message = errorInfo.message;

    // Add context for better user understanding
    if (errorInfo.componentName) {
      message = `组件错误 (${errorInfo.componentName}): ${message}`;
    } else if (errorInfo.category) {
      const categoryNames: Record<string, string> = {
        runtime: '运行时',
        network: '网络',
        validation: '验证',
        security: '安全',
        business: '业务',
      };
      message = `${categoryNames[errorInfo.category] || ''}错误: ${message}`;
    } else {
      message = `应用错误: ${message}`;
    }

    // Add correlation ID in development for debugging
    if (this.isDevelopment() && errorInfo.correlationId) {
      message += ` (ID: ${errorInfo.correlationId.slice(-8)})`;
    }

    // Show appropriate notification based on severity
    const duration = this.getNotificationDuration(
      errorInfo.severity || 'medium',
    );

    switch (errorInfo.severity) {
      case 'critical':
        this.toastService.error(message, duration);
        break;
      case 'high':
        this.toastService.error(message, duration);
        break;
      case 'medium':
        this.toastService.warning(message, duration);
        break;
      case 'low':
        this.toastService.info(message, duration);
        break;
      default:
        this.toastService.error(message, duration);
    }
  }

  private storeError(errorInfo: ErrorInfo): void {
    // Store error in session storage for error boundary component
    const errors = this.getStoredErrors();
    errors.push(errorInfo);

    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.shift();
    }

    sessionStorage.setItem('app-errors', JSON.stringify(errors));
  }

  private getStoredErrors(): ErrorInfo[] {
    const stored = sessionStorage.getItem('app-errors');
    return stored ? JSON.parse(stored) : [];
  }

  private categorizeError(
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

  private getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
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

  private logStructuredError(
    error: Error,
    structuredError: StructuredError,
  ): void {
    if (!this.isDevelopment()) return;

    console.group(`🔴 Global Error - ${structuredError.correlationId}`);
    console.error('Original Error:', error);
    console.error('Structured Error:', structuredError);
    console.error('Context:', structuredError.context);
    if (structuredError.stack) {
      console.error('Stack Trace:', structuredError.stack);
    }
    console.groupEnd();
  }

  private handleErrorRecovery(
    _error: Error,
    structuredError: StructuredError,
    errorInfo: ErrorInfo,
  ): void {
    // Navigate to error page for critical errors
    if (structuredError.severity === 'critical') {
      this.router.navigate(['/error'], {
        queryParams: {
          correlationId: structuredError.correlationId,
          message: errorInfo.message,
          timestamp: errorInfo.timestamp.toISOString(),
          recoverable: structuredError.recoverable.toString(),
        },
      });
    }
    // For recoverable errors, attempt automatic recovery
    else if (structuredError.recoverable) {
      this.attemptErrorRecovery(structuredError);
    }
  }

  private attemptErrorRecovery(structuredError: StructuredError): void {
    console.log(
      'Attempting error recovery for:',
      structuredError.correlationId,
    );

    // Implement recovery strategies based on error category
    switch (structuredError.category) {
      case 'network':
        // For network errors, could retry or show offline indicator
        console.log('Network error recovery: checking connectivity');
        break;
      case 'validation':
        // For validation errors, could reset form state
        console.log('Validation error recovery: resetting state');
        break;
      case 'runtime':
        // For runtime errors, could refresh component state
        console.log('Runtime error recovery: refreshing state');
        break;
    }
  }

  private fallbackErrorHandling(originalError: Error): void {
    // Last resort error handling when structured approach fails
    console.error('Fallback Error Handler:', originalError);

    // Simple error storage
    try {
      const simpleError = {
        message: originalError.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };
      sessionStorage.setItem('last_error', JSON.stringify(simpleError));
    } catch (_e) {
      // Even storage failed, nothing we can do
    }

    // Simple user notification
    this.toastService.error('系统发生错误，请刷新页面', 10000);
  }

  private getNotificationDuration(severity: string): number {
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

  private isDevelopment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('127.') ||
      window.location.hostname.startsWith('192.')
    );
  }
}
