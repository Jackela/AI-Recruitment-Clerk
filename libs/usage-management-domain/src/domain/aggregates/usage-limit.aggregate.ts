import { DomainEvent } from '../domain-events/base/domain-event.js';
import { UsageLimitId } from '../value-objects/usage-limit-id.value-object.js';
import { IPAddress } from '../value-objects/ip-address.value-object.js';
import { UsageLimitPolicy } from '../value-objects/usage-limit-policy.value-object.js';
import { QuotaAllocation } from '../value-objects/quota-allocation.value-object.js';
import { UsageTracking } from '../value-objects/usage-tracking.value-object.js';
import { UsageLimitCheckResult } from '../value-objects/usage-limit-check-result.value-object.js';
import { UsageRecordResult } from '../value-objects/usage-record-result.value-object.js';
import { UsageStatistics } from '../value-objects/usage-statistics.value-object.js';
import { UsageLimitCreatedEvent } from '../domain-events/usage-limit-created.event.js';
import { UsageLimitExceededEvent } from '../domain-events/usage-limit-exceeded.event.js';
import { UsageRecordedEvent } from '../domain-events/usage-recorded.event.js';
import { BonusQuotaAddedEvent } from '../domain-events/bonus-quota-added.event.js';
import { DailyUsageResetEvent } from '../domain-events/daily-usage-reset.event.js';
import { BonusType, UsageLimitData } from '../../application/dtos/usage-limit.dto.js';

// UsageLimit聚合根 - 管理IP使用限制和配额分配
export class UsageLimit {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: UsageLimitId,
    private readonly ip: IPAddress,
    private readonly policy: UsageLimitPolicy,
    private quotaAllocation: QuotaAllocation,
    private usageTracking: UsageTracking,
    private lastResetAt: Date
  ) {}

  // 工厂方法 - 创建新的使用限制
  static create(ip: string, policy: UsageLimitPolicy): UsageLimit {
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
      now
    );

    usageLimit.addEvent(new UsageLimitCreatedEvent(
      limitId.getValue(),
      ip,
      policy.dailyLimit,
      now
    ));

    return usageLimit;
  }

  // 工厂方法 - 从持久化数据恢复
  static restore(data: UsageLimitData): UsageLimit {
    return new UsageLimit(
      new UsageLimitId({ value: data.id }),
      new IPAddress({ value: data.ip }),
      UsageLimitPolicy.restore(data.policy),
      QuotaAllocation.restore(data.quotaAllocation),
      UsageTracking.restore(data.usageTracking),
      new Date(data.lastResetAt)
    );
  }

  // 核心业务方法 - 检查是否可以使用
  canUse(): UsageLimitCheckResult {
    this.resetIfNeeded();
    
    const currentUsage = this.usageTracking.getCurrentCount();
    const availableQuota = this.quotaAllocation.getAvailableQuota();

    if (currentUsage >= availableQuota) {
      const reason = this.generateLimitReachedReason();
      this.addEvent(new UsageLimitExceededEvent(
        this.id.getValue(),
        this.ip.getValue(),
        currentUsage,
        availableQuota,
        reason,
        new Date()
      ));
      
      return UsageLimitCheckResult.blocked(reason);
    }

    return UsageLimitCheckResult.allowed(availableQuota - currentUsage);
  }

  // 记录使用
  recordUsage(): UsageRecordResult {
    this.resetIfNeeded();

    const checkResult = this.canUse();
    if (!checkResult.isAllowed()) {
      return UsageRecordResult.failed(checkResult.getBlockReason()!);
    }

    const previousCount = this.usageTracking.getCurrentCount();
    this.usageTracking = this.usageTracking.incrementUsage();

    this.addEvent(new UsageRecordedEvent(
      this.id.getValue(),
      this.ip.getValue(),
      previousCount + 1,
      this.quotaAllocation.getAvailableQuota(),
      new Date()
    ));

    return UsageRecordResult.success(
      this.usageTracking.getCurrentCount(),
      this.quotaAllocation.getAvailableQuota() - this.usageTracking.getCurrentCount()
    );
  }

  // 添加奖励配额
  addBonusQuota(bonusType: BonusType, amount: number): void {
    if (amount <= 0) {
      throw new Error('Bonus quota amount must be positive');
    }

    const newAllocation = this.quotaAllocation.addBonus(bonusType, amount);
    this.quotaAllocation = newAllocation;

    this.addEvent(new BonusQuotaAddedEvent(
      this.id.getValue(),
      this.ip.getValue(),
      bonusType,
      amount,
      newAllocation.getAvailableQuota(),
      new Date()
    ));
  }

  // 检查是否需要重置（每日午夜）
  private resetIfNeeded(): void {
    const now = new Date();
    const lastMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastResetMidnight = new Date(this.lastResetAt.getFullYear(), this.lastResetAt.getMonth(), this.lastResetAt.getDate());

    if (lastMidnight > lastResetMidnight) {
      this.performDailyReset();
    }
  }

  // 执行每日重置
  private performDailyReset(): void {
    const oldUsage = this.usageTracking.getCurrentCount();
    const oldQuota = this.quotaAllocation.getAvailableQuota();
    
    this.usageTracking = UsageTracking.createEmpty();
    this.quotaAllocation = QuotaAllocation.createDefault(this.policy.dailyLimit);
    this.lastResetAt = new Date();

    this.addEvent(new DailyUsageResetEvent(
      this.id.getValue(),
      this.ip.getValue(),
      oldUsage,
      oldQuota,
      this.policy.dailyLimit,
      this.lastResetAt
    ));
  }

  private generateLimitReachedReason(): string {
    const current = this.usageTracking.getCurrentCount();
    const available = this.quotaAllocation.getAvailableQuota();
    
    return `Daily usage limit reached: ${current}/${available} uses consumed. ` +
           `Limit resets at midnight UTC. Consider completing questionnaire for bonus quota.`;
  }

  // 查询方法
  getUsageStatistics(): UsageStatistics {
    return new UsageStatistics({
      ip: this.ip.getValue(),
      currentUsage: this.usageTracking.getCurrentCount(),
      dailyLimit: this.policy.dailyLimit,
      availableQuota: this.quotaAllocation.getAvailableQuota(),
      bonusQuota: this.quotaAllocation.getBonusQuota(),
      resetAt: this.getNextResetTime(),
      lastActivityAt: this.usageTracking.getLastUsageAt()
    });
  }

  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // 领域事件管理
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  getId(): UsageLimitId {
    return this.id;
  }

  getIP(): string {
    return this.ip.getValue();
  }

  getCurrentUsage(): number {
    return this.usageTracking.getCurrentCount();
  }

  getAvailableQuota(): number {
    return this.quotaAllocation.getAvailableQuota() - this.usageTracking.getCurrentCount();
  }
}
