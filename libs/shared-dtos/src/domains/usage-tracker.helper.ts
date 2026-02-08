import type { UsageLimit, UsageStatistics } from './usage-limit.dto';
import type { UsageEfficiency } from './usage-limit.rules';

/**
 * Defines the shape of the ip risk assessment.
 */
export interface IPRiskAssessment {
  ip: string;
  riskScore: number;
  riskFactors: string[];
  currentUsage: number;
  availableQuota: number;
  lastActivity?: Date;
  recommendedAction: 'WARN' | 'MONITOR' | 'BLOCK';
}

/**
 * Represents the risk score result.
 */
export class RiskScore {
  constructor(
    public readonly score: number,
    public readonly factors: string[],
  ) {}
}

/**
 * Helper class for usage tracking and risk assessment operations.
 * Extracted from UsageLimitDomainService for better maintainability.
 */
export class UsageTrackerHelper {
  /**
   * Risk thresholds for categorization.
   */
  private static readonly RISK_THRESHOLD_HIGH = 70;
  private static readonly RISK_THRESHOLD_MEDIUM = 60;
  private static readonly RISK_THRESHOLD_LOW = 40;
  private static readonly USAGE_THRESHOLD_HIGH = 90;
  private static readonly USAGE_THRESHOLD_MODERATE = 75;
  private static readonly ACTIVITY_WINDOW_HOURS = 1;

  /**
   * Calculates risk score for a usage limit based on usage patterns.
   * @param statistics - Usage statistics to analyze.
   * @returns Risk score with contributing factors.
   */
  public static calculateRiskScore(statistics: UsageStatistics): RiskScore {
    let score = 0;
    const factors: string[] = [];

    // High usage rate risk factor
    const usagePercentage = statistics.getUsagePercentage();
    if (usagePercentage >= this.USAGE_THRESHOLD_HIGH) {
      score += 30;
      factors.push(`High usage rate (>=${this.USAGE_THRESHOLD_HIGH}%)`);
    } else if (usagePercentage >= this.USAGE_THRESHOLD_MODERATE) {
      score += 15;
      factors.push(`Moderate usage rate (>=${this.USAGE_THRESHOLD_MODERATE}%)`);
    }

    // Bonus quota dependency risk
    if (statistics.bonusQuota > statistics.dailyLimit) {
      score += 20;
      factors.push('Heavy bonus quota dependency');
    }

    // Recent activity pattern risk
    if (statistics.lastActivityAt) {
      const hoursSinceLastActivity =
        (Date.now() - statistics.lastActivityAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastActivity < this.ACTIVITY_WINDOW_HOURS) {
        score += 10;
        factors.push('Very recent activity');
      }
    }

    return new RiskScore(Math.min(100, score), factors);
  }

  /**
   * Generates risk assessment for a single IP.
   * @param usageLimit - The usage limit to assess.
   * @returns IP risk assessment.
   */
  public static generateIPRiskAssessment(
    usageLimit: UsageLimit,
  ): IPRiskAssessment | null {
    const statistics = usageLimit.getUsageStatistics();
    const riskScore = this.calculateRiskScore(statistics);

    // Only include IPs with medium risk or higher
    if (riskScore.score < this.RISK_THRESHOLD_LOW) {
      return null;
    }

    return {
      ip: statistics.ip,
      riskScore: riskScore.score,
      riskFactors: riskScore.factors,
      currentUsage: statistics.currentUsage,
      availableQuota: statistics.availableQuota,
      lastActivity: statistics.lastActivityAt,
      recommendedAction: this.getRecommendedAction(riskScore.score),
    };
  }

  /**
   * Generates risk assessments for multiple usage limits.
   * @param usageLimits - Array of usage limits to assess.
   * @returns Array of IP risk assessments sorted by risk score (descending).
   */
  public static generateRiskAssessments(
    usageLimits: UsageLimit[],
  ): IPRiskAssessment[] {
    const riskAssessments: IPRiskAssessment[] = [];

    for (const usageLimit of usageLimits) {
      const assessment = this.generateIPRiskAssessment(usageLimit);
      if (assessment) {
        riskAssessments.push(assessment);
      }
    }

    // Sort by risk score descending
    return riskAssessments.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Determines recommended action based on risk score.
   * @param riskScore - The calculated risk score.
   * @returns Recommended action.
   */
  private static getRecommendedAction(
    riskScore: number,
  ): 'WARN' | 'MONITOR' | 'BLOCK' {
    if (riskScore >= this.RISK_THRESHOLD_HIGH) {
      return 'BLOCK';
    } else if (riskScore >= this.RISK_THRESHOLD_MEDIUM) {
      return 'MONITOR';
    }
    return 'WARN';
  }

  /**
   * Calculates usage efficiency metrics.
   * @param statistics - Usage statistics.
   * @returns Usage efficiency metrics.
   */
  public static calculateUsageEfficiency(
    statistics: UsageStatistics,
  ): UsageEfficiency {
    const utilizationRate = statistics.currentUsage / statistics.dailyLimit;
    const bonusUtilization =
      statistics.bonusQuota > 0
        ? Math.min(statistics.currentUsage, statistics.bonusQuota) /
          statistics.bonusQuota
        : 0;

    return {
      baseUtilization: Math.min(utilizationRate, 1.0),
      bonusUtilization,
      overallEfficiency: (utilizationRate + bonusUtilization) / 2,
      wasteageScore:
        statistics.availableQuota > 0
          ? Math.max(0, statistics.availableQuota - statistics.currentUsage) /
            statistics.availableQuota
          : 0,
    } as UsageEfficiency;
  }

  /**
   * Determines if an IP should be considered active based on last activity.
   * @param lastActivityAt - Last activity timestamp.
   * @param windowHours - Time window in hours (default: 24).
   * @returns True if IP is considered active.
   */
  public static isIPActive(
    lastActivityAt: Date | undefined,
    windowHours = 24,
  ): boolean {
    if (!lastActivityAt) {
      return false;
    }

    const hoursSinceLastActivity =
      (Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastActivity < windowHours;
  }

  /**
   * Identifies usage pattern type based on activity history.
   * @param currentUsage - Current usage count.
   * @param dailyLimit - Daily usage limit.
   * @param consistencyScore - Score indicating usage consistency (0-1).
   * @returns Usage pattern type.
   */
  public static identifyUsagePattern(
    currentUsage: number,
    dailyLimit: number,
    consistencyScore: number,
  ): 'peak' | 'low' | 'consistent' | 'sporadic' {
    const usageRate = currentUsage / dailyLimit;

    if (usageRate >= 0.9) {
      return 'peak';
    } else if (usageRate <= 0.2) {
      return 'low';
    } else if (consistencyScore >= 0.7) {
      return 'consistent';
    }
    return 'sporadic';
  }
}
