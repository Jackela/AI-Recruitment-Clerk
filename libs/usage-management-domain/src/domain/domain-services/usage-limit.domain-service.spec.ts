import {
  UsageLimitDomainService,
  UsageLimitResult,
  UsageTrackingResult,
  BonusQuotaResult,
  UsageStatsResult,
} from './usage-limit.domain-service';
import { UsageLimit } from '../aggregates/usage-limit.aggregate';
import { UsageLimitPolicy } from '../value-objects/usage-limit-policy.value-object';
import { BonusType } from '../../application/dtos/usage-limit.dto';
import type { IUsageLimitRepository } from './usage-limit.domain-service';
import type { IDomainEventBus } from './usage-limit.domain-service';
import type { IAuditLogger } from './usage-limit.domain-service';
import { UsageEfficiency } from './usage-limit.rules';

describe('UsageLimitDomainService', () => {
  let service: UsageLimitDomainService;
  let mockRepository: jest.Mocked<IUsageLimitRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;

  const createMockPolicy = (): UsageLimitPolicy => {
    return UsageLimitPolicy.restore({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 20,
      resetTimeUTC: 0,
    });
  };

  const createMockUsageLimit = (ip: string): UsageLimit => {
    return UsageLimit.create(ip, createMockPolicy());
  };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByIP: jest.fn(),
      findAll: jest.fn(),
      findByTimeRange: jest.fn(),
      deleteExpired: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditLogger = {
      logBusinessEvent: jest.fn().mockResolvedValue(undefined),
      logSecurityEvent: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
      logViolation: jest.fn().mockResolvedValue(undefined),
    };

    service = new UsageLimitDomainService(
      mockRepository,
      mockEventBus,
      mockAuditLogger,
    );
  });

  describe('checkUsageLimit', () => {
    it('should return success for valid IP with quota available', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.checkUsageLimit('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.remainingQuota).toBe(5);
      expect(result.data?.currentUsage).toBe(0);
    });

    it('should create new usage limit if not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);

      const result = await service.checkUsageLimit('192.168.1.1');

      expect(result.success).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'USAGE_LIMIT_CREATED',
        expect.any(Object),
      );
    });

    it('should reject invalid IP address', async () => {
      const result = await service.checkUsageLimit('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        'INVALID_IP_ACCESS',
        { ip: 'invalid-ip' },
      );
    });

    it('should return blocked result when quota exhausted', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      for (let i = 0; i < 5; i++) {
        mockUsageLimit.recordUsage();
      }
      mockUsageLimit.markEventsAsCommitted();
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.checkUsageLimit('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.remainingQuota).toBe(0);
      expect(mockAuditLogger.logViolation).toHaveBeenCalled();
    });

    it('should handle repository error', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.checkUsageLimit('192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while checking usage limit',
      );
    });
  });

  describe('recordUsage', () => {
    it('should record usage successfully', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.recordUsage('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.currentUsage).toBe(1);
      expect(result.data?.remainingQuota).toBe(4);
      expect(result.data?.timestamp).toBeInstanceOf(Date);
    });

    it('should fail for invalid IP', async () => {
      const result = await service.recordUsage('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid IP address format');
    });

    it('should fail if usage limit not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.recordUsage('192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Usage limit not found. Please check limit first.',
      );
    });

    it('should fail when quota exceeded', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      for (let i = 0; i < 5; i++) {
        mockUsageLimit.recordUsage();
      }
      mockUsageLimit.markEventsAsCommitted();
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.recordUsage('192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily usage limit reached');
    });

    it('should handle repository error', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.recordUsage('192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Internal error occurred while recording usage',
      );
    });
  });

  describe('addBonusQuota', () => {
    it('should add bonus quota successfully', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.addBonusQuota(
        '192.168.1.1',
        BonusType.QUESTIONNAIRE,
      );

      expect(result.success).toBe(true);
      expect(result.data?.addedAmount).toBe(5);
      expect(result.data?.bonusType).toBe(BonusType.QUESTIONNAIRE);
    });

    it('should fail for invalid IP', async () => {
      const result = await service.addBonusQuota(
        'invalid-ip',
        BonusType.QUESTIONNAIRE,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should fail if usage limit not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.addBonusQuota(
        '192.168.1.1',
        BonusType.QUESTIONNAIRE,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Usage limit not found for IP');
    });

    it('should reject bonus quota that exceeds max', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.addBonusQuota(
        '192.168.1.1',
        BonusType.PAYMENT,
        100,
      );

      expect(result.success).toBe(false);
    });

    it('should handle custom bonus amount', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.addBonusQuota(
        '192.168.1.1',
        BonusType.QUESTIONNAIRE,
        3,
      );

      expect(result.success).toBe(true);
      expect(result.data?.addedAmount).toBe(3);
    });
  });

  describe('getUsageStatistics', () => {
    it('should return individual statistics for valid IP', async () => {
      const mockUsageLimit = createMockUsageLimit('192.168.1.1');
      mockUsageLimit.recordUsage();
      mockUsageLimit.recordUsage();
      mockRepository.findByIP.mockResolvedValue(mockUsageLimit);

      const result = await service.getUsageStatistics('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.individual).toBeDefined();
      expect(result.data?.individual?.ip).toBe('192.168.1.1');
      expect(result.data?.individual?.currentUsage).toBe(2);
      expect(result.data?.individual?.dailyLimit).toBe(5);
    });

    it('should return system statistics when no IP provided', async () => {
      const mockUsageLimits = [
        createMockUsageLimit('192.168.1.1'),
        createMockUsageLimit('192.168.1.2'),
      ];
      mockUsageLimits[0].recordUsage();
      mockRepository.findAll.mockResolvedValue(mockUsageLimits);

      const result = await service.getUsageStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.system).toBeDefined();
      expect(result.data?.system?.totalIPs).toBe(2);
    });

    it('should fail for invalid IP', async () => {
      const result = await service.getUsageStatistics('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should fail if usage limit not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.getUsageStatistics('192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Usage limit not found for IP');
    });
  });
});

describe('Result Classes', () => {
  describe('UsageLimitResult', () => {
    it('should create success result', () => {
      const result = UsageLimitResult.success({
        allowed: true,
        remainingQuota: 5,
        currentUsage: 0,
        dailyLimit: 5,
        resetAt: new Date(),
        bonusQuota: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should create failed result', () => {
      const result = UsageLimitResult.failed(['Error 1', 'Error 2']);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Error 1', 'Error 2']);
      expect(result.data).toBeUndefined();
    });
  });

  describe('UsageTrackingResult', () => {
    it('should create success result', () => {
      const timestamp = new Date();
      const result = UsageTrackingResult.success({
        currentUsage: 3,
        remainingQuota: 2,
        timestamp,
      });

      expect(result.success).toBe(true);
      expect(result.data?.currentUsage).toBe(3);
      expect(result.error).toBeUndefined();
    });

    it('should create failed result', () => {
      const result = UsageTrackingResult.failed('Usage limit exceeded');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usage limit exceeded');
    });
  });

  describe('BonusQuotaResult', () => {
    it('should create success result', () => {
      const result = BonusQuotaResult.success({
        addedAmount: 5,
        newTotalQuota: 10,
        bonusType: BonusType.QUESTIONNAIRE,
      });

      expect(result.success).toBe(true);
      expect(result.data?.addedAmount).toBe(5);
      expect(result.errors).toBeUndefined();
    });

    it('should create failed result with errors', () => {
      const result = BonusQuotaResult.failed(['Invalid bonus type']);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Invalid bonus type']);
    });
  });

  describe('UsageStatsResult', () => {
    it('should create success result with individual stats', () => {
      const efficiency = new UsageEfficiency({
        baseUtilization: 0.4,
        bonusUtilization: 0,
        overallEfficiency: 0.2,
        wasteageScore: 0.6,
      });

      const result = UsageStatsResult.success({
        individual: {
          ip: '192.168.1.1',
          currentUsage: 2,
          dailyLimit: 5,
          availableQuota: 3,
          bonusQuota: 0,
          resetAt: new Date(),
          usagePercentage: 40,
          efficiency,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.individual?.ip).toBe('192.168.1.1');
    });

    it('should create success result with system stats', () => {
      const result = UsageStatsResult.success({
        system: {
          totalIPs: 10,
          activeIPs: 5,
          totalUsage: 25,
          totalQuota: 50,
          totalBonusQuota: 5,
          systemUtilization: 50,
          averageUsagePerIP: 2.5,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.system?.totalIPs).toBe(10);
    });

    it('should create failed result', () => {
      const result = UsageStatsResult.failed(['IP not found']);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['IP not found']);
    });
  });
});
