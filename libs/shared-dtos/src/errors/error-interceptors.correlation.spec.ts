import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { ErrorType } from '../common/error-handling.patterns';
import { EnhancedAppException } from './enhanced-error-types';
import { ErrorCorrelationManager } from './error-correlation';
import { ErrorCorrelationInterceptor } from './error-interceptors';

const createContext = (
  request: Partial<Request> = {},
  response: Partial<Response> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        method: 'GET',
        path: '/api/test',
        url: '/api/test',
        ...request,
      }),
      getResponse: () => ({
        setHeader: jest.fn(),
        ...response,
      }),
    }),
    getHandler: () => ({ name: 'list' }),
    getClass: () => ({ name: 'TestController' }),
  }) as unknown as ExecutionContext;

describe('ErrorCorrelationInterceptor correlation behavior', () => {
  afterEach(() => {
    ErrorCorrelationManager.clearContext();
    jest.restoreAllMocks();
  });

  it('creates a new correlation context for request without headers', async () => {
    const interceptor = new ErrorCorrelationInterceptor('app-gateway');
    const response = { setHeader: jest.fn() };
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await lastValueFrom(
      interceptor.intercept(createContext({}, response), next),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Trace-ID',
      expect.stringMatching(/^trace_/),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      expect.stringMatching(/^req_/),
    );
  });

  it('propagates existing correlation context from request headers', async () => {
    const interceptor = new ErrorCorrelationInterceptor('app-gateway');
    const response = { setHeader: jest.fn() };
    const next: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(
      interceptor.intercept(
        createContext(
          {
            headers: {
              'x-trace-id': 'trace-existing',
              'x-request-id': 'req-existing',
              'x-span-id': 'span-parent',
            },
          },
          response,
        ),
        next,
      ),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Trace-ID',
      'trace-existing',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      'req-existing',
    );
  });

  it('enhances EnhancedAppException with correlation context on failure', async () => {
    const interceptor = new ErrorCorrelationInterceptor('app-gateway');
    const error = new EnhancedAppException(
      ErrorType.SYSTEM,
      'BROKEN',
      'Broken operation',
    );
    const next: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(), next)),
    ).rejects.toBe(error);

    expect(error.enhancedDetails.correlationContext).toMatchObject({
      serviceName: 'app-gateway',
      operationName: 'TestController.list',
    });
  });

  it('cleans up correlation context after request completion', async () => {
    const interceptor = new ErrorCorrelationInterceptor('app-gateway');
    const next: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(interceptor.intercept(createContext(), next));

    expect(ErrorCorrelationManager.getContext()).toBeUndefined();
  });
});
