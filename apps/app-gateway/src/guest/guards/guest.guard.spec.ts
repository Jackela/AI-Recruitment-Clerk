import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GuestGuard } from './guest.guard';

describe('GuestGuard', () => {
  let guard: GuestGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (headers: any = {}): ExecutionContext => {
    const mockRequest = {
      headers,
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<GuestGuard>(GuestGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear rate limit map to prevent test interference
    (guard as any).rateLimitMap.clear();
  });

  afterAll(() => {
    // Clear any active intervals
    jest.clearAllTimers();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access with valid UUID device ID', async () => {
      const validUUID = '12345678-1234-4321-8765-123456789012';
      const context = createMockExecutionContext({
        'x-device-id': validUUID,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.deviceId).toBe(validUUID);
      expect(request.isGuest).toBe(true);
    });

    it('should allow access with valid custom device ID', async () => {
      const validCustomId = 'custom-device-id-12345';
      const context = createMockExecutionContext({
        'x-device-id': validCustomId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.deviceId).toBe(validCustomId);
    });

    it('should throw UnauthorizedException when device ID is missing', async () => {
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException for invalid device ID format', async () => {
      const invalidDeviceId = 'invalid-id!@#';
      const context = createMockExecutionContext({
        'x-device-id': invalidDeviceId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for too short device ID', async () => {
      const shortDeviceId = 'short';
      const context = createMockExecutionContext({
        'x-device-id': shortDeviceId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle rate limiting correctly', async () => {
      const deviceId = 'test-device-12345678';

      // Make exactly 30 requests (the limit)
      for (let i = 0; i < 30; i++) {
        const context = createMockExecutionContext({
          'x-device-id': deviceId,
        });
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }

      // 31st request should fail due to rate limiting
      const finalContext = createMockExecutionContext({
        'x-device-id': deviceId,
      });

      await expect(guard.canActivate(finalContext)).rejects.toThrow();
    });
  });

  describe('rate limiting', () => {
    it('should track rate limits per device and IP combination', async () => {
      const deviceId1 = 'device-1-12345678';
      const deviceId2 = 'device-2-12345678';

      // Different device IDs should have separate rate limits
      for (let i = 0; i < 15; i++) {
        const context1 = createMockExecutionContext({
          'x-device-id': deviceId1,
        });
        const context2 = createMockExecutionContext({
          'x-device-id': deviceId2,
        });

        const result1 = await guard.canActivate(context1);
        const result2 = await guard.canActivate(context2);

        expect(result1).toBe(true);
        expect(result2).toBe(true);
      }
    });

    it('should reset rate limit after time window', (done) => {
      const deviceId = 'test-device-12345678';

      // Mock the rate limit window to be very short for testing
      (guard as any).RATE_LIMIT_WINDOW = 100; // 100ms

      const context = createMockExecutionContext({
        'x-device-id': deviceId,
      });

      // Fill up the rate limit
      Promise.all(
        Array(30)
          .fill(null)
          .map(() => guard.canActivate(context)),
      ).then(() => {
        // Should fail on next request
        guard.canActivate(context).catch(() => {
          // Wait for rate limit window to reset
          setTimeout(async () => {
            // Should pass after reset
            const result = await guard.canActivate(context);
            expect(result).toBe(true);
            done();
          }, 150);
        });
      });
    }, 1000);
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit statistics', async () => {
      const deviceId1 = 'device-1-12345678';
      const deviceId2 = 'device-2-12345678';

      const context1 = createMockExecutionContext({
        'x-device-id': deviceId1,
      });
      const context2 = createMockExecutionContext({
        'x-device-id': deviceId2,
      });

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      const stats = guard.getRateLimitStatus();

      expect(stats.activeGuests).toBeGreaterThanOrEqual(2);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('device ID validation', () => {
    const testCases = [
      {
        id: '12345678-1234-4321-8765-123456789012',
        valid: true,
        description: 'valid UUID',
      },
      {
        id: 'custom-device-id-12345678',
        valid: true,
        description: 'valid custom ID',
      },
      { id: 'short', valid: false, description: 'too short ID' },
      { id: 'a'.repeat(129), valid: false, description: 'too long ID' },
      {
        id: 'invalid-id!@#$%',
        valid: false,
        description: 'invalid characters',
      },
      { id: '', valid: false, description: 'empty string' },
      {
        id: '12345678-1234-4321-8765',
        valid: false,
        description: 'incomplete UUID',
      },
    ];

    testCases.forEach(({ id, valid, description }) => {
      it(`should ${valid ? 'accept' : 'reject'} ${description}`, async () => {
        const context = createMockExecutionContext({
          'x-device-id': id,
        });

        if (valid) {
          const result = await guard.canActivate(context);
          expect(result).toBe(true);
        } else {
          await expect(guard.canActivate(context)).rejects.toThrow();
        }
      });
    });
  });
});
