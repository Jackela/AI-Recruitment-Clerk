/**
 * Angular Error Handling Service - Frontend error management
 * Provides consistent error handling, user notifications, and error reporting
 */

import { Injectable, ErrorHandler, Injector, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { ToastService } from '../toast.service';

// Interfaces for standardized error responses from backend
/**
 * Defines the shape of the standardized error response.
 */
export interface StandardizedErrorResponse {
  success: false;
  error: {
    type: string;
    code: string;
    message: string;
    userMessage: string;
    timestamp: string;
    traceId?: string;
    requestId?: string;
    severity: string;
  };
  context: {
    path?: string;
    method?: string;
    serviceName?: string;
    operationName?: string;
    ip?: string;
  };
  correlation?: {
    traceId?: string;
    requestId?: string;
    spanId?: string;
    parentSpanId?: string;
  };
  recovery?: {
    strategies: string[];
    suggestions: string[];
    retryable: boolean;
  };
  impact?: {
    business: string;
    user: string;
  };
  details?: unknown;
}

/**
 * Defines the shape of the error context.
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  timestamp: Date;
  userAgent: string;
  additionalContext?: Record<string, unknown>;
}

/**
 * Defines the shape of the error notification.
 */
export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  userMessage?: string;
  timestamp: Date;
  acknowledged: boolean;
  retryable: boolean;
  recoveryStrategies: string[];
  traceId?: string;
}

/**
 * Provides error handling functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService implements ErrorHandler {
  private readonly errors$ = new BehaviorSubject<ErrorNotification[]>([]);
  private router?: Router;
  private toastService?: ToastService;
  private readonly injector = inject(Injector);

  /**
   * Initializes a new instance of the Error Handling Service.
   * @param injector - The injector.
   */
  constructor() {
    // Lazy inject to avoid circular dependencies
    setTimeout(() => {
      try {
        this.router = this.injector.get(Router);
        this.toastService = this.injector.get(ToastService);
      } catch (error) {
        console.warn('Could not inject Router or ToastService:', error);
      }
    });
  }

  /**
   * Angular ErrorHandler implementation
   */
  handleError(error: unknown): void {
    const errorContext = this.createErrorContext();

    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error, errorContext);
    } else if (error instanceof Error) {
      this.handleJavaScriptError(error, errorContext);
    } else {
      this.handleUnknownError(error, errorContext);
    }

    // Log to console in development
    if (!this.isProduction()) {
      console.error('Unhandled error:', error);
    }
  }

  /**
   * Handle HTTP errors from API calls
   */
  handleHttpError(
    httpError: HttpErrorResponse,
    context?: Partial<ErrorContext>,
  ): Observable<never> {
    const errorContext = { ...this.createErrorContext(), ...context };

    // Check if it's a standardized error response
    if (this.isStandardizedError(httpError.error)) {
      this.processStandardizedError(httpError.error, errorContext);
    } else {
      this.processGenericHttpError(httpError, errorContext);
    }

    return throwError(() => httpError);
  }

  /**
   * Handle JavaScript runtime errors
   */
  handleJavaScriptError(error: Error, context?: Partial<ErrorContext>): void {
    const errorContext = { ...this.createErrorContext(), ...context };

    const notification: ErrorNotification = {
      id: this.generateErrorId(),
      type: 'error',
      title: 'Application Error',
      message: error.message,
      userMessage:
        'An unexpected error occurred. Please refresh the page and try again.',
      timestamp: new Date(),
      acknowledged: false,
      retryable: true,
      recoveryStrategies: [
        'Refresh the page',
        'Clear browser cache',
        'Try again in a few moments',
        'Contact support if problem persists',
      ],
    };

    this.addErrorNotification(notification);
    this.showUserNotification(notification);
    this.logError(error, errorContext);
  }

  /**
   * Handle unknown errors
   */
  handleUnknownError(error: unknown, context?: Partial<ErrorContext>): void {
    const errorContext = { ...this.createErrorContext(), ...context };

    const notification: ErrorNotification = {
      id: this.generateErrorId(),
      type: 'error',
      title: 'Unknown Error',
      message: String(error),
      userMessage: 'An unexpected error occurred. Please try again.',
      timestamp: new Date(),
      acknowledged: false,
      retryable: true,
      recoveryStrategies: [
        'Try the operation again',
        'Refresh the page',
        'Contact support if needed',
      ],
    };

    this.addErrorNotification(notification);
    this.showUserNotification(notification);
    this.logError(error, errorContext);
  }

  /**
   * Process standardized error response from backend
   */
  private processStandardizedError(
    errorResponse: StandardizedErrorResponse,
    context: ErrorContext,
  ): void {
    const notification: ErrorNotification = {
      id: this.generateErrorId(),
      type: this.mapSeverityToType(errorResponse.error.severity),
      title: this.formatErrorTitle(errorResponse.error.type),
      message: errorResponse.error.message,
      userMessage: errorResponse.error.userMessage,
      timestamp: new Date(),
      acknowledged: false,
      retryable: errorResponse.recovery?.retryable || false,
      recoveryStrategies: errorResponse.recovery?.strategies || [],
      traceId: errorResponse.error.traceId,
    };

    this.addErrorNotification(notification);
    this.showUserNotification(notification);
    this.handleSpecialErrorTypes(errorResponse, context);
  }

  /**
   * Process generic HTTP error
   */
  private processGenericHttpError(
    httpError: HttpErrorResponse,
    context: ErrorContext,
  ): void {
    const notification: ErrorNotification = {
      id: this.generateErrorId(),
      type: 'error',
      title: `HTTP ${httpError.status} Error`,
      message: httpError.message,
      userMessage: this.getGenericHttpErrorMessage(httpError.status),
      timestamp: new Date(),
      acknowledged: false,
      retryable: this.isRetryableHttpStatus(httpError.status),
      recoveryStrategies: this.getGenericRecoveryStrategies(httpError.status),
    };

    this.addErrorNotification(notification);
    this.showUserNotification(notification);
    this.handleSpecialHttpErrors(httpError, context);
  }

  /**
   * Handle special error types that require specific actions
   */
  private handleSpecialErrorTypes(
    errorResponse: StandardizedErrorResponse,
    context: ErrorContext,
  ): void {
    switch (errorResponse.error.type) {
      case 'AUTHENTICATION_ERROR':
        this.handleAuthenticationError(errorResponse, context);
        break;
      case 'AUTHORIZATION_ERROR':
        this.handleAuthorizationError(errorResponse, context);
        break;
      case 'RATE_LIMIT_ERROR':
        this.handleRateLimitError(errorResponse, context);
        break;
      case 'VALIDATION_ERROR':
        this.handleValidationError(errorResponse, context);
        break;
    }
  }

  /**
   * Handle special HTTP error codes
   */
  private handleSpecialHttpErrors(
    httpError: HttpErrorResponse,
    _context: ErrorContext,
  ): void {
    switch (httpError.status) {
      case 401:
        this.redirectToLogin();
        break;
      case 403:
        this.handleAccessDenied();
        break;
      case 429:
        this.handleRateLimit();
        break;
      case 503:
        this.handleServiceUnavailable();
        break;
    }
  }

  /**
   * Authentication error handling
   */
  private handleAuthenticationError(
    _errorResponse: StandardizedErrorResponse,
    _context: ErrorContext,
  ): void {
    // Clear user session
    localStorage.removeItem('auth_token');
    sessionStorage.clear();

    // Redirect to login
    this.redirectToLogin();
  }

  /**
   * Authorization error handling
   */
  private handleAuthorizationError(
    _errorResponse: StandardizedErrorResponse,
    _context: ErrorContext,
  ): void {
    // Show access denied message
    this.showAccessDeniedMessage();
  }

  /**
   * Rate limit error handling
   */
  private handleRateLimitError(
    errorResponse: StandardizedErrorResponse,
    _context: ErrorContext,
  ): void {
    const resetTime = errorResponse.details?.resetTime;
    if (resetTime) {
      this.showRateLimitMessage(new Date(resetTime));
    }
  }

  /**
   * Validation error handling
   */
  private handleValidationError(
    errorResponse: StandardizedErrorResponse,
    _context: ErrorContext,
  ): void {
    // Validation errors are usually handled by forms
    // Just show the user message
    if (this.toastService) {
      this.toastService.error(errorResponse.error.userMessage);
    }
  }

  /**
   * Get error notifications observable
   */
  getErrors(): Observable<ErrorNotification[]> {
    return this.errors$.asObservable();
  }

  /**
   * Acknowledge error notification
   */
  acknowledgeError(errorId: string): void {
    const errors = this.errors$.value;
    const errorIndex = errors.findIndex((e) => e.id === errorId);

    if (errorIndex !== -1) {
      errors[errorIndex].acknowledged = true;
      this.errors$.next([...errors]);
    }
  }

  /**
   * Clear all error notifications
   */
  clearErrors(): void {
    this.errors$.next([]);
  }

  /**
   * Clear specific error notification
   */
  clearError(errorId: string): void {
    const errors = this.errors$.value.filter((e) => e.id !== errorId);
    this.errors$.next(errors);
  }

  /**
   * Retry operation with error handling
   */
  retryOperation<T>(
    operation: () => Observable<T>,
    errorId: string,
  ): Observable<T> {
    this.clearError(errorId);
    return operation();
  }

  // Private helper methods

  private isStandardizedError(
    error: unknown,
  ): error is StandardizedErrorResponse {
    if (
      typeof error !== 'object' ||
      error === null ||
      (error as Partial<StandardizedErrorResponse>).success !== false
    ) {
      return false;
    }
    const response = error as Partial<StandardizedErrorResponse>;
    return (
      typeof response.error?.type === 'string' &&
      typeof response.error.code === 'string'
    );
  }

  private createErrorContext(): ErrorContext {
    return {
      url: window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
    };
  }

  private addErrorNotification(notification: ErrorNotification): void {
    const errors = this.errors$.value;
    errors.unshift(notification);

    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.splice(10);
    }

    this.errors$.next([...errors]);
  }

  private showUserNotification(notification: ErrorNotification): void {
    if (this.toastService) {
      switch (notification.type) {
        case 'error':
          this.toastService.error(
            notification.userMessage || notification.message,
          );
          break;
        case 'warning':
          this.toastService.warning(
            notification.userMessage || notification.message,
          );
          break;
        case 'info':
          this.toastService.info(
            notification.userMessage || notification.message,
          );
          break;
      }
    }
  }

  private mapSeverityToType(severity: string): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }

  private formatErrorTitle(errorType: string): string {
    return errorType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private getGenericHttpErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: '请求无效，请检查输入信息',
      401: '身份验证失败，请重新登录',
      403: '您没有权限执行此操作',
      404: '请求的资源不存在',
      409: '操作冲突，请刷新页面后重试',
      429: '请求过于频繁，请稍后再试',
      500: '服务器内部错误，请稍后重试',
      502: '服务暂时不可用，请稍后重试',
      503: '服务维护中，请稍后重试',
      504: '请求超时，请稍后重试',
    };

    return messages[status] || '发生未知错误，请稍后重试';
  }

  private isRetryableHttpStatus(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  private getGenericRecoveryStrategies(status: number): string[] {
    const strategies: Record<number, string[]> = {
      400: ['检查输入格式', '确认所有必填字段', '验证数据类型'],
      401: ['重新登录', '检查账户状态', '清除浏览器缓存'],
      403: ['联系管理员获取权限', '检查账户权限', '尝试其他操作'],
      404: ['检查URL地址', '刷新页面', '使用搜索功能'],
      429: ['等待片刻后重试', '减少请求频率', '联系管理员'],
      500: ['稍后重试', '刷新页面', '联系技术支持'],
      502: ['稍后重试', '检查网络连接', '联系技术支持'],
      503: ['稍后重试', '检查服务状态', '联系技术支持'],
      504: ['稍后重试', '检查网络连接', '减少请求数据量'],
    };

    return strategies[status] || ['刷新页面', '稍后重试', '联系技术支持'];
  }

  private redirectToLogin(): void {
    if (this.router) {
      this.router.navigate(['/login']);
    } else {
      window.location.href = '/login';
    }
  }

  private handleAccessDenied(): void {
    if (this.toastService) {
      this.toastService.error('您没有权限执行此操作');
    }
  }

  private handleRateLimit(): void {
    if (this.toastService) {
      this.toastService.warning('请求过于频繁，请稍后再试');
    }
  }

  private handleServiceUnavailable(): void {
    if (this.toastService) {
      this.toastService.error('服务暂时不可用，请稍后重试');
    }
  }

  private showAccessDeniedMessage(): void {
    if (this.toastService) {
      this.toastService.error('访问被拒绝，请联系管理员');
    }
  }

  private showRateLimitMessage(resetTime: Date): void {
    if (this.toastService) {
      this.toastService.warning(
        `请求限制，请在 ${resetTime.toLocaleTimeString()} 后重试`,
      );
    }
  }

  private logError(error: unknown, context: ErrorContext): void {
    // In production, send to logging service
    if (this.isProduction()) {
      this.sendToLoggingService(error, context);
    } else {
      console.error('Error logged:', { error, context });
    }
  }

  private sendToLoggingService(
    _error: unknown,
    _context: ErrorContext,
  ): void {
    // Implementation for sending errors to logging service
    // This could be an HTTP call to your logging endpoint
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    return sessionStorage.getItem('session_id') || 'anonymous';
  }

  private isProduction(): boolean {
    return false; // Replace with actual environment check
  }
}
