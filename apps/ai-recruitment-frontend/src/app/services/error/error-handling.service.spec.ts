import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  ErrorHandlingService,
  StandardizedErrorResponse,
} from './error-handling.service';
import { ToastService } from '../toast.service';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  const toastService = {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  };
  const router = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlingService,
        { provide: ToastService, useValue: toastService },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(ErrorHandlingService);
    jest.runAllTimers(); // allow lazy injector to resolve Router and ToastService
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles standardized rate limit errors with warning and retry hint', () => {
    const standardError: StandardizedErrorResponse = {
      success: false,
      error: {
        type: 'RATE_LIMIT_ERROR',
        code: 'RATE_LIMIT',
        message: 'Too many requests',
        userMessage: '请稍后再试',
        timestamp: new Date().toISOString(),
        severity: 'medium',
      },
      context: { path: '/api/test', method: 'GET' },
      recovery: { strategies: ['wait'], suggestions: ['retry later'], retryable: true },
      details: { resetTime: new Date().toISOString() },
    };

    const httpError = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
      error: standardError,
      url: '/api/test',
    });

    service.handleHttpError(httpError);

    expect(toastService.warning).toHaveBeenCalled();
    const warningMessage =
      toastService.warning.mock.calls[toastService.warning.mock.calls.length - 1][0];
    expect(warningMessage).toContain('请求限制');
  });

  it('redirects to login on unauthorized responses', () => {
    const httpError = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: '/secure',
    });

    service.handleHttpError(httpError);

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('records JavaScript errors and notifies the user', () => {
    const runtimeError = new Error('Boom');

    service.handleJavaScriptError(runtimeError);

    expect(toastService.error).toHaveBeenCalled();
    const [message] = toastService.error.mock.calls[0];
    expect(typeof message).toBe('string');
  });
});
