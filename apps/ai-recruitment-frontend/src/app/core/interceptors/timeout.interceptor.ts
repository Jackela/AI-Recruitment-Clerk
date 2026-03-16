import { Injectable } from '@angular/core';
import type {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import type { Observable} from 'rxjs';
import { throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { APP_CONFIG } from '../../../config/app.config';

/**
 * HTTP Timeout Interceptor
 * Adds timeout handling to all HTTP requests
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      timeout(APP_CONFIG.API.timeout),
      catchError((error) => {
        if (error.name === 'TimeoutError') {
          return throwError(
            () =>
              new Error(`Request timeout after ${APP_CONFIG.API.timeout}ms`),
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
