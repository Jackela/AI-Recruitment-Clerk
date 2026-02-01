import type {
  BonusType} from './usage-limit.dto';
import {
  UsageLimit,
  UsageLimitPolicy
} from './usage-limit.dto';
import type {
  UsageViolationReport,
  UsageEfficiency} from './usage-limit.rules';
import {
  UsageLimitRules
} from './usage-limit.rules';

/**
 * Provides usage limit domain functionality.
 */
export class UsageLimitDomainService {
  /**
   * Initializes a new instance of the Usage Limit Domain Service.
   * @param repository - The repository.
   * @param eventBus - The event bus.
   * @param auditLogger - The audit logger.
   */
  constructor(
    private readonly repository: IUsageLimitRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * 检查IP的使用限制状态
   */
  public async checkUsageLimit(ip: string): Promise<UsageLimitResult> {
    try {
      // 前置条件验证
      if (!UsageLimitRules.isValidIPAddress(ip)) {
        await this.auditLogger.logSecurityEvent('INVALID_IP_ACCESS', { ip });
        return UsageLimitResult.failed(['Invalid IP address format']);
      }

      // 获取或创建使用限制
      let usageLimit = await this.repository.findByIP(ip);
      if (!usageLimit) {
        const policy = UsageLimitPolicy.createDefault();
        usageLimit = UsageLimit.create(ip, policy);
        await this.repository.save(usageLimit);

        await this.auditLogger.logBusinessEvent('USAGE_LIMIT_CREATED', {
          ip,
          dailyLimit: policy.dailyLimit,
        });
      }

      // 执行使用限制检查
      const checkResult = usageLimit.canUse();
      const statistics = usageLimit.getUsageStatistics();

      // 发布领域事件
      const events = usageLimit.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      usageLimit.markEventsAsCommitted();

      // 保存状态变更
      await this.repository.save(usageLimit);

      // 构建结果
      const result = UsageLimitResult.success({
        allowed: checkResult.isAllowed(),
        remainingQuota: checkResult.getRemainingQuota() || 0,
        currentUsage: statistics.currentUsage,
        dailyLimit: statistics.dailyLimit,
        resetAt: statistics.resetAt,
        bonusQuota: statistics.bonusQuota,
      });

      // 如果超出限制，记录违规报告
      if (!checkResult.isAllowed()) {
        const violationReport = UsageLimitRules.generateViolationReport(
          ip,
          usageLimit,
        );
        await this.auditLogger.logViolation(
          'USAGE_LIMIT_EXCEEDED',
          violationReport,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CHECK_USAGE_LIMIT_ERROR', {
        ip,
        error: errorMessage,
      });
      console.error('Error checking usage limit:', error);
      return UsageLimitResult.failed([
        'Internal error occurred while checking usage limit',
      ]);
    }
  }

  /**
   * 记录服务使用
   */
  public async recordUsage(ip: string): Promise<UsageTrackingResult> {
    try {
      // 验证IP地址
      if (!UsageLimitRules.isValidIPAddress(ip)) {
        return UsageTrackingResult.failed('Invalid IP address format');
      }

      // 获取使用限制
      const usageLimit = await this.repository.findByIP(ip);
      if (!usageLimit) {
        return UsageTrackingResult.failed(
          'Usage limit not found. Please check limit first.',
        );
      }

      // 记录使用
      const recordResult = usageLimit.recordUsage();
      if (!recordResult.isSuccess()) {
        await this.auditLogger.logBusinessEvent('USAGE_RECORDING_FAILED', {
          ip,
          error: recordResult.getError(),
        });
        return UsageTrackingResult.failed(recordResult.getError() ?? 'Unknown error');
      }

      // 发布领域事件
      const events = usageLimit.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      usageLimit.markEventsAsCommitted();

      // 保存更新
      await this.repository.save(usageLimit);

      // 记录成功使用
      await this.auditLogger.logBusinessEvent('USAGE_RECORDED', {
        ip,
        currentUsage: recordResult.getCurrentUsage(),
        remainingQuota: recordResult.getRemainingQuota(),
      });

      return UsageTrackingResult.success({
        currentUsage: recordResult.getCurrentUsage() ?? 0,
        remainingQuota: recordResult.getRemainingQuota() ?? 0,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('RECORD_USAGE_ERROR', {
        ip,
        error: errorMessage,
      });
      console.error('Error recording usage:', error);
      return UsageTrackingResult.failed(
        'Internal error occurred while recording usage',
      );
    }
  }

  /**
   * 添加奖励配额
   */
  public async addBonusQuota(
    ip: string,
    bonusType: BonusType,
    customAmount?: number,
  ): Promise<BonusQuotaResult> {
    try {
      // 验证输入
      if (!UsageLimitRules.isValidIPAddress(ip)) {
        return BonusQuotaResult.failed(['Invalid IP address format']);
      }

      // 获取使用限制
      const usageLimit = await this.repository.findByIP(ip);
      if (!usageLimit) {
        return BonusQuotaResult.failed(['Usage limit not found for IP']);
      }

      // 确定奖励数量
      const bonusAmount =
        customAmount || UsageLimitRules.calculateBonusQuota(bonusType);
      const statistics = usageLimit.getUsageStatistics();

      // 验证奖励请求
      const validation = UsageLimitRules.validateBonusQuotaRequest(
        bonusType,
        bonusAmount,
        statistics.bonusQuota,
        UsageLimitPolicy.createDefault(),
      );

      if (!validation.isValid) {
        await this.auditLogger.logBusinessEvent('BONUS_QUOTA_REJECTED', {
          ip,
          bonusType,
          requestedAmount: bonusAmount,
          errors: validation.errors,
        });
        return BonusQuotaResult.failed(validation.errors);
      }

      // 添加奖励配额
      usageLimit.addBonusQuota(bonusType, validation.approvedAmount);

      // 发布领域事件
      const events = usageLimit.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      usageLimit.markEventsAsCommitted();

      // 保存更新
      await this.repository.save(usageLimit);

      // 记录成功添加
      await this.auditLogger.logBusinessEvent('BONUS_QUOTA_ADDED', {
        ip,
        bonusType,
        addedAmount: validation.approvedAmount,
        newTotalQuota:
          usageLimit.getAvailableQuota() + usageLimit.getCurrentUsage(),
      });

      return BonusQuotaResult.success({
        addedAmount: validation.approvedAmount,
        newTotalQuota:
          usageLimit.getAvailableQuota() + usageLimit.getCurrentUsage(),
        bonusType,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('ADD_BONUS_QUOTA_ERROR', {
        ip,
        bonusType,
        error: errorMessage,
      });
      console.error('Error adding bonus quota:', error);
      return BonusQuotaResult.failed([
        'Internal error occurred while adding bonus quota',
      ]);
    }
  }

  /**
   * 获取使用统计信息
   */
  public async getUsageStatistics(ip?: string): Promise<UsageStatsResult> {
    try {
      if (ip) {
        // 获取特定IP的统计
        if (!UsageLimitRules.isValidIPAddress(ip)) {
          return UsageStatsResult.failed(['Invalid IP address format']);
        }

        const usageLimit = await this.repository.findByIP(ip);
        if (!usageLimit) {
          return UsageStatsResult.failed(['Usage limit not found for IP']);
        }

        const statistics = usageLimit.getUsageStatistics();
        const efficiency = UsageLimitRules.calculateUsageEfficiency(statistics);

        return UsageStatsResult.success({
          individual: {
            ip: statistics.ip,
            currentUsage: statistics.currentUsage,
            dailyLimit: statistics.dailyLimit,
            availableQuota: statistics.availableQuota,
            bonusQuota: statistics.bonusQuota,
            resetAt: statistics.resetAt,
            lastActivityAt: statistics.lastActivityAt,
            usagePercentage: statistics.getUsagePercentage(),
            efficiency,
          },
        });
      } else {
        // 获取系统整体统计
        const systemStats = await this.calculateSystemStatistics();
        return UsageStatsResult.success({ system: systemStats });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('GET_USAGE_STATISTICS_ERROR', {
        ip,
        error: errorMessage,
      });
      console.error('Error getting usage statistics:', error);
      return UsageStatsResult.failed([
        'Internal error occurred while getting statistics',
      ]);
    }
  }

  /**
   * 分析使用模式和趋势
   */
  public async analyzeUsagePatterns(
    timeRange: TimeRange,
  ): Promise<UsageAnalysisResult> {
    try {
      const allUsageLimits = await this.repository.findByTimeRange(
        timeRange.startDate,
        timeRange.endDate,
      );

      if (allUsageLimits.length === 0) {
        return UsageAnalysisResult.empty();
      }

      const analysis = this.performUsageAnalysis(allUsageLimits, timeRange);

      await this.auditLogger.logBusinessEvent('USAGE_ANALYSIS_PERFORMED', {
        timeRange,
        totalIPs: allUsageLimits.length,
        analysisType: 'pattern_analysis',
      });

      return UsageAnalysisResult.success(analysis);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('ANALYZE_USAGE_PATTERNS_ERROR', {
        timeRange,
        error: errorMessage,
      });
      console.error('Error analyzing usage patterns:', error);
      return UsageAnalysisResult.failed([
        'Internal error occurred during analysis',
      ]);
    }
  }

  /**
   * 获取高风险IP列表
   */
  public async getHighRiskIPs(): Promise<RiskAssessmentResult> {
    try {
      const allUsageLimits = await this.repository.findAll();
      const riskAssessments: IPRiskAssessment[] = [];

      for (const usageLimit of allUsageLimits) {
        const statistics = usageLimit.getUsageStatistics();
        const riskScore = UsageLimitRules.calculateRiskScore(statistics);

        if (riskScore.score >= 40) {
          // Medium risk threshold
          riskAssessments.push({
            ip: statistics.ip,
            riskScore: riskScore.score,
            riskFactors: riskScore.factors,
            currentUsage: statistics.currentUsage,
            availableQuota: statistics.availableQuota,
            lastActivity: statistics.lastActivityAt,
            recommendedAction:
              riskScore.score >= 70
                ? 'BLOCK'
                : riskScore.score >= 60
                  ? 'MONITOR'
                  : 'WARN',
          });
        }
      }

      // 按风险评分排序
      riskAssessments.sort((a, b) => b.riskScore - a.riskScore);

      return RiskAssessmentResult.success(riskAssessments);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('GET_HIGH_RISK_IPS_ERROR', {
        error: errorMessage,
      });
      console.error('Error getting high risk IPs:', error);
      return RiskAssessmentResult.failed([
        'Internal error occurred during risk assessment',
      ]);
    }
  }

  private async calculateSystemStatistics(): Promise<SystemUsageStatistics> {
    const allUsageLimits = await this.repository.findAll();

    let totalUsage = 0;
    let totalQuota = 0;
    let totalBonusQuota = 0;
    let activeIPs = 0;

    for (const usageLimit of allUsageLimits) {
      const stats = usageLimit.getUsageStatistics();
      totalUsage += stats.currentUsage;
      totalQuota += stats.availableQuota;
      totalBonusQuota += stats.bonusQuota;

      if (
        stats.lastActivityAt &&
        Date.now() - stats.lastActivityAt.getTime() < 24 * 60 * 60 * 1000
      ) {
        activeIPs++;
      }
    }

    return {
      totalIPs: allUsageLimits.length,
      activeIPs,
      totalUsage,
      totalQuota,
      totalBonusQuota,
      systemUtilization: totalQuota > 0 ? (totalUsage / totalQuota) * 100 : 0,
      averageUsagePerIP:
        allUsageLimits.length > 0 ? totalUsage / allUsageLimits.length : 0,
    };
  }

  private performUsageAnalysis(
    usageLimits: UsageLimit[],
    timeRange: TimeRange,
  ): UsagePatternAnalysis {
    const patterns: UsagePattern[] = [];

    // 分析使用模式
    const hourlyUsage = new Map<number, number>();
    const dailyUsage = new Map<string, number>();

    for (const usageLimit of usageLimits) {
      const stats = usageLimit.getUsageStatistics();

      // 按小时统计
      if (stats.lastActivityAt) {
        const hour = stats.lastActivityAt.getHours();
        hourlyUsage.set(
          hour,
          (hourlyUsage.get(hour) || 0) + stats.currentUsage,
        );
      }

      // 按日期统计
      if (stats.lastActivityAt) {
        const dateStr = stats.lastActivityAt.toISOString().split('T')[0];
        dailyUsage.set(
          dateStr,
          (dailyUsage.get(dateStr) || 0) + stats.currentUsage,
        );
      }
    }

    return {
      timeRange,
      totalAnalyzedIPs: usageLimits.length,
      patterns,
      hourlyDistribution: Object.fromEntries(hourlyUsage),
      dailyDistribution: Object.fromEntries(dailyUsage),
      peakUsageHour: this.findPeakHour(hourlyUsage),
      averageUsagePerIP:
        usageLimits.reduce((sum, ul) => sum + ul.getCurrentUsage(), 0) /
        usageLimits.length,
    };
  }

  private findPeakHour(hourlyUsage: Map<number, number>): number {
    let maxUsage = 0;
    let peakHour = 0;

    for (const [hour, usage] of hourlyUsage) {
      if (usage > maxUsage) {
        maxUsage = usage;
        peakHour = hour;
      }
    }

    return peakHour;
  }
}

// 结果类和接口定义
/**
 * Represents the usage limit result.
 */
export class UsageLimitResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      allowed: boolean;
      remainingQuota: number;
      currentUsage: number;
      dailyLimit: number;
      resetAt: Date;
      bonusQuota: number;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The UsageLimitResult.
   */
  public static success(data: {
    allowed: boolean;
    remainingQuota: number;
    currentUsage: number;
    dailyLimit: number;
    resetAt: Date;
    bonusQuota: number;
  }): UsageLimitResult {
    return new UsageLimitResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The UsageLimitResult.
   */
  public static failed(errors: string[]): UsageLimitResult {
    return new UsageLimitResult(false, undefined, errors);
  }
}

/**
 * Represents the usage tracking result.
 */
export class UsageTrackingResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      currentUsage: number;
      remainingQuota: number;
      timestamp: Date;
    },
    public readonly error?: string,
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The UsageTrackingResult.
   */
  public static success(data: {
    currentUsage: number;
    remainingQuota: number;
    timestamp: Date;
  }): UsageTrackingResult {
    return new UsageTrackingResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param error - The error.
   * @returns The UsageTrackingResult.
   */
  public static failed(error: string): UsageTrackingResult {
    return new UsageTrackingResult(false, undefined, error);
  }
}

/**
 * Represents the bonus quota result.
 */
export class BonusQuotaResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      addedAmount: number;
      newTotalQuota: number;
      bonusType: BonusType;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The BonusQuotaResult.
   */
  public static success(data: {
    addedAmount: number;
    newTotalQuota: number;
    bonusType: BonusType;
  }): BonusQuotaResult {
    return new BonusQuotaResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The BonusQuotaResult.
   */
  public static failed(errors: string[]): BonusQuotaResult {
    return new BonusQuotaResult(false, undefined, errors);
  }
}

/**
 * Represents the usage stats result.
 */
export class UsageStatsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      individual?: {
        ip: string;
        currentUsage: number;
        dailyLimit: number;
        availableQuota: number;
        bonusQuota: number;
        resetAt: Date;
        lastActivityAt?: Date;
        usagePercentage: number;
        efficiency: UsageEfficiency;
      };
      system?: SystemUsageStatistics;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The UsageStatsResult.
   */
  public static success(data: {
    individual?: {
      ip: string;
      currentUsage: number;
      dailyLimit: number;
      availableQuota: number;
      bonusQuota: number;
      resetAt: Date;
      lastActivityAt?: Date;
      usagePercentage: number;
      efficiency: UsageEfficiency;
    };
    system?: SystemUsageStatistics;
  }): UsageStatsResult {
    return new UsageStatsResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The UsageStatsResult.
   */
  public static failed(errors: string[]): UsageStatsResult {
    return new UsageStatsResult(false, undefined, errors);
  }
}

/**
 * Represents the usage analysis result.
 */
export class UsageAnalysisResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: UsagePatternAnalysis,
    public readonly errors?: string[],
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The UsageAnalysisResult.
   */
  public static success(data: UsagePatternAnalysis): UsageAnalysisResult {
    return new UsageAnalysisResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The UsageAnalysisResult.
   */
  public static failed(errors: string[]): UsageAnalysisResult {
    return new UsageAnalysisResult(false, undefined, errors);
  }

  /**
   * Performs the empty operation.
   * @returns The UsageAnalysisResult.
   */
  public static empty(): UsageAnalysisResult {
    return new UsageAnalysisResult(true, {
      timeRange: { startDate: new Date(), endDate: new Date() },
      totalAnalyzedIPs: 0,
      patterns: [],
      hourlyDistribution: {},
      dailyDistribution: {},
      peakUsageHour: 0,
      averageUsagePerIP: 0,
    });
  }
}

/**
 * Represents the risk assessment result.
 */
export class RiskAssessmentResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: IPRiskAssessment[],
    public readonly errors?: string[],
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The RiskAssessmentResult.
   */
  public static success(data: IPRiskAssessment[]): RiskAssessmentResult {
    return new RiskAssessmentResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The RiskAssessmentResult.
   */
  public static failed(errors: string[]): RiskAssessmentResult {
    return new RiskAssessmentResult(false, undefined, errors);
  }
}

// 类型定义
/**
 * Defines the shape of the time range.
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Defines the shape of the system usage statistics.
 */
export interface SystemUsageStatistics {
  totalIPs: number;
  activeIPs: number;
  totalUsage: number;
  totalQuota: number;
  totalBonusQuota: number;
  systemUtilization: number;
  averageUsagePerIP: number;
}

/**
 * Defines the shape of the usage pattern.
 */
export interface UsagePattern {
  type: 'peak' | 'low' | 'consistent' | 'sporadic';
  timeWindow: string;
  frequency: number;
  description: string;
}

/**
 * Defines the shape of the usage pattern analysis.
 */
export interface UsagePatternAnalysis {
  timeRange: TimeRange;
  totalAnalyzedIPs: number;
  patterns: UsagePattern[];
  hourlyDistribution: { [hour: string]: number };
  dailyDistribution: { [date: string]: number };
  peakUsageHour: number;
  averageUsagePerIP: number;
}

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

// 接口定义
/**
 * Defines the shape of the i usage limit repository.
 */
export interface IUsageLimitRepository {
  save(usageLimit: UsageLimit): Promise<void>;
  findByIP(ip: string): Promise<UsageLimit | null>;
  findAll(): Promise<UsageLimit[]>;
  findByTimeRange(startDate: Date, endDate: Date): Promise<UsageLimit[]>;
  deleteExpired(olderThan: Date): Promise<number>;
}

/**
 * Defines the shape of the i domain event bus.
 */
export interface IDomainEventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish(event: any): Promise<void>;
}

/**
 * Defines the shape of the i audit logger.
 */
export interface IAuditLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logBusinessEvent(eventType: string, data: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logSecurityEvent(eventType: string, data: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logError(eventType: string, data: any): Promise<void>;
  logViolation(eventType: string, report: UsageViolationReport): Promise<void>;
}
