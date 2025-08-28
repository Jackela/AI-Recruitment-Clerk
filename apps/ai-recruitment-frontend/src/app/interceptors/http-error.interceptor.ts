import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(
    private toastService: ToastService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      // Retry failed requests once (except for POST/PUT/DELETE)
      retry({
        count: request.method === 'GET' ? 1 : 0,
        delay: 1000
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = '发生了一个错误';
        let userMessage = '';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `客户端错误: ${error.error.message}`;
          userMessage = '网络连接出现问题，请检查您的网络连接';
        } else {
          // Server-side error
          errorMessage = `服务器错误 ${error.status}: ${error.message}`;
          userMessage = this.getErrorMessage(error.status, error);
        }

        // Log error for debugging (only in development mode)
        if (!this.isProduction()) {
          console.error('HTTP Error:', {
            url: request.url,
            method: request.method,
            status: error.status,
            message: errorMessage,
            error: error
          });
        }

        // Show user-friendly error message
        this.showErrorNotification(error.status, userMessage, error);

        // Handle specific error codes
        this.handleSpecificErrors(error.status);

        return throwError(() => error);
      })
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

  private showErrorNotification(status: number, message: string, error: HttpErrorResponse): void {
    // Don't show notifications for cancelled requests
    if (error.status === 0 && error.error instanceof ProgressEvent) {
      return;
    }

    // Show appropriate notification based on severity
    if (status >= 500) {
      // Server errors - show as error with longer duration
      this.toastService.error(message, 8000);
    } else if (status === 401 || status === 403) {
      // Auth errors - show as warning
      this.toastService.warning(message, 6000);
    } else if (status === 404) {
      // Not found - show as info
      this.toastService.info(message, 5000);
    } else if (status > 0) {
      // Other client errors - show as warning
      this.toastService.warning(message, 5000);
    } else {
      // Network errors - show as error
      this.toastService.error(message, 10000);
    }
  }

  private handleSpecificErrors(status: number): void {
    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        // Only redirect if not already on login page
        if (!this.router.url.includes('/login') && !this.router.url.includes('/auth')) {
          sessionStorage.setItem('redirectUrl', this.router.url);
          this.router.navigate(['/login']);
        }
        break;
      case 403:
        // Forbidden - could redirect to unauthorized page
        // this.router.navigate(['/unauthorized']);
        break;
      case 503:
      case 502:
        // Service unavailable - could redirect to maintenance page
        // this.router.navigate(['/maintenance']);
        break;
    }
  }

  private isProduction(): boolean {
    // Check if running in production mode
    // You can also use environment variables here
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.startsWith('127.') &&
           !window.location.hostname.startsWith('192.');
  }
}

// Provider function for app.config.ts
export function provideHttpErrorInterceptor() {
  return {
    provide: 'HTTP_INTERCEPTORS',
    useClass: HttpErrorInterceptor,
    multi: true
  };
}