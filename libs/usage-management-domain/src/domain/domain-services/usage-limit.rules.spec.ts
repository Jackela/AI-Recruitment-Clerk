import {
  UsageLimitRules,
  ViolationType,
  RecommendedAction,
} from './usage-limit.rules';
import { UsageLimit } from '../aggregates/usage-limit.aggregate';
import { UsageLimitPolicy } from '../value-objects/usage-limit-policy.value-object';
import { UsageStatistics } from '../value-objects/usage-statistics.value-object';
import { BonusType } from '../../application/dtos/usage-limit.dto';

describe('UsageLimitRules', () => {
  const createMockPolicy = (): UsageLimitPolicy => {
    return UsageLimitPolicy.create({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 10,
      resetTimeUTC: 0,
    });
  };

  const createMockUsageLimit = (overrides = {}): UsageLimit => {
    const policy = createMockPolicy();
    return UsageLimit.create('192.168.1.1', policy);
  };

  describe('constants', () => {
    it('should have correct default constants', () => {
      expect(UsageLimitRules.DEFAULT_DAILY_LIMIT).toBe(5);
      expect(UsageLimitRules.MAX_BONUS_QUOTA).toBe(20);
      expect(UsageLimitRules.QUESTIONNAIRE_BONUS).toBe(5);
      expect(UsageLimitRules.PAYMENT_BONUS).toBe(10);
      expect(UsageLimitRules.REFERRAL_BONUS).toBe(3);
      expect(UsageLimitRules.PROMOTION_BONUS).toBe(2);
    });

    it('should have correct time constants', () => {
      expect(UsageLimitRules.RESET_HOUR_UTC).toBe(0);
      expect(UsageLimitRules.RATE_LIMIT_WINDOW_MINUTES).toBe(1);
      expect(UsageLimitRules.MAX_REQUESTS_PER_MINUTE).toBe(10);
    });
  });

  describe('canIPUseService', () => {
    it('should allow valid IP with available quota', () => {
      const usageLimit = createMockUsageLimit();
      const result = UsageLimitRules.canIPUseService('192.168.1.1', usageLimit);

      expect(result).toBe(true);
    });

    it('should reject invalid IP address', () => {
      const usageLimit = createMockUsageLimit();
      const result = UsageLimitRules.canIPUseService('invalid-ip', usageLimit);

      expect(result).toBe(false);
    });

    it('should reject when quota exhausted', () => {
      const usageLimit = createMockUsageLimit();

      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }

      const result = UsageLimitRules.canIPUseService('192.168.1.1', usageLimit);
      expect(result).toBe(false);
    });
  });

  describe('calculateBonusQuota', () => {
    it('should return correct bonus for questionnaire', () => {
      expect(UsageLimitRules.calculateBonusQuota(BonusType.QUESTIONNAIRE)).toBe(
        5,
      );
    });

    it('should return correct bonus for payment', () => {
      expect(UsageLimitRules.calculateBonusQuota(BonusType.PAYMENT)).toBe(10);
    });

    it('should return correct bonus for referral', () => {
      expect(UsageLimitRules.calculateBonusQuota(BonusType.REFERRAL)).toBe(3);
    });

    it('should return correct bonus for promotion', () => {
      expect(UsageLimitRules.calculateBonusQuota(BonusType.PROMOTION)).toBe(2);
    });

    it('should throw error for unknown bonus type', () => {
      expect(() => {
        UsageLimitRules.calculateBonusQuota('unknown' as BonusType);
      }).toThrow('Unknown bonus type');
    });
  });

  describe('isValidBonusQuota', () => {
    it('should return true for valid bonus quota', () => {
      expect(UsageLimitRules.isValidBonusQuota(5, 10)).toBe(true);
      expect(UsageLimitRules.isValidBonusQuota(0, 20)).toBe(true);
    });

    it('should return false when exceeding max bonus quota', () => {
      expect(UsageLimitRules.isValidBonusQuota(15, 10)).toBe(false);
      expect(UsageLimitRules.isValidBonusQuota(20, 5)).toBe(false);
    });
  });

  describe('shouldResetUsage', () => {
    it('should return true when last reset was yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = UsageLimitRules.shouldResetUsage(yesterday);
      expect(result).toBe(true);
    });

    it('should return false when last reset was today', () => {
      const today = new Date();
      const result = UsageLimitRules.shouldResetUsage(today);
      expect(result).toBe(false);
    });

    it('should handle custom current time', () => {
      const lastReset = new Date('2024-01-01');
      const currentTime = new Date('2024-01-02');

      expect(UsageLimitRules.shouldResetUsage(lastReset, currentTime)).toBe(
        true,
      );
    });
  });

  describe('getNextResetTime', () => {
    it('should return midnight UTC of next day', () => {
      const now = new Date('2024-01-15T10:30:00');
      const nextReset = UsageLimitRules.getNextResetTime(now);

      expect(nextReset.getDate()).toBe(16);
      expect(nextReset.getHours()).toBe(0);
      expect(nextReset.getMinutes()).toBe(0);
      expect(nextReset.getSeconds()).toBe(0);
    });
  });

  describe('isValidIPAddress', () => {
    it('should return true for valid IPv4 addresses', () => {
      expect(UsageLimitRules.isValidIPAddress('192.168.1.1')).toBe(true);
      expect(UsageLimitRules.isValidIPAddress('10.0.0.1')).toBe(true);
      expect(UsageLimitRules.isValidIPAddress('255.255.255.255')).toBe(true);
    });

    it('should return false for invalid IP addresses', () => {
      expect(UsageLimitRules.isValidIPAddress('invalid')).toBe(false);
      expect(UsageLimitRules.isValidIPAddress('192.168.1')).toBe(false);
      expect(UsageLimitRules.isValidIPAddress('256.0.0.1')).toBe(false);
    });

    it('should return false for empty or null values', () => {
      expect(UsageLimitRules.isValidIPAddress('')).toBe(false);
      expect(UsageLimitRules.isValidIPAddress(null as unknown as string)).toBe(
        false,
      );
      expect(
        UsageLimitRules.isValidIPAddress(undefined as unknown as string),
      ).toBe(false);
    });
  });

  describe('isRateLimited', () => {
    it('should return false when under rate limit', () => {
      const usageHistory = Array(5)
        .fill(null)
        .map((_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          count: 1,
        }));

      expect(UsageLimitRules.isRateLimited(usageHistory)).toBe(false);
    });

    it('should return true when exceeding rate limit', () => {
      const usageHistory = Array(15)
        .fill(null)
        .map((_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          count: 1,
        }));

      expect(UsageLimitRules.isRateLimited(usageHistory)).toBe(true);
    });

    it('should ignore old usage records', () => {
      const usageHistory = [
        { timestamp: new Date(Date.now() - 2 * 60 * 1000), count: 1 },
        { timestamp: new Date(Date.now() - 3 * 60 * 1000), count: 1 },
      ];

      expect(UsageLimitRules.isRateLimited(usageHistory)).toBe(false);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate low risk for normal usage', () => {
      const stats = new UsageStatistics({
        ip: '192.168.1.1',
        currentUsage: 2,
        dailyLimit: 5,
        availableQuota: 3,
        bonusQuota: 0,
        resetAt: new Date(),
        lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });

      const risk = UsageLimitRules.calculateRiskScore(stats);
      expect(risk.score).toBeLessThan(30);
      expect(risk.factors).toHaveLength(0);
    });

    it('should calculate high risk for high usage', () => {
      const stats = new UsageStatistics({
        ip: '192.168.1.1',
        currentUsage: 9,
        dailyLimit: 10,
        availableQuota: 1,
        bonusQuota: 5,
        resetAt: new Date(),
        lastActivityAt: new Date(),
      });

      const risk = UsageLimitRules.calculateRiskScore(stats);
      expect(risk.score).toBeGreaterThanOrEqual(30);
      expect(risk.factors.length).toBeGreaterThan(0);
    });
  });

  describe('isValidUsagePolicy', () => {
    it('should return true for valid policy', () => {
      const policy = createMockPolicy();
      expect(UsageLimitRules.isValidUsagePolicy(policy)).toBe(true);
    });

    it('should return false for invalid daily limit', () => {
      const policy = UsageLimitPolicy.create({
        dailyLimit: 0,
        bonusEnabled: true,
        maxBonusQuota: 10,
        resetTimeUTC: 0,
      });
      expect(UsageLimitRules.isValidUsagePolicy(policy)).toBe(false);
    });

    it('should return false for excessive daily limit', () => {
      const policy = UsageLimitPolicy.create({
        dailyLimit: 100,
        bonusEnabled: true,
        maxBonusQuota: 10,
        resetTimeUTC: 0,
      });
      expect(UsageLimitRules.isValidUsagePolicy(policy)).toBe(false);
    });
  });

  describe('generateViolationReport', () => {
    it('should generate report for quota exceeded', () => {
      const usageLimit = createMockUsageLimit();
      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }

      const report = UsageLimitRules.generateViolationReport(
        '192.168.1.1',
        usageLimit,
      );

      expect(report.ip).toBe('192.168.1.1');
      expect(report.violationType).toBe(ViolationType.QUOTA_EXCEEDED);
      expect(report.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should include recommended action', () => {
      const usageLimit = createMockUsageLimit();
      const report = UsageLimitRules.generateViolationReport(
        '192.168.1.1',
        usageLimit,
      );

      expect(Object.values(RecommendedAction)).toContain(
        report.recommendedAction,
      );
    });
  });

  describe('validateBonusQuotaRequest', () => {
    it('should validate valid bonus request', () => {
      const policy = createMockPolicy();
      const result = UsageLimitRules.validateBonusQuotaRequest(
        BonusType.QUESTIONNAIRE,
        5,
        0,
        policy,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.approvedAmount).toBe(5);
    });

    it('should reject invalid bonus type', () => {
      const policy = createMockPolicy();
      const result = UsageLimitRules.validateBonusQuotaRequest(
        'invalid' as BonusType,
        5,
        0,
        policy,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid bonus type: invalid');
    });

    it('should reject non-positive amount', () => {
      const policy = createMockPolicy();
      const result = UsageLimitRules.validateBonusQuotaRequest(
        BonusType.QUESTIONNAIRE,
        0,
        0,
        policy,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bonus amount must be positive');
    });

    it('should reject excessive bonus request', () => {
      const policy = createMockPolicy();
      const result = UsageLimitRules.validateBonusQuotaRequest(
        BonusType.QUESTIONNAIRE,
        100,
        0,
        policy,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds maximum'))).toBe(
        true,
      );
    });

    it('should reject when bonus disabled', () => {
      const policy = UsageLimitPolicy.create({
        dailyLimit: 5,
        bonusEnabled: false,
        maxBonusQuota: 10,
        resetTimeUTC: 0,
      });

      const result = UsageLimitRules.validateBonusQuotaRequest(
        BonusType.QUESTIONNAIRE,
        5,
        0,
        policy,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Bonus quota is not enabled in current policy',
      );
    });
  });

  describe('calculateUsageEfficiency', () => {
    it('should calculate efficiency metrics', () => {
      const stats = new UsageStatistics({
        ip: '192.168.1.1',
        currentUsage: 3,
        dailyLimit: 5,
        availableQuota: 2,
        bonusQuota: 2,
        resetAt: new Date(),
        lastActivityAt: new Date(),
      });

      const efficiency = UsageLimitRules.calculateUsageEfficiency(stats);

      expect(efficiency.baseUtilization).toBe(0.6);
      expect(efficiency.overallEfficiency).toBeGreaterThan(0);
      expect(efficiency.wasteageScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero bonus quota', () => {
      const stats = new UsageStatistics({
        ip: '192.168.1.1',
        currentUsage: 3,
        dailyLimit: 5,
        availableQuota: 2,
        bonusQuota: 0,
        resetAt: new Date(),
        lastActivityAt: new Date(),
      });

      const efficiency = UsageLimitRules.calculateUsageEfficiency(stats);

      expect(efficiency.bonusUtilization).toBe(0);
    });
  });
});
