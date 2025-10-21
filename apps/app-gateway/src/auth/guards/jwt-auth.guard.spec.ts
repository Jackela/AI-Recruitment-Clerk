import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

const createExecutionContext = (
  requestOverrides: Record<string, any> = {},
  responseOverrides: Record<string, any> = {},
): ExecutionContext => {
  const request = {
    headers: {},
    ip: '127.0.0.1',
    path: '/api/test',
    get: jest.fn().mockReturnValue('jest-agent'),
    ...requestOverrides,
  };

  const response = {
    setHeader: jest.fn(),
    ...responseOverrides,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };
  const reflector = reflectorMock as unknown as Reflector;

  const createGuard = () => new JwtAuthGuard(reflector as Reflector);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.FORCE_RATE_LIMIT;
  });

  describe('canActivate', () => {
    it('returns true for public routes', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(true);
      const guard = createGuard();
      const ctx = createExecutionContext();

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(ctx.switchToHttp().getRequest().user).toBeUndefined();
    });

    it('attaches guest user when no authorization header present', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({ headers: {} });

      const result = await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.user).toEqual(
        expect.objectContaining({
          id: 'guest',
          email: 'guest@local',
        }),
      );
    });

    it('attaches default authenticated user when bearer token is provided', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({
        headers: { authorization: 'Bearer test-token' },
      });

      const result = await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.user).toEqual(
        expect.objectContaining({
          id: 'user-uat',
          email: 'uat@example.com',
        }),
      );
    });

    it('enforces rate limiting when enabled', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalForce = process.env.FORCE_RATE_LIMIT;
      const originalSetInterval = global.setInterval;
      (global as any).setInterval = jest.fn().mockReturnValue(1);
      process.env.NODE_ENV = 'development';
      process.env.FORCE_RATE_LIMIT = 'true';

      try {
        reflectorMock.getAllAndOverride.mockReturnValue(false);
        const guard = createGuard();
        // Reduce threshold to keep test light
        (guard as any).RATE_LIMIT_MAX_REQUESTS = 2;

        const ctx = createExecutionContext({
          headers: {},
          ip: '203.0.113.1',
          path: '/api/protected',
          get: jest.fn().mockReturnValue('jest-agent'),
        });

        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        await expect(guard.canActivate(ctx)).rejects.toThrow(
          new HttpException(
            'Too many requests. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          ),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalForce) {
          process.env.FORCE_RATE_LIMIT = originalForce;
        } else {
          delete process.env.FORCE_RATE_LIMIT;
        }
        (global as any).setInterval = originalSetInterval;
      }
    });
  });

  describe('handleRequest', () => {
    it('throws UnauthorizedException for token expiration errors', () => {
      const guard = createGuard();
      const ctx = createExecutionContext({ path: '/auth/login' });

      expect(() =>
        guard.handleRequest(
          { name: 'TokenExpiredError', message: 'expired' },
          null,
          null,
          ctx,
        ),
      ).toThrow(
        new UnauthorizedException(
          'Token has expired. Please refresh your session.',
        ),
      );
    });

    it('returns user and sets headers for valid requests', () => {
      const guard = createGuard();
      const ctx = createExecutionContext(
        { path: '/api/profile' },
        { setHeader: jest.fn() },
      );

      const user = { id: 'user-1', role: 'admin', organizationId: 'org-1' };
      const result = guard.handleRequest(null, user, null, ctx);

      expect(result).toBe(user);
      const response = ctx.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Auth-User-Id',
        'user-1',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Auth-Role',
        'admin',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Auth-Organization',
        'org-1',
      );
    });
  });

  describe('rate limit helpers', () => {
    it('computes client identifier from ip and user agent', () => {
      const guard = createGuard();
      const request = {
        ip: '198.51.100.42',
        connection: { remoteAddress: undefined },
        get: jest.fn().mockReturnValue('jest-ua'),
      } as any;

      const identifier = (guard as any).getClientIdentifier(request);
      expect(identifier).toHaveLength(16);
      expect((guard as any).getClientIdentifier(request)).toBe(identifier);
    });

    it('reports rate limit status', () => {
      const guard = createGuard();
      (guard as any).requestCounts.set('client-1', {
        count: 3,
        resetTime: Date.now() + 1000,
        blocked: false,
      });
      (guard as any).requestCounts.set('client-2', {
        count: 5,
        resetTime: Date.now() + 1000,
        blocked: true,
      });

      const status = guard.getRateLimitStatus();
      expect(status).toEqual({
        activeClients: 2,
        blockedClients: 1,
        totalRequests: 8,
      });
    });
  });
});
