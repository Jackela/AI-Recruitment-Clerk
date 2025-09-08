import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockRequest: any;
  let mockResponse: any;

  // Mock logger to prevent console output during tests
  const mockLogger = {
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(() => {
    // Mock setInterval globally before any module compilation
    jest
      .spyOn(global, 'setInterval')
      .mockImplementation((callback: any, delay?: number) => {
        // Return a mock timer ID but don't actually set the interval
        return 12345 as any;
      });
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
  });

  beforeEach(async () => {
    // Use fake timers to control time-based functions
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);

    // Force clear the requestCounts map to ensure clean state
    (guard as any).requestCounts.clear();
    // Ensure we start with a fresh map
    (guard as any).requestCounts = new Map();

    // Replace the logger with our mock
    (guard as any).logger = mockLogger;

    // Setup mock request and response
    mockRequest = {
      ip: '192.168.1.1',
      path: '/api/test',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-browser';
        return undefined;
      }),
      connection: {
        remoteAddress: '192.168.1.1',
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    // Setup mock execution context
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    // Clear all mocks before each test
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Clear the rate limit map between tests to ensure isolation
    (guard as any).requestCounts.clear();
    // Reset test rate limiting flag
    if (mockRequest) {
      delete (mockRequest as any).__testRateLimit;
    }
    // Clear any pending timers
    jest.clearAllTimers();
    // Use real timers after each test
    jest.useRealTimers();
  });

  afterAll(() => {
    // Restore all mocks after all tests
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should initialize with correct rate limit settings', () => {
      const rateLimitWindow = (guard as any).RATE_LIMIT_WINDOW;
      const rateLimitMax = (guard as any).RATE_LIMIT_MAX_REQUESTS;
      const cleanupInterval = (guard as any).RATE_LIMIT_CLEANUP_INTERVAL;

      expect(rateLimitWindow).toBe(60 * 1000); // 1 minute
      expect(rateLimitMax).toBe(100); // 100 requests per minute
      expect(cleanupInterval).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should initialize request counts map', () => {
      const requestCounts = (guard as any).requestCounts;
      expect(requestCounts).toBeInstanceOf(Map);
      expect(requestCounts.size).toBe(0);
    });
  });

  describe('canActivate - Public Route Handling', () => {
    it('should allow access to public routes without authentication', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should proceed to JWT validation for non-public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      // Mock the parent canActivate to return true
      const mockParentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockParentCanActivate).toHaveBeenCalledWith(mockContext);
    });

    it('should handle undefined isPublic metadata as false', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const mockParentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);

      await guard.canActivate(mockContext);

      expect(mockParentCanActivate).toHaveBeenCalled();
    });
  });

  describe('canActivate - Rate Limiting', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      // Enable rate limiting for these tests
      (mockRequest as any).__testRateLimit = true;
      // Mock parent canActivate to focus on rate limiting
      jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);
    });

    it('should allow first request from new client', async () => {
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should track multiple requests from same client', async () => {
      // Make multiple requests
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      const requestCounts = (guard as any).requestCounts;
      const clientId = (guard as any).getClientIdentifier(mockRequest);
      const key = `${clientId}-${mockRequest.path}`;

      expect(requestCounts.has(key)).toBe(true);
      expect(requestCounts.get(key).count).toBe(3);
    });

    it('should throw TOO_MANY_REQUESTS when rate limit exceeded', async () => {
      // Make 101 requests (exceeds limit of 100)
      const promises = [];
      for (let i = 0; i < 101; i++) {
        promises.push(guard.canActivate(mockContext));
      }

      // First 100 should pass, 101st should fail
      await Promise.all(promises.slice(0, 100));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded for client:'),
      );
    });

    it('should reset rate limit after time window', async () => {
      const rateLimitWindow = (guard as any).RATE_LIMIT_WINDOW;

      // Make request that gets rate limited
      for (let i = 0; i < 101; i++) {
        if (i < 100) {
          await guard.canActivate(mockContext);
        }
      }

      // Verify blocked
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        HttpException,
      );

      // Advance time beyond rate limit window
      jest.advanceTimersByTime(rateLimitWindow + 1000);

      // Should allow request again
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should handle different paths separately', async () => {
      const originalPath = mockRequest.path;

      // Make 100 requests to first path
      for (let i = 0; i < 100; i++) {
        await guard.canActivate(mockContext);
      }

      // Change path and make request
      mockRequest.path = '/api/different';
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);

      // Restore original path
      mockRequest.path = originalPath;
    });
  });

  describe('getClientIdentifier', () => {
    it('should generate consistent identifier for same IP and User-Agent', () => {
      const identifier1 = (guard as any).getClientIdentifier(mockRequest);
      const identifier2 = (guard as any).getClientIdentifier(mockRequest);

      expect(identifier1).toBe(identifier2);
      expect(identifier1).toHaveLength(16); // SHA256 substring
    });

    it('should generate different identifiers for different IPs', () => {
      const identifier1 = (guard as any).getClientIdentifier(mockRequest);

      mockRequest.ip = '192.168.1.2';
      const identifier2 = (guard as any).getClientIdentifier(mockRequest);

      expect(identifier1).not.toBe(identifier2);
    });

    it('should handle missing IP address', () => {
      mockRequest.ip = undefined;
      mockRequest.connection.remoteAddress = undefined;

      const identifier = (guard as any).getClientIdentifier(mockRequest);

      expect(identifier).toBeDefined();
      expect(identifier).toHaveLength(16);
    });

    it('should handle missing User-Agent', () => {
      mockRequest.get.mockReturnValue(undefined);

      const identifier = (guard as any).getClientIdentifier(mockRequest);

      expect(identifier).toBeDefined();
      expect(identifier).toHaveLength(16);
    });
  });

  describe('handleRequest - Error Handling', () => {
    it('should handle TokenExpiredError', () => {
      const error = { name: 'TokenExpiredError', message: 'Token expired' };

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(
        new UnauthorizedException(
          'Token has expired. Please refresh your session.',
        ),
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Authentication error on ${mockRequest.path}: Token expired`,
      );
    });

    it('should handle JsonWebTokenError', () => {
      const error = { name: 'JsonWebTokenError', message: 'Invalid token' };

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(new UnauthorizedException('Invalid token format.'));
    });

    it('should handle NotBeforeError', () => {
      const error = { name: 'NotBeforeError', message: 'Token not active' };

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(new UnauthorizedException('Token not yet valid.'));
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(error);
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      expect(() => {
        guard.handleRequest(error, null, null, mockContext);
      }).toThrow(error);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Authentication error on ${mockRequest.path}: String error`,
      );
    });
  });

  describe('handleRequest - User Validation', () => {
    it('should throw UnauthorizedException when no user provided', () => {
      expect(() => {
        guard.handleRequest(null, null, null, mockContext);
      }).toThrow(new UnauthorizedException('Authentication required'));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `No user found in token for request to ${mockRequest.path}`,
      );
    });

    it('should return user and set security headers when valid user provided', () => {
      const user = {
        id: 'user123',
        role: 'admin',
        organizationId: 'org456',
      };

      const result = guard.handleRequest(null, user, null, mockContext);

      expect(result).toBe(user);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Auth-User-Id',
        'user123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Auth-Role',
        'admin',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Auth-Organization',
        'org456',
      );
    });

    it('should handle user with missing optional fields', () => {
      const user = {
        id: 'user123',
        role: undefined,
        organizationId: undefined,
      };

      const result = guard.handleRequest(null, user, null, mockContext);

      expect(result).toBe(user);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Auth-User-Id',
        'user123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Auth-Role',
        undefined,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Auth-Organization',
        undefined,
      );
    });
  });

  describe('Rate Limit Cleanup', () => {
    it('should clean up expired rate limit records', () => {
      const rateLimitWindow = (guard as any).RATE_LIMIT_WINDOW;

      // Add some records
      const requestCounts = (guard as any).requestCounts;
      const now = Date.now();

      requestCounts.set('expired-key', {
        count: 1,
        resetTime: now - 1000, // Expired
        blocked: false,
      });

      requestCounts.set('active-key', {
        count: 1,
        resetTime: now + rateLimitWindow, // Still active
        blocked: false,
      });

      requestCounts.set('blocked-key', {
        count: 101,
        resetTime: now - 1000, // Expired but blocked
        blocked: true,
      });

      expect(requestCounts.size).toBe(3);

      // Trigger cleanup
      (guard as any).cleanupRateLimits();

      expect(requestCounts.size).toBe(2); // Only expired non-blocked should be removed
      expect(requestCounts.has('expired-key')).toBe(false);
      expect(requestCounts.has('active-key')).toBe(true);
      expect(requestCounts.has('blocked-key')).toBe(true); // Blocked records are not cleaned
    });

    it('should log cleanup activity', () => {
      const requestCounts = (guard as any).requestCounts;
      const now = Date.now();

      requestCounts.set('expired-key', {
        count: 1,
        resetTime: now - 1000,
        blocked: false,
      });

      (guard as any).cleanupRateLimits();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cleaned up 1 expired rate limit records',
      );
    });

    it('should not log when no records cleaned', () => {
      (guard as any).cleanupRateLimits();

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct status with no active clients', () => {
      const status = guard.getRateLimitStatus();

      expect(status).toEqual({
        activeClients: 0,
        blockedClients: 0,
        totalRequests: 0,
      });
    });

    it('should return correct status with active clients', () => {
      const requestCounts = (guard as any).requestCounts;

      requestCounts.set('client1', {
        count: 5,
        resetTime: Date.now() + 60000,
        blocked: false,
      });
      requestCounts.set('client2', {
        count: 101,
        resetTime: Date.now() + 60000,
        blocked: true,
      });
      requestCounts.set('client3', {
        count: 10,
        resetTime: Date.now() + 60000,
        blocked: false,
      });

      const status = guard.getRateLimitStatus();

      expect(status).toEqual({
        activeClients: 3,
        blockedClients: 1,
        totalRequests: 116, // 5 + 101 + 10
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow for protected route', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const mockParentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
      expect(mockParentCanActivate).toHaveBeenCalledWith(mockContext);
    });

    it('should handle authentication failure with proper error handling', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const authError = { name: 'TokenExpiredError', message: 'Token expired' };
      jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockRejectedValue(authError);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(authError);
    });

    it('should handle rate limiting before JWT validation', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      // Enable rate limiting for this test
      (mockRequest as any).__testRateLimit = true;

      // Fill up rate limit
      const promises = [];
      for (let i = 0; i < 101; i++) {
        if (i < 100) {
          promises.push(guard.canActivate(mockContext));
        }
      }
      await Promise.all(promises);

      // This request should be rate limited before reaching JWT validation
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malformed request objects gracefully', async () => {
      mockContext.switchToHttp.mockReturnValue({
        getRequest: () => ({}), // Empty request object
        getResponse: () => mockResponse,
      } as any);

      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should handle rapid concurrent requests', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);

      // Simulate 50 concurrent requests
      const promises = Array(50)
        .fill(null)
        .map(() => guard.canActivate(mockContext));

      const results = await Promise.all(promises);

      // All should succeed (under rate limit)
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should maintain rate limit state consistency under concurrent load', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      // Enable rate limiting for this test
      (mockRequest as any).__testRateLimit = true;
      jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockResolvedValue(true);

      // Make exactly 100 requests concurrently
      const promises = Array(100)
        .fill(null)
        .map(() => guard.canActivate(mockContext));
      await Promise.all(promises);

      // The 101st request should be blocked
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
