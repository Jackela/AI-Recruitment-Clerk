import type {
  IUsageLimitRepository,
  IDomainEventBus,
  IAuditLogger} from './usage-limit.service';
import {
  UsageLimitDomainService,
  UsageLimitResult,
  UsageTrackingResult,
  UsageAnalysisResult
} from './usage-limit.service';
import {
  UsageLimit,
  UsageLimitPolicy,
  BonusType,
} from './usage-limit.dto';

describe('UsageLimitDomainService', () => {
  let service: UsageLimitDomainService;
  let mockRepository: jest.Mocked<IUsageLimitRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;

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
    const validIP = '192.168.1.1';

    it('should create new usage limit for new IP', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.checkUsageLimit(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.dailyLimit).toBeGreaterThan(0);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'USAGE_LIMIT_CREATED',
        expect.any(Object),
      );
    });

    it('should check existing usage limit', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.checkUsageLimit(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.remainingQuota).toBe(policy.dailyLimit);
    });

    it('should reject invalid IP address', async () => {
      const result = await service.checkUsageLimit('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        'INVALID_IP_ACCESS',
        expect.any(Object),
      );
    });

    it('should log violation when limit exceeded', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);

      // Max out the usage
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.checkUsageLimit(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(mockAuditLogger.logViolation).toHaveBeenCalledWith(
        'USAGE_LIMIT_EXCEEDED',
        expect.any(Object),
      );
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('Database error'));

      const result = await service.checkUsageLimit(validIP);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred while checking usage limit');
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });

    it('should publish domain events', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);
      usageLimit.recordUsage(); // Generate an event
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      await service.checkUsageLimit(validIP);

      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('recordUsage', () => {
    const validIP = '192.168.1.1';

    it('should record usage successfully', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.recordUsage(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.currentUsage).toBe(1);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'USAGE_RECORDED',
        expect.any(Object),
      );
    });

    it('should reject invalid IP address', async () => {
      const result = await service.recordUsage('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid IP address format');
    });

    it('should fail when usage limit not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.recordUsage(validIP);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usage limit not found. Please check limit first.');
    });

    it('should handle exceeded limits', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);

      // Max out usage
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.recordUsage(validIP);

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'USAGE_RECORDING_FAILED',
        expect.any(Object),
      );
    });

    it('should handle errors during recording', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.recordUsage(validIP);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal error occurred while recording usage');
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('addBonusQuota', () => {
    const validIP = '192.168.1.1';

    it('should add bonus quota successfully', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.addBonusQuota(validIP, BonusType.QUESTIONNAIRE);

      expect(result.success).toBe(true);
      expect(result.data?.addedAmount).toBeGreaterThan(0);
      expect(result.data?.bonusType).toBe(BonusType.QUESTIONNAIRE);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'BONUS_QUOTA_ADDED',
        expect.any(Object),
      );
    });

    it('should support custom bonus amounts within limits', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      // Use a valid custom amount that doesn't exceed 2x the standard bonus
      // PAYMENT bonus is 10, so we can use up to 20
      const result = await service.addBonusQuota(validIP, BonusType.PAYMENT, 15);

      expect(result.success).toBe(true);
      expect(result.data?.addedAmount).toBe(15);
    });

    it('should reject invalid IP address', async () => {
      const result = await service.addBonusQuota('invalid-ip', BonusType.QUESTIONNAIRE);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should fail when usage limit not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.addBonusQuota(validIP, BonusType.QUESTIONNAIRE);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Usage limit not found for IP');
    });

    it('should reject excessive bonus amounts', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);

      // Add bonus to near max
      usageLimit.addBonusQuota(BonusType.PAYMENT, 15);

      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.addBonusQuota(validIP, BonusType.PAYMENT, 10);

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'BONUS_QUOTA_REJECTED',
        expect.any(Object),
      );
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.addBonusQuota(validIP, BonusType.QUESTIONNAIRE);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred while adding bonus quota');
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('getUsageStatistics', () => {
    const validIP = '192.168.1.1';

    it('should get individual IP statistics', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.getUsageStatistics(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.individual).toBeDefined();
      expect(result.data?.individual?.ip).toBe(validIP);
      expect(result.data?.individual?.efficiency).toBeDefined();
    });

    it('should get system-wide statistics when no IP provided', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getUsageStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.system).toBeDefined();
      expect(result.data?.system?.totalIPs).toBe(0);
    });

    it('should calculate system statistics correctly', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit1 = UsageLimit.create('192.168.1.1', policy);
      const usageLimit2 = UsageLimit.create('192.168.1.2', policy);

      usageLimit1.recordUsage();
      usageLimit2.recordUsage();

      mockRepository.findAll.mockResolvedValue([usageLimit1, usageLimit2]);

      const result = await service.getUsageStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.system?.totalIPs).toBe(2);
      expect(result.data?.system?.totalUsage).toBeGreaterThan(0);
    });

    it('should reject invalid IP address', async () => {
      const result = await service.getUsageStatistics('invalid-ip');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should fail when IP not found', async () => {
      mockRepository.findByIP.mockResolvedValue(null);

      const result = await service.getUsageStatistics(validIP);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Usage limit not found for IP');
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('DB error'));

      const result = await service.getUsageStatistics(validIP);

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('analyzeUsagePatterns', () => {
    it('should analyze usage patterns in time range', async () => {
      const timeRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);
      usageLimit.recordUsage();

      mockRepository.findByTimeRange.mockResolvedValue([usageLimit]);

      const result = await service.analyzeUsagePatterns(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.totalAnalyzedIPs).toBe(1);
      expect(result.data?.patterns).toBeDefined();
      expect(result.data?.hourlyDistribution).toBeDefined();
      expect(result.data?.dailyDistribution).toBeDefined();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'USAGE_ANALYSIS_PERFORMED',
        expect.any(Object),
      );
    });

    it('should return empty result when no data in range', async () => {
      const timeRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      mockRepository.findByTimeRange.mockResolvedValue([]);

      const result = await service.analyzeUsagePatterns(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.totalAnalyzedIPs).toBe(0);
    });

    it('should handle analysis errors', async () => {
      const timeRange = {
        startDate: new Date(),
        endDate: new Date(),
      };

      mockRepository.findByTimeRange.mockRejectedValue(new Error('DB error'));

      const result = await service.analyzeUsagePatterns(timeRange);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred during analysis');
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('getHighRiskIPs', () => {
    it('should identify high risk IPs', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Max out usage to create high risk
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      mockRepository.findAll.mockResolvedValue([usageLimit]);

      const result = await service.getHighRiskIPs();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter out low risk IPs', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const lowRiskLimit = UsageLimit.create('192.168.1.1', policy);
      lowRiskLimit.recordUsage(); // Only 1 usage - low risk

      mockRepository.findAll.mockResolvedValue([lowRiskLimit]);

      const result = await service.getHighRiskIPs();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });

    it('should sort by risk score descending', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const highRisk = UsageLimit.create('192.168.1.1', policy);
      const mediumRisk = UsageLimit.create('192.168.1.2', policy);

      // Create different risk levels
      for (let i = 0; i < policy.dailyLimit; i++) {
        highRisk.recordUsage();
      }
      for (let i = 0; i < Math.floor(policy.dailyLimit * 0.7); i++) {
        mediumRisk.recordUsage();
      }

      mockRepository.findAll.mockResolvedValue([mediumRisk, highRisk]);

      const result = await service.getHighRiskIPs();

      expect(result.success).toBe(true);
      if (result.data && result.data.length > 1) {
        expect(result.data[0].riskScore).toBeGreaterThanOrEqual(result.data[1].riskScore);
      }
    });

    it('should recommend appropriate actions based on risk score', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const highRisk = UsageLimit.create('192.168.1.1', policy);

      for (let i = 0; i < policy.dailyLimit; i++) {
        highRisk.recordUsage();
      }

      mockRepository.findAll.mockResolvedValue([highRisk]);

      const result = await service.getHighRiskIPs();

      expect(result.success).toBe(true);
      if (result.data && result.data.length > 0) {
        expect(['WARN', 'MONITOR', 'BLOCK']).toContain(result.data[0].recommendedAction);
      }
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('DB error'));

      const result = await service.getHighRiskIPs();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred during risk assessment');
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('Result Classes', () => {
    it('should create successful UsageLimitResult', () => {
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

    it('should create failed UsageLimitResult', () => {
      const result = UsageLimitResult.failed(['Error 1']);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toEqual(['Error 1']);
    });

    it('should create successful UsageTrackingResult', () => {
      const result = UsageTrackingResult.success({
        currentUsage: 1,
        remainingQuota: 4,
        timestamp: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.currentUsage).toBe(1);
    });

    it('should create failed UsageTrackingResult', () => {
      const result = UsageTrackingResult.failed('Tracking error');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tracking error');
    });

    it('should create empty UsageAnalysisResult', () => {
      const result = UsageAnalysisResult.empty();

      expect(result.success).toBe(true);
      expect(result.data?.totalAnalyzedIPs).toBe(0);
      expect(result.data?.patterns).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent usage checks', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const results = await Promise.all([
        service.checkUsageLimit('192.168.1.1'),
        service.checkUsageLimit('192.168.1.1'),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle time range boundaries correctly', async () => {
      const timeRange = {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-01T23:59:59Z'),
      };

      mockRepository.findByTimeRange.mockResolvedValue([]);

      const result = await service.analyzeUsagePatterns(timeRange);

      expect(result.success).toBe(true);
      expect(mockRepository.findByTimeRange).toHaveBeenCalledWith(
        timeRange.startDate,
        timeRange.endDate,
      );
    });

    it('should handle maximum bonus quota correctly', async () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Add bonus up to max
      usageLimit.addBonusQuota(BonusType.PAYMENT, 20);

      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await service.addBonusQuota('192.168.1.1', BonusType.QUESTIONNAIRE);

      expect(result.success).toBe(false);
    });
  });
});
