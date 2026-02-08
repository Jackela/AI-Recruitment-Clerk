import {
  QuotaCalculatorHelper,
} from './quota-calculator.helper';
import { UsageLimit, UsageLimitPolicy } from './usage-limit.dto';

describe('QuotaCalculatorHelper', () => {
  describe('calculateSystemStatistics', () => {
    it('should calculate statistics for empty array', () => {
      const result = QuotaCalculatorHelper.calculateSystemStatistics([]);

      expect(result.totalIPs).toBe(0);
      expect(result.activeIPs).toBe(0);
      expect(result.totalUsage).toBe(0);
      expect(result.totalQuota).toBe(0);
      expect(result.totalBonusQuota).toBe(0);
      expect(result.systemUtilization).toBe(0);
      expect(result.averageUsagePerIP).toBe(0);
    });

    it('should calculate statistics for multiple usage limits', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit1 = UsageLimit.create('192.168.1.1', policy);
      const usageLimit2 = UsageLimit.create('192.168.1.2', policy);

      usageLimit1.recordUsage();
      usageLimit1.recordUsage();
      usageLimit2.recordUsage();

      const usageLimits = [usageLimit1, usageLimit2];
      const result = QuotaCalculatorHelper.calculateSystemStatistics(usageLimits);

      expect(result.totalIPs).toBe(2);
      expect(result.totalUsage).toBe(3);
      expect(result.averageUsagePerIP).toBe(1.5);
      expect(result.activeIPs).toBe(2); // Recent activity
    });

    it('should identify active IPs correctly', () => {
      const policy = UsageLimitPolicy.createDefault();
      const activeLimit = UsageLimit.create('192.168.1.1', policy);
      activeLimit.recordUsage();

      // Create an inactive limit by using a stale UsageLimit
      // (In a real scenario, this would have old lastActivityAt)

      const result = QuotaCalculatorHelper.calculateSystemStatistics([
        activeLimit,
      ]);

      expect(result.totalIPs).toBe(1);
      expect(result.activeIPs).toBe(1);
    });

    it('should calculate system utilization correctly', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Use half of daily limit - 5/2 = 2.5, ceil gives 3
      for (let i = 0; i < Math.ceil(policy.dailyLimit / 2); i++) {
        usageLimit.recordUsage();
      }

      const result = QuotaCalculatorHelper.calculateSystemStatistics([
        usageLimit,
      ]);

      expect(result.systemUtilization).toBeCloseTo(60, 5); // 3/5 = 60%
    });

    it('should handle division by zero for empty usage limits', () => {
      const result = QuotaCalculatorHelper.calculateSystemStatistics([]);

      expect(result.systemUtilization).toBe(0);
      expect(result.averageUsagePerIP).toBe(0);
    });
  });

  describe('performUsageAnalysis', () => {
    it('should analyze usage patterns for empty array', () => {
      const timeRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const result = QuotaCalculatorHelper.performUsageAnalysis([], timeRange);

      expect(result.totalAnalyzedIPs).toBe(0);
      expect(result.patterns).toEqual([]);
      expect(result.hourlyDistribution).toEqual({});
      expect(result.dailyDistribution).toEqual({});
      expect(result.peakUsageHour).toBe(0);
      expect(result.averageUsagePerIP).toBe(0);
    });

    it('should track hourly distribution', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);
      usageLimit.recordUsage();

      const timeRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const result = QuotaCalculatorHelper.performUsageAnalysis(
        [usageLimit],
        timeRange,
      );

      expect(result.totalAnalyzedIPs).toBe(1);
      expect(Object.keys(result.hourlyDistribution).length).toBeGreaterThan(0);
      // The current hour should have the usage
      const currentHour = new Date().getHours();
      expect(result.hourlyDistribution[currentHour]).toBeDefined();
    });

    it('should track daily distribution', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);
      usageLimit.recordUsage();

      const timeRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const result = QuotaCalculatorHelper.performUsageAnalysis(
        [usageLimit],
        timeRange,
      );

      const today = new Date().toISOString().split('T')[0];
      expect(result.dailyDistribution[today]).toBeDefined();
    });

    it('should identify peak usage hour', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);
      usageLimit.recordUsage();

      const timeRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const result = QuotaCalculatorHelper.performUsageAnalysis(
        [usageLimit],
        timeRange,
      );

      expect(result.peakUsageHour).toBeGreaterThanOrEqual(0);
      expect(result.peakUsageHour).toBeLessThanOrEqual(23);
    });
  });

  describe('calculateRemainingQuota', () => {
    it('should calculate remaining quota correctly', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);
      usageLimit.recordUsage();
      usageLimit.recordUsage();

      const statistics = usageLimit.getUsageStatistics();
      const remaining = QuotaCalculatorHelper.calculateRemainingQuota(
        statistics,
      );

      expect(remaining).toBe(policy.dailyLimit - 2);
    });

    it('should return zero when usage exceeds quota', () => {
      const statistics = {
        availableQuota: 5,
        currentUsage: 10,
      } as any;

      const remaining =
        QuotaCalculatorHelper.calculateRemainingQuota(statistics);

      expect(remaining).toBe(0);
    });
  });

  describe('calculateNextResetTime', () => {
    it('should calculate next day midnight', () => {
      const current = new Date('2025-01-15T10:30:00Z');
      const nextReset = QuotaCalculatorHelper.calculateNextResetTime(current);

      expect(nextReset.getDate()).toBe(16);
      expect(nextReset.getHours()).toBe(0);
      expect(nextReset.getMinutes()).toBe(0);
      expect(nextReset.getSeconds()).toBe(0);
    });

    it('should handle month boundary', () => {
      const current = new Date('2025-01-31T10:30:00Z');
      const nextReset = QuotaCalculatorHelper.calculateNextResetTime(current);

      expect(nextReset.getDate()).toBe(1);
      expect(nextReset.getMonth()).toBe(1); // February
    });

    it('should handle custom reset hour', () => {
      const current = new Date('2025-01-15T10:30:00Z');
      const nextReset = QuotaCalculatorHelper.calculateNextResetTime(
        current,
        6,
      );

      expect(nextReset.getDate()).toBe(16);
      expect(nextReset.getHours()).toBe(6);
    });
  });

  describe('shouldResetUsage', () => {
    it('should return true when crossing day boundary', () => {
      const lastReset = new Date('2025-01-15T10:00:00Z');
      const current = new Date('2025-01-16T09:00:00Z');

      const result = QuotaCalculatorHelper.shouldResetUsage(lastReset, current);

      expect(result).toBe(true);
    });

    it('should return false when same day', () => {
      const lastReset = new Date('2025-01-15T10:00:00Z');
      const current = new Date('2025-01-15T15:00:00Z');

      const result = QuotaCalculatorHelper.shouldResetUsage(lastReset, current);

      expect(result).toBe(false);
    });

    it('should use current time when not provided', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // This test may be flaky around midnight, but that's acceptable for this context
      const result = QuotaCalculatorHelper.shouldResetUsage(yesterday);
      expect(result).toBe(true);
    });
  });

  describe('isValidPolicy', () => {
    it('should validate default policy', () => {
      const policy = UsageLimitPolicy.createDefault();

      const result = QuotaCalculatorHelper.isValidPolicy(policy);

      expect(result).toBe(true);
    });

    it('should reject policy with zero daily limit', () => {
      const policy = {
        dailyLimit: 0,
        bonusEnabled: true,
        maxBonusQuota: 20,
        resetTimeUTC: 0,
      } as any;

      const result = QuotaCalculatorHelper.isValidPolicy(policy);

      expect(result).toBe(false);
    });

    it('should reject policy with excessive daily limit', () => {
      const policy = {
        dailyLimit: 100,
        bonusEnabled: true,
        maxBonusQuota: 20,
        resetTimeUTC: 0,
      } as any;

      const result = QuotaCalculatorHelper.isValidPolicy(policy);

      expect(result).toBe(false);
    });

    it('should reject policy with invalid reset hour', () => {
      const policy = {
        dailyLimit: 5,
        bonusEnabled: true,
        maxBonusQuota: 20,
        resetTimeUTC: 25,
      } as any;

      const result = QuotaCalculatorHelper.isValidPolicy(policy);

      expect(result).toBe(false);
    });
  });
});
