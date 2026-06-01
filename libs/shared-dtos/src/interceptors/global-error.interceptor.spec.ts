import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { ErrorSeverity, ErrorType } from '../common/error-handling.patterns';
import { ErrorCorrelationManager } from '../errors/error-correlation';
import { EnhancedAppException } from '../errors/enhanced-error-types';
import { GlobalErrorInterceptor } from './global-error.interceptor';

const createContext = (
  requestOverrides: Record<string, unknown> = {},
  responseOverrides: Record<string, unknown> = {},
): {
  context: ExecutionContext;
  response: { setHeader: jest.Mock; json: jest.Mock };
} => {
  const response = {
    setHeader: jest.fn(),
    json: jest.fn(),
    ...responseOverrides,
  };
  const request = {
    headers: {
      authorization: 'Bearer secret',
      cookie: 'session=secret',
      'x-trace-id': 'trace-123',
      'x-request-id': 'req-123',
      'user-agent': 'jest',
    },
    method: 'GET',
    path: '/api/test',
    query: {},
    connection: { remoteAddress: '127.0.0.1' },
    ...requestOverrides,
  };

  return {
    response,
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => ({ name: 'list' }),
      getClass: () => ({ name: 'TestController' }),
    } as unknown as ExecutionContext,
  };
};

describe('GlobalErrorInterceptor', () => {
  afterEach(() => {
    ErrorCorrelationManager.clearContext();
    jest.restoreAllMocks();
  });

  it('passes through EnhancedAppException without transformation', async () => {
    const interceptor = new GlobalErrorInterceptor();
    const error = new EnhancedAppException(
      ErrorType.SYSTEM,
      'ALREADY_ENHANCED',
      'Already enhanced',
    );
    const { context, response } = createContext();
    const next: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(error);

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Error-Code',
      'ALREADY_ENHANCED',
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ALREADY_ENHANCED' }),
      }),
    );
  });

  it('transforms standard HttpException to EnhancedAppException', async () => {
    const interceptor = new GlobalErrorInterceptor();
    const { context } = createContext();
    const next: CallHandler = {
      handle: () => throwError(() => new BadRequestException('Bad input')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      enhancedDetails: expect.objectContaining({
        type: 'VALIDATION_ERROR',
        severity: 'medium',
      }),
    });
  });

  it('transforms unknown errors to EnhancedAppException', async () => {
    const interceptor = new GlobalErrorInterceptor();
    const { context } = createContext();
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Unexpected')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      enhancedDetails: expect.objectContaining({
        type: 'SYSTEM_ERROR',
        severity: 'critical',
      }),
    });
  });

  it('sets correlation context from request headers', async () => {
    const interceptor = new GlobalErrorInterceptor();
    const { context } = createContext();
    const next: CallHandler = {
      handle: () => throwError(() => new ForbiddenException('No access')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBeInstanceOf(EnhancedAppException);

    expect(ErrorCorrelationManager.getContext()).toMatchObject({
      traceId: 'trace-123',
      requestId: 'req-123',
      operationName: 'GET /api/test',
    });
  });

  it('logs errors with appropriate severity levels', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const interceptor = new GlobalErrorInterceptor();
    const { context } = createContext();

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => new BadGatewayException('Gateway')),
        }),
      ),
    ).rejects.toBeInstanceOf(EnhancedAppException);

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => new UnauthorizedException('Auth')),
        }),
      ),
    ).rejects.toBeInstanceOf(EnhancedAppException);

    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('sanitizes sensitive headers in error logs', async () => {
    const interceptor = new GlobalErrorInterceptor();
    const sanitized = (
      interceptor as never as {
        sanitizeHeaders: (
          headers: Record<string, string>,
        ) => Record<string, string>;
      }
    ).sanitizeHeaders({
      authorization: 'Bearer secret',
      cookie: 'session=secret',
      'x-api-key': 'key',
      accept: 'application/json',
    });

    expect(sanitized).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      'x-api-key': '[REDACTED]',
      accept: 'application/json',
    });
  });

  it.each([
    [new BadRequestException(), 'VALIDATION_ERROR'],
    [new UnauthorizedException(), 'AUTHENTICATION_ERROR'],
    [new ForbiddenException(), 'AUTHORIZATION_ERROR'],
    [new NotFoundException(), 'NOT_FOUND_ERROR'],
    [new BadGatewayException(), 'EXTERNAL_SERVICE_ERROR'],
  ])('maps HTTP status codes to error types', async (exception, type) => {
    const interceptor = new GlobalErrorInterceptor();
    const { context } = createContext();

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => exception),
        }),
      ),
    ).rejects.toMatchObject({
      enhancedDetails: expect.objectContaining({ type }),
    });
  });

  it('maps HTTP status codes to severity correctly', () => {
    const interceptor = new GlobalErrorInterceptor();
    const mapSeverity = (
      interceptor as never as {
        mapHttpStatusToSeverity: (status: number) => string;
      }
    ).mapHttpStatusToSeverity.bind(interceptor);

    expect(mapSeverity(200)).toBe(ErrorSeverity.LOW);
    expect(mapSeverity(404)).toBe(ErrorSeverity.MEDIUM);
    expect(mapSeverity(500)).toBe(ErrorSeverity.HIGH);
  });
});
