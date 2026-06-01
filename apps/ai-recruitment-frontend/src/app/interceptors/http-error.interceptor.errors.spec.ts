import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import type { HttpHandler } from '@angular/common/http';
import { Router } from '@angular/router';
import { defer, lastValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '../../config/app.config';
import { ErrorCorrelationService } from '../services/error/error-correlation.service';
import { I18nService } from '../services/i18n/i18n.service';
import { ToastService } from '../services/toast.service';
import { HttpErrorInterceptor } from './http-error.interceptor';

describe('HttpErrorInterceptor error behavior', () => {
  let interceptor: HttpErrorInterceptor;
  let toast: jest.Mocked<ToastService>;
  let router: jest.Mocked<Router>;
  let correlation: jest.Mocked<ErrorCorrelationService>;
  let originalRetryConfig: {
    maxRetries: number;
    initialDelay: number;
    backoffMultiplier: number;
  };

  const createHttpError = (
    status: number,
    message: string,
  ): HttpErrorResponse =>
    new HttpErrorResponse({
      status,
      statusText: message,
      url: '/api/test',
      error: { message },
    });

  beforeEach(() => {
    sessionStorage.clear();
    originalRetryConfig = {
      maxRetries: APP_CONFIG.ERROR_HANDLING.retryConfig.maxRetries,
      initialDelay: APP_CONFIG.ERROR_HANDLING.retryConfig.initialDelay,
      backoffMultiplier:
        APP_CONFIG.ERROR_HANDLING.retryConfig.backoffMultiplier,
    };
    (
      APP_CONFIG.ERROR_HANDLING.retryConfig as {
        maxRetries: number;
        initialDelay: number;
        backoffMultiplier: number;
      }
    ).maxRetries = 2;
    (
      APP_CONFIG.ERROR_HANDLING.retryConfig as {
        maxRetries: number;
        initialDelay: number;
        backoffMultiplier: number;
      }
    ).initialDelay = 0;

    toast = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
    } as unknown as jest.Mocked<ToastService>;
    router = {
      url: '/dashboard',
      navigate: jest.fn(),
    } as unknown as jest.Mocked<Router>;
    correlation = {
      getCorrelationHeaders: jest.fn(
        () => new Map([['X-Correlation-ID', 'corr-123']]),
      ),
      createStructuredError: jest.fn(
        (
          _error: HttpErrorResponse,
          _category: string,
          _severity: string,
          operation: string,
        ) => ({
          correlationId: `corr-${_error.status || 0}-12345678`,
          errorCode: `HTTP_${_error.status || 0}`,
          message: operation,
        }),
      ),
      reportError: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ErrorCorrelationService>;

    TestBed.configureTestingModule({
      providers: [
        HttpErrorInterceptor,
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
        { provide: ErrorCorrelationService, useValue: correlation },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn((key: string, params?: { status?: number }) => {
              const messages: Record<string, string> = {
                'errors.http.default': `HTTP ${params?.status} failed`,
              };
              return messages[key] ?? key;
            }),
          },
        },
      ],
    });

    interceptor = TestBed.inject(HttpErrorInterceptor);
    jest.spyOn(console, 'group').mockImplementation();
    jest.spyOn(console, 'groupEnd').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    Object.assign(APP_CONFIG.ERROR_HANDLING.retryConfig, originalRetryConfig);
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('shows network connection error message', async () => {
    const next: HttpHandler = {
      handle: () =>
        throwError(() => createHttpError(0, 'Network connection lost')),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(new HttpRequest('POST', '/api'), next),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Network connection lost'),
      APP_CONFIG.UI.notificationDuration.warning,
    );
  });

  it('shows authentication error and redirects to login', async () => {
    const next: HttpHandler = {
      handle: () => throwError(() => createHttpError(401, 'Session expired')),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(new HttpRequest('POST', '/api'), next),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Session expired'),
      APP_CONFIG.UI.notificationDuration.warning,
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'session_expired' },
    });
  });

  it.each([
    [403, 'Forbidden', 'warning'],
    [404, 'Missing', 'info'],
    [500, 'Server failed', 'error'],
  ] as const)(
    'shows user notification for status %s',
    async (status, message, toastMethod) => {
      const next: HttpHandler = {
        handle: () => throwError(() => createHttpError(status, message)),
      };

      await expect(
        lastValueFrom(
          interceptor.intercept(new HttpRequest('POST', '/api'), next),
        ),
      ).rejects.toBeInstanceOf(HttpErrorResponse);

      expect(toast[toastMethod]).toHaveBeenCalledWith(
        expect.stringContaining(message),
        expect.any(Number),
      );
    },
  );

  it('shows rate limit message with backoff', async () => {
    const next: HttpHandler = {
      handle: () => throwError(() => createHttpError(429, 'Too many requests')),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(new HttpRequest('POST', '/api'), next),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Too many requests'),
      APP_CONFIG.UI.notificationDuration.warning,
    );
    expect(
      Number(sessionStorage.getItem('rate_limit_backoff')),
    ).toBeGreaterThan(Date.now());
  });

  it('retries safe HTTP methods on failure', async () => {
    let attempts = 0;
    const next: HttpHandler = {
      handle: () =>
        defer(() => {
          attempts++;
          if (attempts < 3) {
            return throwError(() => createHttpError(503, 'Unavailable'));
          }
          return of(new HttpResponse({ status: 200, body: { ok: true } }));
        }),
    };

    const result = await lastValueFrom(
      interceptor.intercept(new HttpRequest('GET', '/api'), next),
    );

    expect(result).toBeInstanceOf(HttpResponse);
    expect(attempts).toBe(3);
  });

  it('does not retry unsafe HTTP methods', async () => {
    let attempts = 0;
    const next: HttpHandler = {
      handle: () =>
        defer(() => {
          attempts++;
          return throwError(() => createHttpError(500, 'Server failed'));
        }),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(new HttpRequest('POST', '/api'), next),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(attempts).toBe(1);
  });

  it('deduplicates repeated notifications for the same error code', async () => {
    const next: HttpHandler = {
      handle: () => throwError(() => createHttpError(500, 'Server failed')),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(new HttpRequest('POST', '/api'), next),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
    await expect(
      lastValueFrom(
        interceptor.intercept(new HttpRequest('POST', '/api'), next),
      ),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
