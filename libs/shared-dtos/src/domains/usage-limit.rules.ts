import type {
  UsageLimit,
  UsageLimitPolicy,
  UsageStatistics} from './usage-limit.dto';
import {
  BonusType
} from './usage-limit.dto';

/**
 * Represents the usage limit rules.
 */
export class UsageLimitRules {
  // 核心业务规则常量
  public static readonly DEFAULT_DAILY_LIMIT = 5;
  public static readonly MAX_BONUS_QUOTA = 20;
  public static readonly QUESTIONNAIRE_BONUS = 5;
  public static readonly PAYMENT_BONUS = 10;
  public static readonly REFERRAL_BONUS = 3;
  public static readonly PROMOTION_BONUS = 2;

  // 时间相关常量
  public static readonly RESET_HOUR_UTC = 0; // Midnight UTC
  public static readonly RATE_LIMIT_WINDOW_MINUTES = 1;
  public static readonly MAX_REQUESTS_PER_MINUTE = 10;

  // 验证规则
  public static readonly IP_VALIDATION_REGEX =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // 核心业务规则方法

  /**
   * 检查IP地址是否可以使用服务
   */
  public static canIPUseService(ip: string, usageLimit: UsageLimit): boolean {
    if (!this.isValidIPAddress(ip)) {
      return false;
    }

    const checkResult = usageLimit.canUse();
    return checkResult.isAllowed();
  }

  /**
   * 计算奖励配额数量
   */
  public static calculateBonusQuota(bonusType: BonusType): number {
    switch (bonusType) {
      case BonusType.QUESTIONNAIRE:
        return this.QUESTIONNAIRE_BONUS;
      case BonusType.PAYMENT:
        return this.PAYMENT_BONUS;
      case BonusType.REFERRAL:
        return this.REFERRAL_BONUS;
      case BonusType.PROMOTION:
        return this.PROMOTION_BONUS;
      default:
        throw new Error(`Unknown bonus type: ${bonusType}`);
    }
  }

  /**
   * 验证奖励配额是否超过限制
   */
  public static isValidBonusQuota(
    currentBonusQuota: number,
    additionalBonus: number,
  ): boolean {
    return currentBonusQuota + additionalBonus <= this.MAX_BONUS_QUOTA;
  }

  /**
   * 检查是否应该重置使用计数（基于时间）
   */
  public static shouldResetUsage(
    lastResetAt: Date,
    currentTime: Date = new Date(),
  ): boolean {
    const lastResetDate = new Date(
      lastResetAt.getFullYear(),
      lastResetAt.getMonth(),
      lastResetAt.getDate(),
    );
    const currentDate = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
    );

    return currentDate > lastResetDate;
  }

  /**
   * 计算下次重置时间
   */
  public static getNextResetTime(currentTime: Date = new Date()): Date {
    const nextReset = new Date(currentTime);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(this.RESET_HOUR_UTC, 0, 0, 0);
    return nextReset;
  }

  /**
   * 验证IP地址格式
   */
  public static isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    return this.IP_VALIDATION_REGEX.test(ip);
  }

  /**
   * 检查使用频率是否过高（防止滥用）
   */
  public static isRateLimited(
    usageHistory: Array<{ timestamp: Date; count: number }>,
  ): boolean {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );

    const recentUsage = usageHistory.filter(
      (record) => record.timestamp >= windowStart,
    );
    return recentUsage.length >= this.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * 计算使用统计的风险评分
   */
  public static calculateRiskScore(statistics: UsageStatistics): RiskScore {
    let score = 0;
    const factors: string[] = [];

    // 高使用率风险
    const usagePercentage = statistics.getUsagePercentage();
    if (usagePercentage >= 90) {
      score += 30;
      factors.push('High usage rate (>90%)');
    } else if (usagePercentage >= 75) {
      score += 15;
      factors.push('Moderate usage rate (>75%)');
    }

    // 奖励配额依赖风险
    if (statistics.bonusQuota > statistics.dailyLimit) {
      score += 20;
      factors.push('Heavy bonus quota dependency');
    }

    // 持续使用模式风险
    if (statistics.lastActivityAt) {
      const hoursSinceLastActivity =
        (Date.now() - statistics.lastActivityAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastActivity < 1) {
        score += 10;
        factors.push('Very recent activity');
      }
    }

    return new RiskScore(Math.min(100, score), factors);
  }

  /**
   * 验证使用限制策略的有效性
   */
  public static isValidUsagePolicy(policy: UsageLimitPolicy): boolean {
    return (
      policy.dailyLimit > 0 &&
      policy.dailyLimit <= 50 &&
      policy.maxBonusQuota >= 0 &&
      policy.maxBonusQuota <= 100 &&
      policy.resetTimeUTC >= 0 &&
      policy.resetTimeUTC <= 23
    );
  }

  /**
   * 生成使用限制违规报告
   */
  public static generateViolationReport(
    ip: string,
    usageLimit: UsageLimit,
  ): UsageViolationReport {
    const statistics = usageLimit.getUsageStatistics();
    const riskScore = this.calculateRiskScore(statistics);

    return new UsageViolationReport({
      ip,
      violationType: this.determineViolationType(statistics),
      currentUsage: statistics.currentUsage,
      allowedQuota: statistics.availableQuota,
      violationTime: new Date(),
      riskScore: riskScore.score,
      riskFactors: riskScore.factors,
      recommendedAction: this.getRecommendedAction(riskScore.score),
      nextAllowedTime: statistics.resetAt,
    });
  }

  private static determineViolationType(
    statistics: UsageStatistics,
  ): ViolationType {
    if (statistics.currentUsage >= statistics.availableQuota) {
      return ViolationType.QUOTA_EXCEEDED;
    }

    if (statistics.getUsagePercentage() >= 90) {
      return ViolationType.HIGH_USAGE_WARNING;
    }

    return ViolationType.RATE_LIMIT_APPROACHED;
  }

  private static getRecommendedAction(riskScore: number): RecommendedAction {
    if (riskScore >= 70) {
      return RecommendedAction.BLOCK_TEMPORARILY;
    } else if (riskScore >= 40) {
      return RecommendedAction.MONITOR_CLOSELY;
    } else if (riskScore >= 20) {
      return RecommendedAction.WARN_USER;
    }

    return RecommendedAction.CONTINUE_NORMAL;
  }

  /**
   * 检查奖励配额申请的合法性
   */
  public static validateBonusQuotaRequest(
    bonusType: BonusType,
    requestedAmount: number,
    currentBonusQuota: number,
    policy: UsageLimitPolicy,
  ): BonusValidationResult {
    const errors: string[] = [];

    // 验证奖励类型
    if (!Object.values(BonusType).includes(bonusType)) {
      errors.push(`Invalid bonus type: ${bonusType}`);
    }

    // 验证请求数量
    if (requestedAmount <= 0) {
      errors.push('Bonus amount must be positive');
    }

    const standardBonus = this.calculateBonusQuota(bonusType);
    if (requestedAmount > standardBonus * 2) {
      errors.push(
        `Requested bonus amount (${requestedAmount}) exceeds maximum allowed (${standardBonus * 2})`,
      );
    }

    // 验证总配额限制
    if (!this.isValidBonusQuota(currentBonusQuota, requestedAmount)) {
      errors.push(
        `Total bonus quota would exceed maximum limit (${this.MAX_BONUS_QUOTA})`,
      );
    }

    // 验证策略设置
    if (!policy.bonusEnabled) {
      errors.push('Bonus quota is not enabled in current policy');
    }

    return new BonusValidationResult(
      errors.length === 0,
      errors,
      errors.length === 0 ? requestedAmount : 0,
    );
  }

  /**
   * 计算使用效率指标
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

    return new UsageEfficiency({
      baseUtilization: Math.min(utilizationRate, 1.0),
      bonusUtilization,
      overallEfficiency: (utilizationRate + bonusUtilization) / 2,
      wasteageScore:
        Math.max(0, statistics.availableQuota - statistics.currentUsage) /
        statistics.availableQuota,
    });
  }
}

// 支持类和枚举
/**
 * Represents the risk score.
 */
export class RiskScore {
  /**
   * Initializes a new instance of the Risk Score.
   * @param score - The score.
   * @param factors - The factors.
   */
  constructor(
    public readonly score: number,
    public readonly factors: string[],
  ) {}
}

export enum ViolationType {
  QUOTA_EXCEEDED = 'quota_exceeded',
  HIGH_USAGE_WARNING = 'high_usage_warning',
  RATE_LIMIT_APPROACHED = 'rate_limit_approached',
}

export enum RecommendedAction {
  CONTINUE_NORMAL = 'continue_normal',
  WARN_USER = 'warn_user',
  MONITOR_CLOSELY = 'monitor_closely',
  BLOCK_TEMPORARILY = 'block_temporarily',
}

/**
 * Represents the usage violation report.
 */
export class UsageViolationReport {
  /**
   * Initializes a new instance of the Usage Violation Report.
   * @param data - The data.
   */
  constructor(
    public readonly data: {
      ip: string;
      violationType: ViolationType;
      currentUsage: number;
      allowedQuota: number;
      violationTime: Date;
      riskScore: number;
      riskFactors: string[];
      recommendedAction: RecommendedAction;
      nextAllowedTime: Date;
    },
  ) {}

  /**
   * Performs the ip operation.
   * @returns The string value.
   */
  public get ip(): string {
    return this.data.ip;
  }
  /**
   * Performs the violation type operation.
   * @returns The ViolationType.
   */
  public get violationType(): ViolationType {
    return this.data.violationType;
  }
  /**
   * Performs the current usage operation.
   * @returns The number value.
   */
  public get currentUsage(): number {
    return this.data.currentUsage;
  }
  /**
   * Performs the allowed quota operation.
   * @returns The number value.
   */
  public get allowedQuota(): number {
    return this.data.allowedQuota;
  }
  /**
   * Performs the risk score operation.
   * @returns The number value.
   */
  public get riskScore(): number {
    return this.data.riskScore;
  }
  /**
   * Performs the recommended action operation.
   * @returns The RecommendedAction.
   */
  public get recommendedAction(): RecommendedAction {
    return this.data.recommendedAction;
  }
}

/**
 * Represents the bonus validation result.
 */
export class BonusValidationResult {
  /**
   * Initializes a new instance of the Bonus Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   * @param approvedAmount - The approved amount.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
    public readonly approvedAmount: number,
  ) {}
}

/**
 * Represents the usage efficiency.
 */
export class UsageEfficiency {
  /**
   * Initializes a new instance of the Usage Efficiency.
   * @param data - The data.
   */
  constructor(
    public readonly data: {
      baseUtilization: number;
      bonusUtilization: number;
      overallEfficiency: number;
      wasteageScore: number;
    },
  ) {}

  /**
   * Performs the base utilization operation.
   * @returns The number value.
   */
  public get baseUtilization(): number {
    return this.data.baseUtilization;
  }
  /**
   * Performs the bonus utilization operation.
   * @returns The number value.
   */
  public get bonusUtilization(): number {
    return this.data.bonusUtilization;
  }
  /**
   * Performs the overall efficiency operation.
   * @returns The number value.
   */
  public get overallEfficiency(): number {
    return this.data.overallEfficiency;
  }
  /**
   * Performs the wasteage score operation.
   * @returns The number value.
   */
  public get wasteageScore(): number {
    return this.data.wasteageScore;
  }
}
