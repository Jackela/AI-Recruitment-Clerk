import {
  UsageTrackerHelper,
  RiskScore,
} from './usage-tracker.helper';
import { UsageLimit, UsageLimitPolicy, BonusType } from './usage-limit.dto';

describe('UsageTrackerHelper', () => {
  describe('calculateRiskScore', () => {
    it('should return zero risk for unused limit', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      const statistics = usageLimit.getUsageStatistics();
      const riskScore = UsageTrackerHelper.calculateRiskScore(statistics);

      expect(riskScore.score).toBe(0);
      expect(riskScore.factors).toEqual([]);
    });

    it('should calculate high risk for near-limit usage', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Use up to limit
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      const statistics = usageLimit.getUsageStatistics();
      const riskScore = UsageTrackerHelper.calculateRiskScore(statistics);

      expect(riskScore.score).toBeGreaterThanOrEqual(30);
      expect(riskScore.factors).toContain('High usage rate (>=90%)');
    });

    it('should include bonus dependency as risk factor', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Add bonus quota greater than daily limit
      usageLimit.addBonusQuota(BonusType.PAYMENT, 15);

      const statistics = usageLimit.getUsageStatistics();
      const riskScore = UsageTrackerHelper.calculateRiskScore(statistics);

      expect(riskScore.factors).toContain('Heavy bonus quota dependency');
    });

    it('should cap risk score at 100', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Max out usage and add large bonus
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }
      usageLimit.addBonusQuota(BonusType.PAYMENT, 20);

      const statistics = usageLimit.getUsageStatistics();
      const riskScore = UsageTrackerHelper.calculateRiskScore(statistics);

      expect(riskScore.score).toBeLessThanOrEqual(100);
    });

    it('should identify moderate usage risk', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Use 75% of limit - 5 * 0.75 = 3.75, ceil gives 4
      for (let i = 0; i < Math.ceil(policy.dailyLimit * 0.75); i++) {
        usageLimit.recordUsage();
      }

      const statistics = usageLimit.getUsageStatistics();
      const riskScore = UsageTrackerHelper.calculateRiskScore(statistics);

      expect(riskScore.score).toBeGreaterThanOrEqual(15);
      expect(riskScore.factors).toContain('Moderate usage rate (>=75%)');
    });
  });

  describe('generateIPRiskAssessment', () => {
    it('should return null for low risk IP', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      const assessment = UsageTrackerHelper.generateIPRiskAssessment(usageLimit);

      expect(assessment).toBeNull();
    });

    it('should generate assessment for high risk IP', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Max out usage to create high risk
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      const assessment = UsageTrackerHelper.generateIPRiskAssessment(usageLimit);

      expect(assessment).not.toBeNull();
      expect(assessment?.ip).toBe('192.168.1.1');
      expect(assessment?.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('should recommend appropriate action for high risk', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      // Use all daily limit
      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      // 100% usage = 30 points (>=90%)
      // Recent activity = 10 points (< 1 hour ago)
      // Total = 40 points >= 40 threshold

      const assessment = UsageTrackerHelper.generateIPRiskAssessment(usageLimit);

      expect(assessment).not.toBeNull();
      // 40-59 is WARN threshold
      expect(assessment!.recommendedAction).toBe('WARN');
    });

    it('should include current usage and quota', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      for (let i = 0; i < policy.dailyLimit; i++) {
        usageLimit.recordUsage();
      }

      const assessment = UsageTrackerHelper.generateIPRiskAssessment(usageLimit);

      expect(assessment).not.toBeNull();
      expect(assessment!.currentUsage).toBe(policy.dailyLimit);
      expect(assessment!.availableQuota).toBeGreaterThan(0);
    });
  });

  describe('generateRiskAssessments', () => {
    it('should return empty array for no usage limits', () => {
      const assessments = UsageTrackerHelper.generateRiskAssessments([]);

      expect(assessments).toEqual([]);
    });

    it('should filter out low risk IPs', () => {
      const policy = UsageLimitPolicy.createDefault();
      const lowRiskLimit = UsageLimit.create('192.168.1.1', policy);

      const assessments = UsageTrackerHelper.generateRiskAssessments([
        lowRiskLimit,
      ]);

      expect(assessments).toEqual([]);
    });

    it('should return only medium and high risk IPs', () => {
      const policy = UsageLimitPolicy.createDefault();
      const highRiskLimit = UsageLimit.create('192.168.1.1', policy);
      const lowRiskLimit = UsageLimit.create('192.168.1.2', policy);

      // Create high risk IP
      for (let i = 0; i < policy.dailyLimit; i++) {
        highRiskLimit.recordUsage();
      }

      const assessments = UsageTrackerHelper.generateRiskAssessments([
        lowRiskLimit,
        highRiskLimit,
      ]);

      expect(assessments.length).toBe(1);
      expect(assessments[0].ip).toBe('192.168.1.1');
    });

    it('should sort by risk score descending', () => {
      const policy = UsageLimitPolicy.createDefault();
      const highRiskLimit = UsageLimit.create('192.168.1.1', policy);
      const mediumRiskLimit = UsageLimit.create('192.168.1.2', policy);

      // Create different risk levels
      // High risk: 100% usage -> 30 points for high usage
      for (let i = 0; i < policy.dailyLimit; i++) {
        highRiskLimit.recordUsage();
      }
      // Medium risk: 90% usage -> 30 points for high usage
      for (let i = 0; i < Math.ceil(policy.dailyLimit * 0.9); i++) {
        mediumRiskLimit.recordUsage();
      }

      const assessments = UsageTrackerHelper.generateRiskAssessments([
        mediumRiskLimit,
        highRiskLimit,
      ]);

      expect(assessments.length).toBeGreaterThanOrEqual(2);
      expect(assessments[0].riskScore).toBeGreaterThanOrEqual(
        assessments[1]?.riskScore ?? 0,
      );
    });
  });

  describe('calculateUsageEfficiency', () => {
    it('should calculate efficiency for new usage limit', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      const statistics = usageLimit.getUsageStatistics();
      const efficiency = UsageTrackerHelper.calculateUsageEfficiency(statistics);

      expect(efficiency.baseUtilization).toBe(0);
      expect(efficiency.bonusUtilization).toBe(0);
      expect(efficiency.overallEfficiency).toBe(0);
    });

    it('should calculate efficiency with usage', () => {
      const policy = UsageLimitPolicy.createDefault();
      const usageLimit = UsageLimit.create('192.168.1.1', policy);

      usageLimit.recordUsage();
      usageLimit.recordUsage();

      const statistics = usageLimit.getUsageStatistics();
      const efficiency = UsageTrackerHelper.calculateUsageEfficiency(statistics);

      expect(efficiency.baseUtilization).toBeGreaterThan(0);
      expect(efficiency.baseUtilization).toBeLessThanOrEqual(1);
    });
  });

  describe('isIPActive', () => {
    it('should return false for undefined last activity', () => {
      const result = UsageTrackerHelper.isIPActive(undefined);

      expect(result).toBe(false);
    });

    it('should return true for recent activity', () => {
      const recentActivity = new Date();

      const result = UsageTrackerHelper.isIPActive(recentActivity);

      expect(result).toBe(true);
    });

    it('should return false for old activity', () => {
      const oldActivity = new Date();
      oldActivity.setDate(oldActivity.getDate() - 2);

      const result = UsageTrackerHelper.isIPActive(oldActivity);

      expect(result).toBe(false);
    });

    it('should respect custom window hours', () => {
      const recentActivity = new Date();

      // 1 hour window should be active
      const result1 = UsageTrackerHelper.isIPActive(recentActivity, 1);
      expect(result1).toBe(true);

      // 0 hour window should be inactive (unless exactly now)
      const result2 = UsageTrackerHelper.isIPActive(recentActivity, 0);
      expect(result2).toBe(false);
    });
  });

  describe('identifyUsagePattern', () => {
    it('should identify peak pattern', () => {
      const result = UsageTrackerHelper.identifyUsagePattern(5, 5, 0.5);

      expect(result).toBe('peak');
    });

    it('should identify low pattern', () => {
      const result = UsageTrackerHelper.identifyUsagePattern(1, 5, 0.5);

      expect(result).toBe('low');
    });

    it('should identify consistent pattern', () => {
      const result = UsageTrackerHelper.identifyUsagePattern(3, 5, 0.8);

      expect(result).toBe('consistent');
    });

    it('should identify sporadic pattern', () => {
      const result = UsageTrackerHelper.identifyUsagePattern(3, 5, 0.5);

      expect(result).toBe('sporadic');
    });
  });

  describe('RiskScore class', () => {
    it('should create risk score with factors', () => {
      const score = new RiskScore(50, ['High usage', 'Recent activity']);

      expect(score.score).toBe(50);
      expect(score.factors).toEqual(['High usage', 'Recent activity']);
    });

    it('should create zero risk score', () => {
      const score = new RiskScore(0, []);

      expect(score.score).toBe(0);
      expect(score.factors).toEqual([]);
    });
  });
});
