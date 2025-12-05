import { ExecutionContext } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';

/**
 * Creates a mock ExecutionContext for testing.
 */
const createExecutionContext = (
  requestOverrides: Record<string, unknown> = {},
): ExecutionContext => {
  const request = {
    headers: {},
    body: {},
    ip: '127.0.0.1',
    path: '/api/auth/login',
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

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  beforeEach(() => {
    guard = new LocalAuthGuard();
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should return true for any request', () => {
      const context = createExecutionContext();
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true with valid credentials in body', () => {
      const context = createExecutionContext({
        body: {
          email: 'test@example.com',
          password: 'validPassword123',
        },
      });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true with empty credentials', () => {
      const context = createExecutionContext({
        body: {
          email: '',
          password: '',
        },
      });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true without any body', () => {
      const context = createExecutionContext({
        body: undefined,
      });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true for different request paths', () => {
      const paths = ['/api/auth/login', '/api/auth/register', '/api/test'];

      for (const path of paths) {
        const context = createExecutionContext({ path });
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should return true regardless of headers', () => {
      const context = createExecutionContext({
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
      });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true for requests from different IPs', () => {
      const ips = ['127.0.0.1', '192.168.1.1', '10.0.0.1', '::1'];

      for (const ip of ips) {
        const context = createExecutionContext({ ip });
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle null context properties gracefully', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => null,
          getResponse: () => null,
        }),
        getHandler: () => null,
        getClass: () => null,
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should always be synchronous', () => {
      const context = createExecutionContext();
      const result = guard.canActivate(context);

      // Result should be a boolean, not a Promise
      expect(typeof result).toBe('boolean');
      expect(result).not.toBeInstanceOf(Promise);
    });
  });
});
