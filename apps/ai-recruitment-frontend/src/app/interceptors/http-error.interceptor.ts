import { Injectable } from '@angular/core';
import type {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import type { Observable} from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import type { ToastService } from '../services/toast.service';
import type { Router } from '@angular/router';
import type { ErrorCorrelationService } from '../services/error/error-correlation.service';
import { APP_CONFIG } from '../../config/app.config';

/**
 * Represents the http error interceptor.
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  /**
   * Initializes a new instance of the Http Error Interceptor.
   * @param toastService - The toast service.
   * @param router - The router.
   * @param errorCorrelation - The error correlation.
   */
  constructor(
    private toastService: ToastService,
    private router: Router,
    private errorCorrelation: ErrorCorrelationService,
  ) {}

  /**
   * Performs the intercept operation.
   * @param request - The request.
   * @param next - The next.
   * @returns The Observable<HttpEvent<any>>.
   */
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // Add correlation headers to outgoing requests
    const correlatedRequest = request.clone({
      setHeaders: {
        ...Object.fromEntries(
          this.errorCorrelation
            .getCorrelationHeaders()
            .keys()
            .map((key) => [
              key,
              this.errorCorrelation.getCorrelationHeaders().get(key)!,
            ]),
        ),
      },
    });

    return next.handle(correlatedRequest).pipe(
      // Add timeout
      timeout(APP_CONFIG.API.timeout),

      // Retry failed requests with exponential backoff
      retry({
        count: this.getRetryCount(request.method),
        delay: (_error: any, retryIndex: number) => {
          const delayMs =
            APP_CONFIG.ERROR_HANDLING.retryConfig.initialDelay *
            Math.pow(
              APP_CONFIG.ERROR_HANDLING.retryConfig.backoffMultiplier,
              retryIndex - 1,
            );
          return new Promise((resolve) => setTimeout(resolve, delayMs));
        },
      }) as any,
      catchError((error: HttpErrorResponse) => {
        // Create structured error with correlation
        const structuredError = this.errorCorrelation.createStructuredError(
          error,
          'network',
          this.getErrorSeverity(error.status),
          `HTTP ${request.method} to ${request.url}`,
        );

        // Enhanced error logging with correlation
        this.logError(request, error, structuredError);

        // Report error to backend (async)
        this.errorCorrelation.reportError(structuredError).catch(() => {});

        // Show user-friendly notification
        const userMessage = this.getErrorMessage(error.status, error);
        this.showErrorNotification(
          error.status,
          userMessage,
          error,
          structuredError,
        );

        // Handle specific error codes
        this.handleSpecificErrors(error.status, structuredError);

        return throwError(() => error);
      }),
    );
  }

  private getErrorMessage(status: number, error: HttpErrorResponse): string {
    // Try to get error message from response body first
    if (error.error?.message) {
      return error.error.message;
    }

    // Fall back to status-based messages
    switch (status) {
      case 0:
        return '无法连接到服务器，请检查您的网络连接';
      case 400:
        return '请求参数错误，请检查输入信息';
      case 401:
        return '您的登录已过期，请重新登录';
      case 403:
        return '您没有权限执行此操作';
      case 404:
        return '请求的资源不存在';
      case 409:
        return '数据冲突，请刷新页面后重试';
      case 422:
        return '提交的数据验证失败';
      case 429:
        return '请求过于频繁，请稍后再试';
      case 500:
        return '服务器内部错误，请稍后再试';
      case 502:
        return '网关错误，服务暂时不可用';
      case 503:
        return '服务暂时不可用，请稍后再试';
      case 504:
        return '请求超时，请稍后再试';
      default:
        return `服务器错误 (${status})，请稍后再试`;
    }
  }

  private showErrorNotification(
    status: number,
    message: string,
    error: HttpErrorResponse,
    structuredError: any,
  ): void {
    // Don't show notifications for cancelled requests or aborted requests
    if (
      error.status === 0 &&
      (error.error instanceof ProgressEvent ||
        String(error.name) === 'TimeoutError')
    ) {
      return;
    }

    // Don't spam notifications for the same error
    if (!this.shouldShowNotification(structuredError)) {
      return;
    }

    // Enhanced message with correlation ID in development
    const enhancedMessage = this.isDevelopment()
      ? `${message} (ID: ${structuredError.correlationId.slice(-8)})`
      : message;

    // Show appropriate notification based on severity
    const duration = this.getNotificationDuration(status);

    if (status >= 500) {
      this.toastService.error(enhancedMessage, duration);
    } else if (status === 401 || status === 403) {
      this.toastService.warning(enhancedMessage, duration);
    } else if (status === 404) {
      this.toastService.info(enhancedMessage, duration);
    } else if (status > 0) {
      this.toastService.warning(enhancedMessage, duration);
    } else {
      this.toastService.error(enhancedMessage, duration);
    }
  }

  private handleSpecificErrors(status: number, structuredError: any): void {
    switch (status) {
      case 401:
        // Unauthorized - redirect to login with correlation context
        if (
          !this.router.url.includes('/login') &&
          !this.router.url.includes('/auth')
        ) {
          sessionStorage.setItem('redirectUrl', this.router.url);
          sessionStorage.setItem(
            'authErrorCorrelationId',
            structuredError.correlationId,
          );
          this.router.navigate(['/login'], {
            queryParams: { reason: 'session_expired' },
          });
        }
        break;
      case 403:
        // Forbidden - log security event
        console.warn('Access forbidden:', {
          correlationId: structuredError.correlationId,
          url: this.router.url,
          timestamp: new Date().toISOString(),
        });
        break;
      case 429:
        // Rate limited - implement exponential backoff
        this.handleRateLimit(structuredError);
        break;
      case 503:
      case 502:
        // Service unavailable - check for maintenance mode
        this.checkMaintenanceMode(structuredError);
        break;
    }
  }

  private getRetryCount(method: string): number {
    // Don't retry unsafe methods
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return unsafeMethods.includes(method.toUpperCase())
      ? 0
      : APP_CONFIG.ERROR_HANDLING.retryConfig.maxRetries;
  }

  private getErrorSeverity(
    status: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (status >= 500) return 'high';
    if (status === 401 || status === 403) return 'medium';
    if (status === 429) return 'medium';
    if (status >= 400) return 'low';
    return 'medium';
  }

  private logError(
    request: HttpRequest<any>,
    error: HttpErrorResponse,
    structuredError: any,
  ): void {
    if (!this.isDevelopment()) return;

    console.group(
      `🚨 HTTP Error ${error.status} - ${structuredError.correlationId}`,
    );
    console.error('Request:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(
        request.headers.keys().map((key) => [key, request.headers.get(key)]),
      ),
    });
    console.error('Response:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error,
    });
    console.error('Structured Error:', structuredError);
    console.groupEnd();
  }

  private shouldShowNotification(structuredError: any): boolean {
    // Prevent notification spam for same error within 5 seconds
    const lastNotificationKey = `last_notification_${structuredError.errorCode}`;
    const lastTime = parseInt(
      sessionStorage.getItem(lastNotificationKey) || '0',
    );
    const now = Date.now();

    if (now - lastTime < 5000) {
      return false;
    }

    sessionStorage.setItem(lastNotificationKey, now.toString());
    return true;
  }

  private getNotificationDuration(status: number): number {
    const durations = APP_CONFIG.UI.notificationDuration;
    if (status >= 500) return durations.error;
    if (status === 401 || status === 403) return durations.warning;
    if (status === 404) return durations.info;
    return durations.warning;
  }

  private handleRateLimit(structuredError: any): void {
    // Store rate limit event for exponential backoff
    const rateLimitKey = 'rate_limit_backoff';
    const backoffTime = Math.min(
      30000,
      Math.pow(2, this.getRateLimitAttempts()) * 1000,
    );

    sessionStorage.setItem(rateLimitKey, (Date.now() + backoffTime).toString());
    this.incrementRateLimitAttempts();

    console.warn(
      'Rate limited, backing off for:',
      backoffTime + 'ms',
      structuredError,
    );
  }

  private checkMaintenanceMode(structuredError: any): void {
    // Check if this might be a maintenance mode
    const maintenanceIndicators = ['maintenance', 'scheduled', 'downtime'];
    const errorMessage = structuredError.message.toLowerCase();

    if (
      maintenanceIndicators.some((indicator) =>
        errorMessage.includes(indicator),
      )
    ) {
      console.info('Possible maintenance mode detected:', structuredError);
      // Could redirect to maintenance page or show special message
    }
  }

  private getRateLimitAttempts(): number {
    return parseInt(sessionStorage.getItem('rate_limit_attempts') || '0');
  }

  private incrementRateLimitAttempts(): void {
    const current = this.getRateLimitAttempts();
    sessionStorage.setItem('rate_limit_attempts', (current + 1).toString());
  }

  private isDevelopment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('127.') ||
      window.location.hostname.startsWith('192.')
    );
  }
}

// Provider function for app.config.ts
/**
 * Performs the provide http error interceptor operation.
 * @returns The result of the operation.
 */
export function provideHttpErrorInterceptor() {
  return {
    provide: 'HTTP_INTERCEPTORS',
    useClass: HttpErrorInterceptor,
    multi: true,
  };
}
