import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GuestGuard } from './guest.guard';

describe('GuestGuard', () => {
  let guard: GuestGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

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

  const originalSetInterval = global.setInterval;

  const createGuard = () => new GuestGuard(mockReflector);

  beforeEach(() => {
    (global as any).setInterval = jest.fn().mockReturnValue(1);
    guard = createGuard();
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global as any).setInterval = originalSetInterval;
    // Clear rate limit map to prevent test interference
    (guard as any).rateLimitMap.clear();
  });

  afterAll(() => {
    (global as any).setInterval = originalSetInterval;
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

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Invalid Headers and Injection Attacks', () => {
    it('should reject SQL injection attempt in device ID', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const context = createMockExecutionContext({
        'x-device-id': sqlInjection,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should reject XSS attempt in device ID', async () => {
      const xssAttempt = '<script>alert("xss")</script>';
      const context = createMockExecutionContext({
        'x-device-id': xssAttempt,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should reject device ID with null bytes', async () => {
      const nullByteId = 'device\\x00id';
      const context = createMockExecutionContext({
        'x-device-id': nullByteId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should reject device ID with unicode control characters', async () => {
      const controlChars = 'device\\u0000\\u001Fid';
      const context = createMockExecutionContext({
        'x-device-id': controlChars,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Boundary Tests - Device ID Length Limits', () => {
    it('should accept device ID at exactly minimum length (8 chars)', async () => {
      const minLengthId = 'device-8';
      const context = createMockExecutionContext({
        'x-device-id': minLengthId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().deviceId).toBe(minLengthId);
    });

    it('should accept device ID at exactly maximum length (128 chars)', async () => {
      const maxLengthId = 'a'.repeat(128);
      const context = createMockExecutionContext({
        'x-device-id': maxLengthId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject device ID exceeding maximum length (129 chars)', async () => {
      const tooLongId = 'a'.repeat(129);
      const context = createMockExecutionContext({
        'x-device-id': tooLongId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should reject device ID just below minimum length (7 chars)', async () => {
      const tooShortId = 'device7';
      const context = createMockExecutionContext({
        'x-device-id': tooShortId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Boundary Tests - Rate Limit Thresholds', () => {
    it('should allow exactly 30 requests (at rate limit boundary)', async () => {
      const deviceId = 'boundary-device-12345678';

      for (let i = 0; i < 30; i++) {
        const context = createMockExecutionContext({
          'x-device-id': deviceId,
        });
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }

      const stats = guard.getRateLimitStatus();
      expect(stats.totalRequests).toBeGreaterThanOrEqual(30);
    });

    it('should reject exactly on 31st request (exceeding rate limit)', async () => {
      const deviceId = 'overflow-device-12345678';

      for (let i = 0; i < 30; i++) {
        const context = createMockExecutionContext({
          'x-device-id': deviceId,
        });
        await guard.canActivate(context);
      }

      const overflowContext = createMockExecutionContext({
        'x-device-id': deviceId,
      });

      await expect(guard.canActivate(overflowContext)).rejects.toThrow();
    });
  });

  describe('Edge Cases - Concurrent Device Access', () => {
    it('should handle concurrent requests from same device ID', async () => {
      const deviceId = 'concurrent-device-12345678';

      const promises = Array(10)
        .fill(null)
        .map(() => {
          const context = createMockExecutionContext({
            'x-device-id': deviceId,
          });
          return guard.canActivate(context);
        });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe(true);
      });
    });

    it('should isolate rate limits for different device IDs', async () => {
      const device1 = 'device-1-12345678';
      const device2 = 'device-2-12345678';

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          guard.canActivate(
            createMockExecutionContext({ 'x-device-id': device1 }),
          ),
        );
        promises.push(
          guard.canActivate(
            createMockExecutionContext({ 'x-device-id': device2 }),
          ),
        );
      }

      const results = await Promise.all(promises);

      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe('Edge Cases - IP Address Handling', () => {
    it('should handle missing IP address gracefully', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { 'x-device-id': 'valid-device-12345678' },
            ip: undefined,
            connection: {},
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle IPv6 addresses', async () => {
      const context = createMockExecutionContext({
        'x-device-id': 'ipv6-device-12345678',
      });
      const request = context.switchToHttp().getRequest();
      request.ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      request.connection.remoteAddress = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle proxy forwarded IPs', async () => {
      const context = createMockExecutionContext({
        'x-device-id': 'proxy-device-12345678',
        'x-forwarded-for': '203.0.113.1, 192.168.1.1',
      });
      const request = context.switchToHttp().getRequest();
      request.ip = '192.168.1.1';

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should attach complete request metadata on successful activation', async () => {
      const validDeviceId = 'metadata-device-12345678';
      const context = createMockExecutionContext({
        'x-device-id': validDeviceId,
      });

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request).toMatchObject({
        deviceId: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
        isGuest: true,
      });
      expect(request.deviceId).toBe(validDeviceId);
      expect(request.deviceId.length).toBeGreaterThanOrEqual(8);
      expect(request.deviceId.length).toBeLessThanOrEqual(128);
    });

    it('should return complete rate limit status structure', async () => {
      const deviceId = 'status-device-12345678';
      const context = createMockExecutionContext({
        'x-device-id': deviceId,
      });

      await guard.canActivate(context);

      const status = guard.getRateLimitStatus();

      expect(status).toMatchObject({
        activeGuests: expect.any(Number),
        totalRequests: expect.any(Number),
      });
      expect(status.activeGuests).toBeGreaterThan(0);
      expect(status.totalRequests).toBeGreaterThan(0);
    });
  });
});
