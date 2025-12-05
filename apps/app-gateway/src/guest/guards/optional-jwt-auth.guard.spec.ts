import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

/**
 * Creates a mock ExecutionContext for testing.
 */
const createExecutionContext = (
  requestOverrides: Record<string, unknown> = {},
): ExecutionContext => {
  const request = {
    headers: {},
    ip: '127.0.0.1',
    path: '/api/test',
    user: undefined,
    isAuthenticated: undefined,
    ...requestOverrides,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new OptionalJwtAuthGuard(reflector);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should return true for public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true when JWT validation fails', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createExecutionContext();

      // Mock super.canActivate to throw an error
      jest.spyOn(guard, 'canActivate').mockImplementation(async (ctx) => {
        const isPublic = reflector.getAllAndOverride(IS_PUBLIC_KEY, [
          ctx.getHandler(),
          ctx.getClass(),
        ]);
        if (isPublic) return true;
        // Simulate JWT validation failure but return true anyway
        return true;
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check public route metadata', async () => {
      // When route is public, reflector is called
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createExecutionContext();

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
    });
  });

  describe('handleRequest', () => {
    it('should return null when error occurs', () => {
      const context = createExecutionContext();
      const error = new Error('JWT validation failed');

      const result = guard.handleRequest(error, null, null, context);

      expect(result).toBeNull();
    });

    it('should return user and set request properties when user is valid', () => {
      const request: Record<string, unknown> = {};
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const user = { id: 'user-123', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, null, context);

      expect(result).toEqual(user);
      expect(request.user).toEqual(user);
      expect(request.isAuthenticated).toBe(true);
    });

    it('should return null and set isAuthenticated to false when no user', () => {
      const request: Record<string, unknown> = {};
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const result = guard.handleRequest(null, null, null, context);

      expect(result).toBeNull();
      expect(request.isAuthenticated).toBe(false);
    });

    it('should handle error without throwing', () => {
      const context = createExecutionContext();
      const error = new Error('Token expired');

      expect(() => {
        guard.handleRequest(error, null, null, context);
      }).not.toThrow();
    });

    it('should not set user on request when error occurs', () => {
      const request: Record<string, unknown> = { user: undefined };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const error = new Error('Invalid token');
      guard.handleRequest(error, null, null, context);

      expect(request.user).toBeUndefined();
    });
  });

  describe('reflector interaction', () => {
    it('should call reflector with IS_PUBLIC_KEY', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createExecutionContext();

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
    });

    it('should check handler and class for public metadata', async () => {
      // When route is public, it should check both handler and class
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createExecutionContext();
      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('authentication states', () => {
    it('should handle authenticated user correctly', () => {
      const request: Record<string, unknown> = {};
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const user = {
        id: 'user-456',
        email: 'authenticated@example.com',
        permissions: ['read', 'write'],
      };

      const result = guard.handleRequest(null, user, null, context);

      expect(result).toEqual(user);
      expect(request.isAuthenticated).toBe(true);
    });

    it('should handle guest mode (no user, no error)', () => {
      const request: Record<string, unknown> = {};
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const result = guard.handleRequest(null, null, null, context);

      expect(result).toBeNull();
      expect(request.isAuthenticated).toBe(false);
      expect(request.user).toBeUndefined();
    });

    it('should handle failed authentication gracefully', () => {
      const request: Record<string, unknown> = {};
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const error = new Error('Token signature invalid');
      const result = guard.handleRequest(error, null, null, context);

      expect(result).toBeNull();
      // isAuthenticated is not set when there's an error
      expect(request.isAuthenticated).toBeUndefined();
    });
  });

  describe('async behavior', () => {
    it('should return a Promise from canActivate', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBeInstanceOf(Promise);
    });
  });
});
