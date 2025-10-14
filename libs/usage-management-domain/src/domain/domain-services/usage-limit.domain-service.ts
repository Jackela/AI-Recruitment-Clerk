import { UsageLimit } from '../aggregates/usage-limit.aggregate.js';
import { UsageLimitPolicy } from '../value-objects/usage-limit-policy.value-object.js';
import { BonusType } from '../../application/dtos/usage-limit.dto.js';
import {
  UsageLimitRules,
  UsageViolationReport,
  UsageEfficiency,
} from './usage-limit.rules.js';

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
  async checkUsageLimit(ip: string): Promise<UsageLimitResult> {
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
  async recordUsage(ip: string): Promise<UsageTrackingResult> {
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
        return UsageTrackingResult.failed(recordResult.getError()!);
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
        currentUsage: recordResult.getCurrentUsage()!,
        remainingQuota: recordResult.getRemainingQuota()!,
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
  async addBonusQuota(
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
  async getUsageStatistics(ip?: string): Promise<UsageStatsResult> {
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
  static success(data: {
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
  static failed(errors: string[]): UsageLimitResult {
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
  static success(data: {
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
  static failed(error: string): UsageTrackingResult {
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
  static success(data: {
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
  static failed(errors: string[]): BonusQuotaResult {
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
  static success(data: {
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
  static failed(errors: string[]): UsageStatsResult {
    return new UsageStatsResult(false, undefined, errors);
  }
}

// 类型定义
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
  publish(event: any): Promise<void>;
}

/**
 * Defines the shape of the i audit logger.
 */
export interface IAuditLogger {
  logBusinessEvent(eventType: string, data: any): Promise<void>;
  logSecurityEvent(eventType: string, data: any): Promise<void>;
  logError(eventType: string, data: any): Promise<void>;
  logViolation(eventType: string, report: UsageViolationReport): Promise<void>;
}
