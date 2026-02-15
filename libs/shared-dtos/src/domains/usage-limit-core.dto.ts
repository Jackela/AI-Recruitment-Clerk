import type { DomainEvent } from '../base/domain-event';
import type { BonusType } from './usage-limit-types.dto';
import {
  UsageLimitPolicy,
  QuotaAllocation,
  UsageTracking,
} from './usage-limit-types.dto';
import {
  UsageLimitCreatedEvent,
  UsageLimitExceededEvent,
  UsageRecordedEvent,
  BonusQuotaAddedEvent,
  DailyUsageResetEvent,
} from './usage-limit-events.dto';
import {
  UsageLimitCheckResult,
  UsageRecordResult,
  UsageStatistics,
} from './usage-limit-results.dto';
import type { UsageLimitData } from './usage-limit-types.dto';
import { UsageLimitId, IPAddress } from './usage-limit-types.dto';

/**
 * UsageLimit聚合根 - 管理IP使用限制和配额分配
 * Represents usage limit with core business logic.
 */
export class UsageLimit {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: UsageLimitId,
    private readonly ip: IPAddress,
    private readonly policy: UsageLimitPolicy,
    private quotaAllocation: QuotaAllocation,
    private usageTracking: UsageTracking,
    private lastResetAt: Date,
  ) {}

  // 工厂方法 - 创建新的使用限制
  /**
   * Creates a UsageLimit entity.
   * @param ip - The IP address.
   * @param policy - The policy.
   * @returns The UsageLimit.
   */
  public static create(ip: string, policy: UsageLimitPolicy): UsageLimit {
    const limitId = UsageLimitId.generate();
    const ipAddress = new IPAddress({ value: ip });
    const quotaAllocation = QuotaAllocation.createDefault(policy.dailyLimit);
    const usageTracking = UsageTracking.createEmpty();
    const now = new Date();

    const usageLimit = new UsageLimit(
      limitId,
      ipAddress,
      policy,
      quotaAllocation,
      usageTracking,
      now,
    );

    usageLimit.addEvent(
      new UsageLimitCreatedEvent(
        limitId.getValue(),
        ip,
        policy.dailyLimit,
        now,
      ),
    );

    return usageLimit;
  }

  // 工厂方法 - 从持久化数据恢复
  /**
   * Restores a UsageLimit from data.
   * @param data - The data.
   * @returns The UsageLimit.
   */
  public static restore(data: UsageLimitData): UsageLimit {
    return new UsageLimit(
      new UsageLimitId({ value: data.id }),
      new IPAddress({ value: data.ip }),
      UsageLimitPolicy.restore(data.policy),
      QuotaAllocation.restore(data.quotaAllocation),
      UsageTracking.restore(data.usageTracking),
      new Date(data.lastResetAt),
    );
  }

  // 核心业务方法 - 检查是否可以使用
  /**
   * Checks if usage is allowed.
   * @returns The UsageLimitCheckResult.
   */
  public canUse(): UsageLimitCheckResult {
    this.resetIfNeeded();

    const currentUsage = this.usageTracking.getCurrentCount();
    const availableQuota = this.quotaAllocation.getAvailableQuota();

    if (currentUsage >= availableQuota) {
      const reason = this.generateLimitReachedReason();
      this.addEvent(
        new UsageLimitExceededEvent(
          this.id.getValue(),
          this.ip.getValue(),
          currentUsage,
          availableQuota,
          reason,
          new Date(),
        ),
      );

      return UsageLimitCheckResult.blocked(reason);
    }

    return UsageLimitCheckResult.allowed(availableQuota - currentUsage);
  }

  // 记录使用
  /**
   * Records usage.
   * @returns The UsageRecordResult.
   */
  public recordUsage(): UsageRecordResult {
    this.resetIfNeeded();

    const checkResult = this.canUse();
    if (!checkResult.isAllowed()) {
      return UsageRecordResult.failed(checkResult.getBlockReason() ?? 'Unknown block reason');
    }

    const previousCount = this.usageTracking.getCurrentCount();
    this.usageTracking = this.usageTracking.incrementUsage();

    this.addEvent(
      new UsageRecordedEvent(
        this.id.getValue(),
        this.ip.getValue(),
        previousCount + 1,
        this.quotaAllocation.getAvailableQuota(),
        new Date(),
      ),
    );

    return UsageRecordResult.success(
      this.usageTracking.getCurrentCount(),
      this.quotaAllocation.getAvailableQuota() -
        this.usageTracking.getCurrentCount(),
    );
  }

  // 添加奖励配额
  /**
   * Adds bonus quota.
   * @param bonusType - The bonus type.
   * @param amount - The amount.
   */
  public addBonusQuota(bonusType: BonusType, amount: number): void {
    if (amount <= 0) {
      throw new Error('Bonus quota amount must be positive');
    }

    const newAllocation = this.quotaAllocation.addBonus(bonusType, amount);
    this.quotaAllocation = newAllocation;

    this.addEvent(
      new BonusQuotaAddedEvent(
        this.id.getValue(),
        this.ip.getValue(),
        bonusType,
        amount,
        newAllocation.getAvailableQuota(),
        new Date(),
      ),
    );
  }

  // 检查是否需要重置（每日午夜）
  private resetIfNeeded(): void {
    const now = new Date();
    const lastMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const lastResetMidnight = new Date(
      this.lastResetAt.getFullYear(),
      this.lastResetAt.getMonth(),
      this.lastResetAt.getDate(),
    );

    if (lastMidnight > lastResetMidnight) {
      this.performDailyReset();
    }
  }

  // 执行每日重置
  private performDailyReset(): void {
    const oldUsage = this.usageTracking.getCurrentCount();
    const oldQuota = this.quotaAllocation.getAvailableQuota();

    this.usageTracking = UsageTracking.createEmpty();
    this.quotaAllocation = QuotaAllocation.createDefault(
      this.policy.dailyLimit,
    );
    this.lastResetAt = new Date();

    this.addEvent(
      new DailyUsageResetEvent(
        this.id.getValue(),
        this.ip.getValue(),
        oldUsage,
        oldQuota,
        this.policy.dailyLimit,
        this.lastResetAt,
      ),
    );
  }

  private generateLimitReachedReason(): string {
    const current = this.usageTracking.getCurrentCount();
    const available = this.quotaAllocation.getAvailableQuota();

    return (
      `Daily usage limit reached: ${current}/${available} uses consumed. ` +
      `Limit resets at midnight UTC. Consider completing questionnaire for bonus quota.`
    );
  }

  // 查询方法
  /**
   * Gets usage statistics.
   * @returns The UsageStatistics.
   */
  public getUsageStatistics(): UsageStatistics {
    return new UsageStatistics({
      ip: this.ip.getValue(),
      currentUsage: this.usageTracking.getCurrentCount(),
      dailyLimit: this.policy.dailyLimit,
      availableQuota: this.quotaAllocation.getAvailableQuota(),
      bonusQuota: this.quotaAllocation.getBonusQuota(),
      resetAt: this.getNextResetTime(),
      lastActivityAt: this.usageTracking.getLastUsageAt(),
    });
  }

  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // 领域事件管理
  /**
   * Gets uncommitted events.
   * @returns An array of DomainEvent.
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Marks events as committed.
   */
  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  /**
   * Gets the usage limit ID.
   * @returns The UsageLimitId.
   */
  public getId(): UsageLimitId {
    return this.id;
  }

  /**
   * Gets the IP address.
   * @returns The string value.
   */
  public getIP(): string {
    return this.ip.getValue();
  }

  /**
   * Gets current usage count.
   * @returns The number value.
   */
  public getCurrentUsage(): number {
    return this.usageTracking.getCurrentCount();
  }

  /**
   * Gets available quota.
   * @returns The number value.
   */
  public getAvailableQuota(): number {
    return (
      this.quotaAllocation.getAvailableQuota() -
        this.usageTracking.getCurrentCount()
    );
  }
}
