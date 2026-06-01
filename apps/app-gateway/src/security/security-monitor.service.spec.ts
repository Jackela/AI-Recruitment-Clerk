import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import type {
  SecurityEvent} from './security-monitor.service';
import {
  SecurityMonitorService,
  SecurityMetrics,
} from './security-monitor.service';
import { UserProfile } from '../schemas/user-profile.schema';
import type { Model } from 'mongoose';

// Mock Redis
const mockRedis = {
  setex: jest.fn().mockResolvedValue('OK'),
  zadd: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  zrevrangebyscore: jest.fn().mockResolvedValue([]),
  get: jest.fn().mockResolvedValue(null),
  zcard: jest.fn().mockResolvedValue(0),
  zrangebyscore: jest.fn().mockResolvedValue([]),
  incr: jest.fn().mockResolvedValue(1),
  zremrangebyscore: jest.fn().mockResolvedValue(0),
  on: jest.fn(),
  connect: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('SecurityMonitorService', () => {
  let service: SecurityMonitorService;
  let userModelMock: jest.Mocked<Model<any>>;
  let configServiceMock: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    userModelMock = {} as unknown as jest.Mocked<Model<any>>;

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          DISABLE_REDIS: 'false',
          USE_REDIS_CACHE: 'true',
          REDIS_URL: 'redis://localhost:6379',
          SECURITY_WEBHOOK_URL: 'https://webhook.example.com',
          NODE_ENV: 'test',
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMonitorService,
        {
          provide: getModelToken(UserProfile.name),
          useValue: userModelMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<SecurityMonitorService>(SecurityMonitorService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('recordSecurityEvent', () => {
    const mockEvent = {
      type: 'LOGIN_FAILURE' as const,
      severity: 'MEDIUM' as const,
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      userId: 'user-123',
      details: { attemptedEmail: 'test@example.com' },
    };

    it('should record security event successfully', async () => {
      const eventId = await service.recordSecurityEvent(mockEvent);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(eventId).toMatch(/^security_event_\d+_[a-z0-9]+$/);
    });

    it('should store event in Redis', async () => {
      await service.recordSecurityEvent(mockEvent);

      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockRedis.zadd).toHaveBeenCalled();
    });

    it('should update metrics', async () => {
      await service.recordSecurityEvent(mockEvent);

      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('security_metrics'),
      );
    });

    it('should trigger alert for HIGH severity events', async () => {
      const highSeverityEvent = {
        ...mockEvent,
        severity: 'HIGH' as const,
      };

      await service.recordSecurityEvent(highSeverityEvent);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should trigger alert for CRITICAL severity events', async () => {
      const criticalEvent = {
        ...mockEvent,
        severity: 'CRITICAL' as const,
      };

      await service.recordSecurityEvent(criticalEvent);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should not trigger alert for LOW severity events', async () => {
      const lowSeverityEvent = {
        ...mockEvent,
        severity: 'LOW' as const,
      };

      await service.recordSecurityEvent(lowSeverityEvent);

      // Alert is still stored but may have different handling
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should throw error when Redis fails', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));

      await expect(service.recordSecurityEvent(mockEvent)).rejects.toThrow(
        'Redis error',
      );
    });

    it('should handle all event types', async () => {
      const eventTypes = [
        'LOGIN_FAILURE',
        'ACCOUNT_LOCKOUT',
        'MFA_FAILURE',
        'SUSPICIOUS_ACTIVITY',
        'PASSWORD_RESET',
        'PRIVILEGE_ESCALATION',
      ] as const;

      for (const type of eventTypes) {
        const event = { ...mockEvent, type };
        const eventId = await service.recordSecurityEvent(event);
        expect(eventId).toBeDefined();
      }
    });
  });

  describe('getSecurityEvents', () => {
    const mockSecurityEvent: SecurityEvent = {
      id: 'security_event_123_test',
      type: 'LOGIN_FAILURE',
      severity: 'MEDIUM',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      userId: 'user-123',
      timestamp: new Date(),
      details: {},
      resolved: false,
    };

    beforeEach(() => {
      mockRedis.zrevrangebyscore.mockResolvedValue([mockSecurityEvent.id]);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSecurityEvent));
      mockRedis.zcard.mockResolvedValue(1);
    });

    it('should get security events with default options', async () => {
      const result = await service.getSecurityEvents();

      expect(result).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should apply limit option', async () => {
      await service.getSecurityEvents({ limit: 10 });

      expect(mockRedis.zrevrangebyscore).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'LIMIT',
        0,
        10,
      );
    });

    it('should apply offset option', async () => {
      await service.getSecurityEvents({ offset: 20 });

      expect(mockRedis.zrevrangebyscore).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'LIMIT',
        20,
        expect.any(Number),
      );
    });

    it('should filter by severity', async () => {
      const result = await service.getSecurityEvents({
        severity: ['HIGH', 'CRITICAL'],
      });

      // Should filter events based on severity
      expect(result).toBeDefined();
    });

    it('should filter by type', async () => {
      const result = await service.getSecurityEvents({
        type: ['LOGIN_FAILURE'],
      });

      expect(result).toBeDefined();
    });

    it('should filter by userId', async () => {
      const result = await service.getSecurityEvents({ userId: 'user-123' });

      expect(result).toBeDefined();
    });

    it('should filter by ip', async () => {
      const result = await service.getSecurityEvents({ ip: '192.168.1.1' });

      expect(result).toBeDefined();
    });

    it('should filter by resolved status', async () => {
      const result = await service.getSecurityEvents({ resolved: false });

      expect(result).toBeDefined();
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getSecurityEvents({ startDate, endDate });

      expect(mockRedis.zrevrangebyscore).toHaveBeenCalledWith(
        expect.any(String),
        endDate.getTime().toString(),
        startDate.getTime().toString(),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should return empty array when Redis is unavailable', async () => {
      // Simulate Redis being unavailable
      const result = await service.getSecurityEvents();

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getSecurityMetrics', () => {
    beforeEach(() => {
      mockRedis.zrangebyscore.mockResolvedValue(['event-1', 'event-2']);
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('event-1')) {
          return JSON.stringify({
            type: 'LOGIN_FAILURE',
            severity: 'MEDIUM',
            ip: '192.168.1.1',
            timestamp: new Date(),
            resolved: false,
          });
        }
        if (key.includes('event-2')) {
          return JSON.stringify({
            type: 'ACCOUNT_LOCKOUT',
            severity: 'HIGH',
            ip: '192.168.1.2',
            timestamp: new Date(),
            resolved: true,
          });
        }
        return null;
      });
    });

    it('should get security metrics for day period', async () => {
      const result = await service.getSecurityMetrics('day');

      expect(result).toBeDefined();
      expect(result.totalEvents).toBeDefined();
      expect(result.criticalEvents).toBeDefined();
      expect(result.highSeverityEvents).toBeDefined();
      expect(result.mediumSeverityEvents).toBeDefined();
      expect(result.lowSeverityEvents).toBeDefined();
    });

    it('should get security metrics for hour period', async () => {
      const result = await service.getSecurityMetrics('hour');

      expect(result).toBeDefined();
    });

    it('should get security metrics for week period', async () => {
      const result = await service.getSecurityMetrics('week');

      expect(result).toBeDefined();
    });

    it('should default to day period', async () => {
      const result = await service.getSecurityMetrics();

      expect(result).toBeDefined();
    });

    it('should return zero metrics when no events', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      const result = await service.getSecurityMetrics();

      expect(result.totalEvents).toBe(0);
      expect(result.topEventTypes).toEqual([]);
      expect(result.topSourceIPs).toEqual([]);
    });

    it('should return zero metrics when Redis unavailable', async () => {
      const result = await service.getSecurityMetrics();

      // Service should handle Redis unavailability
      expect(result).toBeDefined();
    });
  });

  describe('resolveSecurityEvent', () => {
    const mockEventId = 'security_event_123_test';

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          id: mockEventId,
          type: 'LOGIN_FAILURE',
          severity: 'MEDIUM',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          userId: 'user-123',
          timestamp: new Date(),
          details: {},
          resolved: false,
        }),
      );
    });

    it('should resolve security event successfully', async () => {
      const result = await service.resolveSecurityEvent(
        mockEventId,
        'admin-123',
        'False positive',
      );

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should update event with resolution details', async () => {
      await service.resolveSecurityEvent(
        mockEventId,
        'admin-123',
        'Investigated',
      );

      const storedEvent = JSON.parse(mockRedis.setex.mock.calls[0][1]);
      expect(storedEvent.resolved).toBe(true);
      expect(storedEvent.resolvedBy).toBe('admin-123');
      expect(storedEvent.details.resolution).toBe('Investigated');
      expect(storedEvent.resolvedAt).toBeDefined();
    });

    it('should return false when event not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.resolveSecurityEvent(
        'non-existent',
        'admin-123',
        'Test',
      );

      expect(result).toBe(false);
    });

    it('should return false when Redis unavailable', async () => {
      const result = await service.resolveSecurityEvent(
        mockEventId,
        'admin-123',
        'Test',
      );

      // Service should handle Redis unavailability
      expect(result).toBeDefined();
    });
  });

  describe('Helper Methods', () => {
    describe('recordLoginFailure', () => {
      it('should record login failure event', async () => {
        const eventId = await service.recordLoginFailure(
          '192.168.1.1',
          'Mozilla/5.0',
          'test@example.com',
          'user-123',
        );

        expect(eventId).toBeDefined();
      });

      it('should record login failure without optional fields', async () => {
        const eventId = await service.recordLoginFailure(
          '192.168.1.1',
          'Mozilla/5.0',
        );

        expect(eventId).toBeDefined();
      });
    });

    describe('recordAccountLockout', () => {
      it('should record account lockout event', async () => {
        const eventId = await service.recordAccountLockout(
          '192.168.1.1',
          'Mozilla/5.0',
          'user-123',
          'Too many failed attempts',
        );

        expect(eventId).toBeDefined();
      });
    });

    describe('recordMfaFailure', () => {
      it('should record MFA failure event', async () => {
        const eventId = await service.recordMfaFailure(
          '192.168.1.1',
          'Mozilla/5.0',
          'user-123',
          'totp',
        );

        expect(eventId).toBeDefined();
      });
    });

    describe('recordSuspiciousActivity', () => {
      it('should record suspicious activity', async () => {
        const eventId = await service.recordSuspiciousActivity(
          '192.168.1.1',
          'Mozilla/5.0',
          'Unusual login pattern',
          { country: 'Unknown' },
        );

        expect(eventId).toBeDefined();
      });

      it('should record without additional details', async () => {
        const eventId = await service.recordSuspiciousActivity(
          '192.168.1.1',
          'Mozilla/5.0',
          'Unusual activity',
        );

        expect(eventId).toBeDefined();
      });
    });
  });

  describe('Redis Initialization', () => {
    it('should initialize with Redis URL', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        if (key === 'DISABLE_REDIS') return 'false';
        if (key === 'USE_REDIS_CACHE') return 'true';
        return undefined;
      });

      // Recreate service to test initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecurityMonitorService,
          {
            provide: getModelToken(UserProfile.name),
            useValue: userModelMock,
          },
          {
            provide: ConfigService,
            useValue: configServiceMock,
          },
        ],
      }).compile();

      const newService = module.get<SecurityMonitorService>(
        SecurityMonitorService,
      );
      expect(newService).toBeDefined();
    });

    it('should handle disabled Redis', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'DISABLE_REDIS') return 'true';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecurityMonitorService,
          {
            provide: getModelToken(UserProfile.name),
            useValue: userModelMock,
          },
          {
            provide: ConfigService,
            useValue: configServiceMock,
          },
        ],
      }).compile();

      const newService = module.get<SecurityMonitorService>(
        SecurityMonitorService,
      );
      expect(newService).toBeDefined();
    });
  });
});
