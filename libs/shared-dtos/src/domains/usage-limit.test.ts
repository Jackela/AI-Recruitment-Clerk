import {
  UsageLimit,
  UsageLimitId,
  IPAddress,
  UsageLimitPolicy,
  QuotaAllocation,
  UsageTracking,
  BonusType,
  UsageLimitCheckResult,
  UsageRecordResult,
  UsageStatistics,
} from './usage-limit.dto';

import {
  UsageLimitRules,
  ViolationType,
  RecommendedAction,
} from './usage-limit.rules';
import { UsageLimitContracts } from '../contracts/usage-limit.contracts';
import {
  UsageLimitDomainService,
  UsageLimitResult,
  UsageTrackingResult,
  BonusQuotaResult,
  UsageStatsResult,
} from './usage-limit.service';

describe('Agent-2: UsageLimit Domain Service Tests', () => {
  // Test Data
  const validIP = '192.168.1.100';
  const invalidIP = 'not-an-ip';
  const policy = UsageLimitPolicy.createDefault();

  // Mock implementations
  const mockRepository = {
    save: jest.fn(),
    findByIP: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findByTimeRange: jest.fn().mockResolvedValue([]),
    deleteExpired: jest.fn().mockResolvedValue(0),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockAuditLogger = {
    logBusinessEvent: jest.fn(),
    logSecurityEvent: jest.fn(),
    logError: jest.fn(),
    logViolation: jest.fn(),
  };

  const domainService = new UsageLimitDomainService(
    mockRepository,
    mockEventBus,
    mockAuditLogger,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. UsageLimit Aggregate Creation', () => {
    it('should create usage limit with valid IP and policy', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      expect(usageLimit).toBeDefined();
      expect(usageLimit.getId().getValue()).toMatch(/^usage_/);
      expect(usageLimit.getIP()).toBe(validIP);
      expect(usageLimit.getCurrentUsage()).toBe(0);
      expect(usageLimit.getAvailableQuota()).toBe(policy.dailyLimit);
    });

    it('should generate unique IDs for different usage limits', () => {
      const limit1 = UsageLimit.create(validIP, policy);
      const limit2 = UsageLimit.create('192.168.1.101', policy);

      expect(limit1.getId().getValue()).not.toBe(limit2.getId().getValue());
    });

    it('should publish domain events on creation', () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      const events = usageLimit.getUncommittedEvents();

      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('UsageLimitCreatedEvent');
    });

    it('should throw error for invalid IP address', () => {
      expect(() => {
        new IPAddress({ value: invalidIP });
      }).toThrow('Invalid IPv4 address');
    });
  });

  describe('2. Usage Limit Checking', () => {
    it('should allow usage when under limit', () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      const result = usageLimit.canUse();

      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(policy.dailyLimit);
    });

    it('should block usage when at limit', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      // Use up all quota
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      const result = usageLimit.canUse();
      expect(result.isAllowed()).toBe(false);
      expect(result.getBlockReason()).toContain('Daily usage limit reached');
    });

    it('should provide accurate remaining quota', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      // Use 2 out of 5
      usageLimit.recordUsage();
      usageLimit.recordUsage();

      const result = usageLimit.canUse();
      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(3);
    });

    it('should publish violation event when limit exceeded', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      // Use up all quota
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      // Clear creation event
      usageLimit.markEventsAsCommitted();

      // Try to check usage when at limit
      usageLimit.canUse();

      const events = usageLimit.getUncommittedEvents();
      const violationEvent = events.find(
        (e) => e.constructor.name === 'UsageLimitExceededEvent',
      );
      expect(violationEvent).toBeDefined();
    });
  });

  describe('3. Usage Recording', () => {
    it('should successfully record usage when allowed', () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      const result = usageLimit.recordUsage();

      expect(result.isSuccess()).toBe(true);
      expect(result.getCurrentUsage()).toBe(1);
      expect(result.getRemainingQuota()).toBe(policy.dailyLimit - 1);
      expect(usageLimit.getCurrentUsage()).toBe(1);
    });

    it('should fail to record usage when limit reached', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      // Use up all quota
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      const result = usageLimit.recordUsage();
      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toContain('Daily usage limit reached');
    });

    it('should publish usage recorded events', () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      usageLimit.markEventsAsCommitted(); // Clear creation event

      usageLimit.recordUsage();

      const events = usageLimit.getUncommittedEvents();
      const usageEvent = events.find(
        (e) => e.constructor.name === 'UsageRecordedEvent',
      );
      expect(usageEvent).toBeDefined();
    });

    it('should maintain usage history', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      usageLimit.recordUsage();
      usageLimit.recordUsage();

      const stats = usageLimit.getUsageStatistics();
      expect(stats.currentUsage).toBe(2);
      expect(stats.lastActivityAt).toBeDefined();
    });
  });

  describe('4. Bonus Quota Management', () => {
    it('should add questionnaire bonus quota correctly', () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      const initialQuota = usageLimit.getAvailableQuota();

      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 5);

      expect(usageLimit.getAvailableQuota()).toBe(initialQuota + 5);
      const stats = usageLimit.getUsageStatistics();
      expect(stats.bonusQuota).toBe(5);
    });

    it('should add payment bonus quota correctly', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      usageLimit.addBonusQuota(BonusType.PAYMENT, 10);

      const stats = usageLimit.getUsageStatistics();
      expect(stats.bonusQuota).toBe(10);
    });

    it('should allow usage with bonus quota', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      // Use up base quota
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      // Add bonus quota
      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 5);

      // Should now be allowed
      const result = usageLimit.canUse();
      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(5);
    });

    it('should throw error for invalid bonus amount', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      expect(() => {
        usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 0);
      }).toThrow('Bonus quota amount must be positive');

      expect(() => {
        usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, -5);
      }).toThrow('Bonus quota amount must be positive');
    });

    it('should publish bonus quota added events', () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      usageLimit.markEventsAsCommitted(); // Clear creation event

      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 5);

      const events = usageLimit.getUncommittedEvents();
      const bonusEvent = events.find(
        (e) => e.constructor.name === 'BonusQuotaAddedEvent',
      );
      expect(bonusEvent).toBeDefined();
    });
  });

  describe('5. Daily Reset Logic', () => {
    it('should identify when daily reset is needed', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const shouldReset = UsageLimitRules.shouldResetUsage(yesterday);
      expect(shouldReset).toBe(true);
    });

    it('should not reset on same day', () => {
      const now = new Date();
      const shouldReset = UsageLimitRules.shouldResetUsage(now);
      expect(shouldReset).toBe(false);
    });

    it('should calculate correct next reset time', () => {
      const nextReset = UsageLimitRules.getNextResetTime();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      expect(nextReset.getTime()).toBe(tomorrow.getTime());
    });
  });

  describe('6. Business Rules Validation', () => {
    it('should validate IP address format', () => {
      expect(UsageLimitRules.isValidIPAddress(validIP)).toBe(true);
      expect(UsageLimitRules.isValidIPAddress(invalidIP)).toBe(false);
      expect(UsageLimitRules.isValidIPAddress('')).toBe(false);
      expect(UsageLimitRules.isValidIPAddress('999.999.999.999')).toBe(false);
    });

    it('should calculate correct bonus amounts', () => {
      expect(UsageLimitRules.calculateBonusQuota(BonusType.QUESTIONNAIRE)).toBe(
        5,
      );
      expect(UsageLimitRules.calculateBonusQuota(BonusType.PAYMENT)).toBe(10);
      expect(UsageLimitRules.calculateBonusQuota(BonusType.REFERRAL)).toBe(3);
      expect(UsageLimitRules.calculateBonusQuota(BonusType.PROMOTION)).toBe(2);
    });

    it('should validate bonus quota limits', () => {
      expect(UsageLimitRules.isValidBonusQuota(15, 5)).toBe(true); // 15 + 5 = 20 (at limit)
      expect(UsageLimitRules.isValidBonusQuota(18, 5)).toBe(false); // 18 + 5 = 23 (over limit)
    });

    it('should validate usage policy correctly', () => {
      const validPolicy = UsageLimitPolicy.createDefault();
      expect(UsageLimitRules.isValidUsagePolicy(validPolicy)).toBe(true);

      const invalidPolicy = new UsageLimitPolicy({
        dailyLimit: -1, // Invalid
        bonusEnabled: true,
        maxBonusQuota: 20,
        resetTimeUTC: 0,
      });
      expect(UsageLimitRules.isValidUsagePolicy(invalidPolicy)).toBe(false);
    });

    it('should detect rate limiting', () => {
      const now = new Date();
      const recentUsage: Array<{ timestamp: Date; count: number }> = [];

      // Create 10 recent usage records (just under limit)
      for (let i = 0; i < 10; i++) {
        recentUsage.push({
          timestamp: new Date(now.getTime() - i * 5000), // 5 seconds apart
          count: i + 1,
        });
      }

      expect(UsageLimitRules.isRateLimited(recentUsage)).toBe(true);
    });
  });

  describe('7. Risk Assessment', () => {
    it('should calculate risk score correctly', () => {
      const highUsageStats = new UsageStatistics({
        ip: validIP,
        currentUsage: 9,
        dailyLimit: 10,
        availableQuota: 10,
        bonusQuota: 0,
        resetAt: new Date(),
        lastActivityAt: new Date(),
      });

      const riskScore = UsageLimitRules.calculateRiskScore(highUsageStats);
      expect(riskScore.score).toBeGreaterThan(0);
      expect(riskScore.factors.length).toBeGreaterThan(0);
    });

    it('should generate violation reports', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      // Use up quota to create violation
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      const report = UsageLimitRules.generateViolationReport(
        validIP,
        usageLimit,
      );
      expect(report.ip).toBe(validIP);
      expect(report.currentUsage).toBe(policy.dailyLimit);
      expect(report.violationType).toBe(ViolationType.QUOTA_EXCEEDED);
    });
  });

  describe('8. Contract-based Programming', () => {
    it('should enforce preconditions in checkUsageLimit', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      expect(() => {
        UsageLimitContracts.checkUsageLimit('', usageLimit);
      }).toThrow('IP address is required');

      expect(() => {
        UsageLimitContracts.checkUsageLimit(invalidIP, usageLimit);
      }).toThrow('IP address must be valid IPv4 format');
    });

    it('should validate postconditions in recordUsage', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      expect(() => {
        UsageLimitContracts.recordUsage(validIP, usageLimit);
      }).not.toThrow();

      // After using up quota, the contract should still not throw
      // but the recordUsage result should indicate failure
      for (let i = 0; i < policy.dailyLimit - 1; i++) {
        usageLimit.recordUsage();
      }

      // The contract validates the result, not the precondition
      const result = usageLimit.recordUsage();
      expect(result.isSuccess()).toBe(false);
    });

    it('should maintain invariants', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();

      // After normal usage
      usageLimit.recordUsage();
      expect(() => {
        UsageLimitContracts.validateInvariants(usageLimit);
      }).not.toThrow();
    });

    it('should enforce performance contracts', () => {
      const usageLimit = UsageLimit.create(validIP, policy);

      expect(() => {
        UsageLimitContracts.performanceContract(
          () => usageLimit.canUse(),
          100, // 100ms limit
          'canUse operation',
        );
      }).not.toThrow();
    });
  });

  describe('9. Domain Service Integration', () => {
    it('should create domain service successfully', () => {
      expect(domainService).toBeDefined();
    });

    it('should handle IP validation in service', async () => {
      const result = await domainService.checkUsageLimit(invalidIP);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should create new usage limit for unknown IP', async () => {
      mockRepository.findByIP.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.checkUsageLimit(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should record usage successfully', async () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.recordUsage(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.currentUsage).toBe(1);
      expect(result.data?.remainingQuota).toBe(policy.dailyLimit - 1);
    });

    it('should handle usage recording failure', async () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      // Use up all quota
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await domainService.recordUsage(validIP);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily usage limit reached');
    });

    it('should add bonus quota successfully', async () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      mockRepository.findByIP.mockResolvedValue(usageLimit);
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.addBonusQuota(
        validIP,
        BonusType.QUESTIONNAIRE,
      );

      expect(result.success).toBe(true);
      expect(result.data?.addedAmount).toBe(5);
      expect(result.data?.bonusType).toBe(BonusType.QUESTIONNAIRE);
    });

    it('should get usage statistics successfully', async () => {
      const usageLimit = UsageLimit.create(validIP, policy);
      usageLimit.recordUsage(); // Add some usage

      mockRepository.findByIP.mockResolvedValue(usageLimit);

      const result = await domainService.getUsageStatistics(validIP);

      expect(result.success).toBe(true);
      expect(result.data?.individual).toBeDefined();
      expect(result.data?.individual?.ip).toBe(validIP);
      expect(result.data?.individual?.currentUsage).toBe(1);
    });

    it('should handle service errors gracefully', async () => {
      mockRepository.findByIP.mockRejectedValue(new Error('Database error'));

      const result = await domainService.checkUsageLimit(validIP);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while checking usage limit',
      );
      expect(mockAuditLogger.logError).toHaveBeenCalledWith(
        'CHECK_USAGE_LIMIT_ERROR',
        expect.objectContaining({ ip: validIP }),
      );
    });

    it('should analyze usage patterns', async () => {
      const timeRange = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endDate: new Date(),
      };
      const usageLimits = [
        UsageLimit.create('192.168.1.1', policy),
        UsageLimit.create('192.168.1.2', policy),
      ];

      mockRepository.findByTimeRange.mockResolvedValue(usageLimits);

      const result = await domainService.analyzeUsagePatterns(timeRange);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.totalAnalyzedIPs).toBe(2);
    });

    it('should identify high risk IPs', async () => {
      const highUsageLimit = UsageLimit.create(validIP, policy);
      // Create high usage scenario
      for (let i = 0; i < policy.dailyLimit; i++) {
        highUsageLimit.recordUsage();
      }

      mockRepository.findAll.mockResolvedValue([highUsageLimit]);

      const result = await domainService.getHighRiskIPs();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('10. Value Objects', () => {
    it('should create valid UsageLimitId', () => {
      const id = UsageLimitId.generate();
      expect(id.getValue()).toMatch(/^usage_/);
    });

    it('should create valid IPAddress with validation', () => {
      const ipAddress = new IPAddress({ value: validIP });
      expect(ipAddress.getValue()).toBe(validIP);

      expect(() => {
        new IPAddress({ value: invalidIP });
      }).toThrow('Invalid IPv4 address');
    });

    it('should create and restore UsageLimitPolicy', () => {
      const policy = UsageLimitPolicy.createDefault();
      expect(policy.dailyLimit).toBe(5);
      expect(policy.bonusEnabled).toBe(true);

      const restored = UsageLimitPolicy.restore({
        dailyLimit: 10,
        bonusEnabled: false,
        maxBonusQuota: 15,
        resetTimeUTC: 8,
      });
      expect(restored.dailyLimit).toBe(10);
      expect(restored.bonusEnabled).toBe(false);
    });

    it('should manage quota allocation correctly', () => {
      const allocation = QuotaAllocation.createDefault(5);
      expect(allocation.getAvailableQuota()).toBe(5);
      expect(allocation.getBonusQuota()).toBe(0);

      const withBonus = allocation.addBonus(BonusType.QUESTIONNAIRE, 5);
      expect(withBonus.getAvailableQuota()).toBe(10);
      expect(withBonus.getBonusQuota()).toBe(5);
    });

    it('should track usage correctly', () => {
      const tracking = UsageTracking.createEmpty();
      expect(tracking.getCurrentCount()).toBe(0);

      const afterUsage = tracking.incrementUsage();
      expect(afterUsage.getCurrentCount()).toBe(1);
      expect(afterUsage.getLastUsageAt()).toBeDefined();
    });
  });
});
