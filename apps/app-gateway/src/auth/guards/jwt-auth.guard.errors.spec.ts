import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

const createContext = (
  requestOverrides: Record<string, unknown> = {},
): ExecutionContext => {
  const request = {
    headers: {},
    ip: '127.0.0.1',
    path: '/api/protected',
    get: jest.fn().mockReturnValue('jest-agent'),
    connection: { remoteAddress: '127.0.0.1' },
    ...requestOverrides,
  };
  const response = { setHeader: jest.fn() };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard error paths', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  let originalNodeEnv: string | undefined;
  let originalForceRateLimit: string | undefined;
  let originalSetInterval: typeof setInterval;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalForceRateLimit = process.env.FORCE_RATE_LIMIT;
    originalSetInterval = global.setInterval;
    process.env.NODE_ENV = 'test';
    delete process.env.FORCE_RATE_LIMIT;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalForceRateLimit) {
      process.env.FORCE_RATE_LIMIT = originalForceRateLimit;
    } else {
      delete process.env.FORCE_RATE_LIMIT;
    }
    global.setInterval = originalSetInterval;
    jest.restoreAllMocks();
  });

  it('rejects request with expired token', () => {
    const guard = new JwtAuthGuard(reflector);

    expect(() =>
      guard.handleRequest(
        { name: 'TokenExpiredError', message: 'expired' },
        null,
        null,
        createContext(),
      ),
    ).toThrow(
      new UnauthorizedException(
        'Token has expired. Please refresh your session.',
      ),
    );
  });

  it('rejects request with invalid token signature', () => {
    const guard = new JwtAuthGuard(reflector);

    expect(() =>
      guard.handleRequest(
        { name: 'JsonWebTokenError', message: 'invalid signature' },
        null,
        null,
        createContext(),
      ),
    ).toThrow(new UnauthorizedException('Invalid token. Please log in again.'));
  });

  it('rejects request with not-before error', () => {
    const guard = new JwtAuthGuard(reflector);

    expect(() =>
      guard.handleRequest(
        { name: 'NotBeforeError', message: 'jwt not active' },
        null,
        null,
        createContext(),
      ),
    ).toThrow(new UnauthorizedException('Token not yet valid.'));
  });

  it('rejects request without authentication header in handleRequest', () => {
    const guard = new JwtAuthGuard(reflector);

    expect(() =>
      guard.handleRequest(null, null, null, createContext()),
    ).toThrow(new UnauthorizedException('Authentication required'));
  });

  it('enforces rate limiting when threshold exceeded', async () => {
    global.setInterval = jest.fn().mockReturnValue(1) as never;
    process.env.NODE_ENV = 'development';
    process.env.FORCE_RATE_LIMIT = 'true';
    const guard = new JwtAuthGuard(reflector);
    (
      guard as never as { RATE_LIMIT_MAX_REQUESTS: number }
    ).RATE_LIMIT_MAX_REQUESTS = 1;
    const context = createContext({
      ip: '203.0.113.10',
      path: '/api/rate-limited',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toThrow(
      new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('handles malformed authorization header gracefully as guest', async () => {
    const guard = new JwtAuthGuard(reflector);
    const context = createContext({
      headers: { authorization: 'Basic malformed-token' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().user).toMatchObject({
      id: 'guest',
    });
  });

  it('handles empty bearer token gracefully as guest', async () => {
    const guard = new JwtAuthGuard(reflector);
    const context = createContext({
      headers: { authorization: 'Bearer ' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().user).toMatchObject({
      id: 'guest',
    });
  });
});
