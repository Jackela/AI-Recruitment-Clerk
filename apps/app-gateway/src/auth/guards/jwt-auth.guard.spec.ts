import { JwtAuthGuard } from './jwt-auth.guard';
import type { Reflector } from '@nestjs/core';
import type {
  ExecutionContext} from '@nestjs/common';
import {
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

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Invalid Tokens', () => {
    it('should reject malformed authorization header', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({
        headers: { authorization: 'InvalidFormat token' },
      });

      const result = await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.user.id).toBe('guest');
    });

    it('should reject empty bearer token', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({
        headers: { authorization: 'Bearer ' },
      });

      const result = await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.user.id).toBe('guest');
    });

    it('should reject authorization header with only whitespace', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({
        headers: { authorization: '   ' },
      });

      const _result = await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(request.user.id).toBe('guest');
    });
  });

  describe('Negative Tests - Error Handling', () => {
    it('should throw UnauthorizedException for JsonWebTokenError', () => {
      const guard = createGuard();
      const ctx = createExecutionContext({ path: '/protected' });

      expect(() =>
        guard.handleRequest(
          { name: 'JsonWebTokenError', message: 'invalid signature' },
          null,
          null,
          ctx,
        ),
      ).toThrow(
        new UnauthorizedException('Invalid token. Please log in again.'),
      );
    });

    it('should throw UnauthorizedException for NotBeforeError', () => {
      const guard = createGuard();
      const ctx = createExecutionContext({ path: '/api/data' });

      expect(() =>
        guard.handleRequest(
          { name: 'NotBeforeError', message: 'jwt not active' },
          null,
          null,
          ctx,
        ),
      ).toThrow(
        new UnauthorizedException('Token not yet valid.'),
      );
    });

    it('should throw error for unknown JWT errors', () => {
      const guard = createGuard();
      const ctx = createExecutionContext({ path: '/api/test' });

      expect(() =>
        guard.handleRequest(
          { name: 'UnknownJWTError', message: 'something went wrong' },
          null,
          null,
          ctx,
        ),
      ).toThrow('something went wrong');
    });
  });

  describe('Boundary Tests - Rate Limiting', () => {
    it('should allow requests up to exact rate limit threshold', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSetInterval = global.setInterval;
      (global as any).setInterval = jest.fn().mockReturnValue(1);
      process.env.NODE_ENV = 'development';
      process.env.FORCE_RATE_LIMIT = 'true';

      try {
        reflectorMock.getAllAndOverride.mockReturnValue(false);
        const guard = createGuard();
        (guard as any).RATE_LIMIT_MAX_REQUESTS = 5;

        const ctx = createExecutionContext({ headers: {}, ip: '203.0.113.5' });

        for (let i = 0; i < 5; i++) {
          const result = await guard.canActivate(ctx);
          expect(result).toBe(true);
        }

        await expect(guard.canActivate(ctx)).rejects.toThrow();
      } finally {
        process.env.NODE_ENV = originalEnv;
        delete process.env.FORCE_RATE_LIMIT;
        (global as any).setInterval = originalSetInterval;
      }
    });
  });

  describe('Edge Cases - User Context Management', () => {
    it('should attach guest user with complete metadata', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({ headers: {} });

      await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(request.user).toMatchObject({
        id: 'guest',
        email: expect.stringMatching(/.+@.+/),
        role: expect.any(String),
      });
      expect(request.user.id).toBe('guest');
      expect(request.user.email).toBe('guest@local');
    });

    it('should attach authenticated user with organization info', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      const guard = createGuard();
      const ctx = createExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest();

      expect(request.user).toMatchObject({
        id: expect.any(String),
        email: expect.stringMatching(/.+@.+\..+/),
        role: expect.any(String),
        organizationId: expect.any(String),
      });
      expect(request.user.id).toBe('user-uat');
    });
  });

  describe('Edge Cases - Response Headers', () => {
    it('should set all authentication headers for valid user', () => {
      const guard = createGuard();
      const mockSetHeader = jest.fn();
      const ctx = createExecutionContext(
        { path: '/api/profile' },
        { setHeader: mockSetHeader },
      );

      const user = {
        id: 'user-123',
        role: 'hr_manager',
        organizationId: 'org-456',
        email: 'test@example.com',
      };
      guard.handleRequest(null, user, null, ctx);

      expect(mockSetHeader).toHaveBeenCalledWith('X-Auth-User-Id', 'user-123');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Auth-Role', 'hr_manager');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Auth-Organization', 'org-456');
      expect(mockSetHeader).toHaveBeenCalledTimes(3);
    });

    it('should not set organization header when user has no organization', () => {
      const guard = createGuard();
      const mockSetHeader = jest.fn();
      const ctx = createExecutionContext(
        { path: '/api/test' },
        { setHeader: mockSetHeader },
      );

      const user = { id: 'user-1', role: 'admin' };
      guard.handleRequest(null, user, null, ctx);

      expect(mockSetHeader).toHaveBeenCalledWith('X-Auth-User-Id', 'user-1');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Auth-Role', 'admin');
      expect(mockSetHeader).not.toHaveBeenCalledWith(
        'X-Auth-Organization',
        expect.anything(),
      );
    });
  });

  describe('Edge Cases - Client Identifier Generation', () => {
    it('should handle missing user agent', () => {
      const guard = createGuard();
      const request = {
        ip: '198.51.100.1',
        connection: { remoteAddress: '198.51.100.1' },
        get: jest.fn().mockReturnValue(undefined),
      } as any;

      const identifier = (guard as any).getClientIdentifier(request);

      expect(identifier).toBeDefined();
      expect(identifier).toHaveLength(16);
    });

    it('should use remote address when IP is missing', () => {
      const guard = createGuard();
      const request = {
        ip: undefined,
        connection: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('test-agent'),
      } as any;

      const identifier = (guard as any).getClientIdentifier(request);

      expect(identifier).toBeDefined();
      expect(identifier.length).toBeGreaterThan(0);
    });

    it('should generate consistent identifiers for same client', () => {
      const guard = createGuard();
      const request = {
        ip: '203.0.113.50',
        connection: { remoteAddress: '203.0.113.50' },
        get: jest.fn().mockReturnValue('consistent-agent'),
      } as any;

      const id1 = (guard as any).getClientIdentifier(request);
      const id2 = (guard as any).getClientIdentifier(request);

      expect(id1).toBe(id2);
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete rate limit status structure', () => {
      const guard = createGuard();
      (guard as any).requestCounts.set('client-test', {
        count: 10,
        resetTime: Date.now() + 5000,
        blocked: false,
      });

      const status = guard.getRateLimitStatus();

      expect(status).toMatchObject({
        activeClients: expect.any(Number),
        blockedClients: expect.any(Number),
        totalRequests: expect.any(Number),
      });
      expect(status.activeClients).toBeGreaterThan(0);
      expect(status.totalRequests).toBeGreaterThanOrEqual(status.activeClients);
    });
  });
});
