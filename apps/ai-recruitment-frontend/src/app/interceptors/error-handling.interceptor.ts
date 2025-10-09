/**
 * Angular HTTP Error Interceptor - Automatic error handling for HTTP requests
 * Integrates with ErrorHandlingService for consistent error management
 */

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ErrorHandlingService } from '../services/error/error-handling.service';

/**
 * Represents the error handling interceptor.
 */
@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {

  /**
   * Initializes a new instance of the Error Handling Interceptor.
   * @param errorHandlingService - The error handling service.
   */
  constructor(private errorHandlingService: ErrorHandlingService) {}

  /**
   * Performs the intercept operation.
   * @param request - The request.
   * @param next - The next.
   * @returns The Observable<HttpEvent<unknown>>.
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      // Retry failed requests based on error type
      retry({
        count: this.getRetryCount(request),
        delay: (error, retryCount) => this.getRetryDelay(error, retryCount, request)
      }),
      
      // Handle errors
      catchError((error: HttpErrorResponse) => {
        const context = {
          component: 'HttpInterceptor',
          action: `${request.method} ${request.url}`,
          url: request.url,
        };

        return this.errorHandlingService.handleHttpError(error, context);
      })
    );
  }

  /**
   * Determine retry count based on request characteristics
   */
  private getRetryCount(request: HttpRequest<unknown>): number {
    // Don't retry POST/PUT/PATCH requests by default (non-idempotent)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return 0;
    }

    // Don't retry authentication requests
    if (request.url.includes('/auth/') || request.url.includes('/login')) {
      return 0;
    }

    // Retry GET requests and other idempotent operations
    return 2;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(
    error: HttpErrorResponse, 
    retryCount: number, 
    request: HttpRequest<unknown>
  ): Observable<number> {
    // Only retry on specific error codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    
    if (!retryableStatusCodes.includes(error.status)) {
      return throwError(() => error);
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount - 1) * 1000;
    
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(delay);
        observer.complete();
      }, delay);
    });
  }
}