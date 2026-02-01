import { ValueObject } from '../base/value-object';
import type { DomainEvent } from '../base/domain-event';

// UsageLimit聚合根 - 管理IP使用限制和配额分配
/**
 * Represents the usage limit.
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
   * Creates the entity.
   * @param ip - The ip.
   * @param policy - The policy.
   * @returns The UsageLimit.
   */
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
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UsageLimit.
   */
  static restore(data: UsageLimitData): UsageLimit {
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
   * Performs the can use operation.
   * @returns The UsageLimitCheckResult.
   */
  canUse(): UsageLimitCheckResult {
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
   * Performs the record usage operation.
   * @returns The UsageRecordResult.
   */
  recordUsage(): UsageRecordResult {
    this.resetIfNeeded();

    const checkResult = this.canUse();
    if (!checkResult.isAllowed()) {
      return UsageRecordResult.failed(checkResult.getBlockReason()!);
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
   * Performs the add bonus quota operation.
   * @param bonusType - The bonus type.
   * @param amount - The amount.
   */
  addBonusQuota(bonusType: BonusType, amount: number): void {
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
   * Retrieves usage statistics.
   * @returns The UsageStatistics.
   */
  getUsageStatistics(): UsageStatistics {
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
   * Retrieves uncommitted events.
   * @returns The an array of DomainEvent.
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Performs the mark events as committed operation.
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  /**
   * Retrieves id.
   * @returns The UsageLimitId.
   */
  getId(): UsageLimitId {
    return this.id;
  }

  /**
   * Retrieves ip.
   * @returns The string value.
   */
  getIP(): string {
    return this.ip.getValue();
  }

  /**
   * Retrieves current usage.
   * @returns The number value.
   */
  getCurrentUsage(): number {
    return this.usageTracking.getCurrentCount();
  }

  /**
   * Retrieves available quota.
   * @returns The number value.
   */
  getAvailableQuota(): number {
    return (
      this.quotaAllocation.getAvailableQuota() -
      this.usageTracking.getCurrentCount()
    );
  }
}

// 值对象定义
/**
 * Represents the usage limit id.
 */
export class UsageLimitId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The UsageLimitId.
   */
  static generate(): UsageLimitId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new UsageLimitId({ value: `usage_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents the ip address.
 */
export class IPAddress extends ValueObject<{ value: string }> {
  /**
   * Initializes a new instance of the IP Address.
   * @param props - The props.
   */
  constructor(props: { value: string }) {
    if (!IPAddress.isValidIPv4(props.value)) {
      throw new Error(`Invalid IPv4 address: ${props.value}`);
    }
    super(props);
  }

  private static isValidIPv4(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents the usage limit policy.
 */
export class UsageLimitPolicy extends ValueObject<{
  dailyLimit: number;
  bonusEnabled: boolean;
  maxBonusQuota: number;
  resetTimeUTC: number; // Hour of day (0-23)
}> {
  /**
   * Creates default.
   * @returns The UsageLimitPolicy.
   */
  static createDefault(): UsageLimitPolicy {
    return new UsageLimitPolicy({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 20,
      resetTimeUTC: 0, // Midnight UTC
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UsageLimitPolicy.
   */
  static restore(data: any): UsageLimitPolicy {
    return new UsageLimitPolicy(data);
  }

  /**
   * Performs the daily limit operation.
   * @returns The number value.
   */
  get dailyLimit(): number {
    return this.props.dailyLimit;
  }
  /**
   * Performs the bonus enabled operation.
   * @returns The boolean value.
   */
  get bonusEnabled(): boolean {
    return this.props.bonusEnabled;
  }
  /**
   * Performs the max bonus quota operation.
   * @returns The number value.
   */
  get maxBonusQuota(): number {
    return this.props.maxBonusQuota;
  }
  /**
   * Performs the reset time utc operation.
   * @returns The number value.
   */
  get resetTimeUTC(): number {
    return this.props.resetTimeUTC;
  }
}

/**
 * Represents the quota allocation.
 */
export class QuotaAllocation extends ValueObject<{
  baseQuota: number;
  bonusQuota: number;
  bonusBreakdown: Map<BonusType, number>;
}> {
  /**
   * Creates default.
   * @param baseQuota - The base quota.
   * @returns The QuotaAllocation.
   */
  static createDefault(baseQuota: number): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota,
      bonusQuota: 0,
      bonusBreakdown: new Map(),
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The QuotaAllocation.
   */
  static restore(data: any): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota: data.baseQuota,
      bonusQuota: data.bonusQuota,
      bonusBreakdown: new Map(data.bonusBreakdown || []),
    });
  }

  /**
   * Performs the add bonus operation.
   * @param bonusType - The bonus type.
   * @param amount - The amount.
   * @returns The QuotaAllocation.
   */
  addBonus(bonusType: BonusType, amount: number): QuotaAllocation {
    const currentBonus = this.props.bonusBreakdown.get(bonusType) || 0;
    const newBreakdown = new Map(this.props.bonusBreakdown);
    newBreakdown.set(bonusType, currentBonus + amount);

    return new QuotaAllocation({
      baseQuota: this.props.baseQuota,
      bonusQuota: this.props.bonusQuota + amount,
      bonusBreakdown: newBreakdown,
    });
  }

  /**
   * Retrieves available quota.
   * @returns The number value.
   */
  getAvailableQuota(): number {
    return this.props.baseQuota + this.props.bonusQuota;
  }

  /**
   * Retrieves bonus quota.
   * @returns The number value.
   */
  getBonusQuota(): number {
    return this.props.bonusQuota;
  }

  /**
   * Retrieves bonus breakdown.
   * @returns The Map<BonusType, number>.
   */
  getBonusBreakdown(): Map<BonusType, number> {
    return new Map(this.props.bonusBreakdown);
  }
}

/**
 * Represents the usage tracking.
 */
export class UsageTracking extends ValueObject<{
  currentCount: number;
  usageHistory: UsageRecord[];
  lastUsageAt?: Date;
}> {
  /**
   * Creates empty.
   * @returns The UsageTracking.
   */
  static createEmpty(): UsageTracking {
    return new UsageTracking({
      currentCount: 0,
      usageHistory: [],
      lastUsageAt: undefined,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UsageTracking.
   */
  static restore(data: any): UsageTracking {
    return new UsageTracking({
      currentCount: data.currentCount,
      usageHistory: data.usageHistory.map((r: any) => new UsageRecord(r)),
      lastUsageAt: data.lastUsageAt ? new Date(data.lastUsageAt) : undefined,
    });
  }

  /**
   * Performs the increment usage operation.
   * @returns The UsageTracking.
   */
  incrementUsage(): UsageTracking {
    const record = new UsageRecord({
      timestamp: new Date(),
      count: this.props.currentCount + 1,
    });

    return new UsageTracking({
      currentCount: this.props.currentCount + 1,
      usageHistory: [...this.props.usageHistory, record],
      lastUsageAt: new Date(),
    });
  }

  /**
   * Retrieves current count.
   * @returns The number value.
   */
  getCurrentCount(): number {
    return this.props.currentCount;
  }

  /**
   * Retrieves last usage at.
   * @returns The Date | undefined.
   */
  getLastUsageAt(): Date | undefined {
    return this.props.lastUsageAt;
  }

  /**
   * Retrieves usage history.
   * @returns The an array of UsageRecord.
   */
  getUsageHistory(): UsageRecord[] {
    return [...this.props.usageHistory];
  }
}

/**
 * Represents the usage record.
 */
export class UsageRecord extends ValueObject<{
  timestamp: Date;
  count: number;
}> {
  /**
   * Performs the timestamp operation.
   * @returns The Date.
   */
  get timestamp(): Date {
    return this.props.timestamp;
  }
  /**
   * Performs the count operation.
   * @returns The number value.
   */
  get count(): number {
    return this.props.count;
  }
}

// 结果类
/**
 * Represents the usage limit check result.
 */
export class UsageLimitCheckResult {
  private constructor(
    private readonly allowed: boolean,
    private readonly remainingQuota?: number,
    private readonly blockReason?: string,
  ) {}

  /**
   * Performs the allowed operation.
   * @param remainingQuota - The remaining quota.
   * @returns The UsageLimitCheckResult.
   */
  static allowed(remainingQuota: number): UsageLimitCheckResult {
    return new UsageLimitCheckResult(true, remainingQuota);
  }

  /**
   * Performs the blocked operation.
   * @param reason - The reason.
   * @returns The UsageLimitCheckResult.
   */
  static blocked(reason: string): UsageLimitCheckResult {
    return new UsageLimitCheckResult(false, undefined, reason);
  }

  /**
   * Performs the is allowed operation.
   * @returns The boolean value.
   */
  isAllowed(): boolean {
    return this.allowed;
  }

  /**
   * Retrieves remaining quota.
   * @returns The number | undefined.
   */
  getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  /**
   * Retrieves block reason.
   * @returns The string | undefined.
   */
  getBlockReason(): string | undefined {
    return this.blockReason;
  }
}

/**
 * Represents the usage record result.
 */
export class UsageRecordResult {
  private constructor(
    private readonly success: boolean,
    private readonly currentUsage?: number,
    private readonly remainingQuota?: number,
    private readonly error?: string,
  ) {}

  /**
   * Performs the success operation.
   * @param currentUsage - The current usage.
   * @param remainingQuota - The remaining quota.
   * @returns The UsageRecordResult.
   */
  static success(
    currentUsage: number,
    remainingQuota: number,
  ): UsageRecordResult {
    return new UsageRecordResult(true, currentUsage, remainingQuota);
  }

  /**
   * Performs the failed operation.
   * @param error - The error.
   * @returns The UsageRecordResult.
   */
  static failed(error: string): UsageRecordResult {
    return new UsageRecordResult(false, undefined, undefined, error);
  }

  /**
   * Performs the is success operation.
   * @returns The boolean value.
   */
  isSuccess(): boolean {
    return this.success;
  }

  /**
   * Retrieves current usage.
   * @returns The number | undefined.
   */
  getCurrentUsage(): number | undefined {
    return this.currentUsage;
  }

  /**
   * Retrieves remaining quota.
   * @returns The number | undefined.
   */
  getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  /**
   * Retrieves error.
   * @returns The string | undefined.
   */
  getError(): string | undefined {
    return this.error;
  }
}

/**
 * Represents the usage statistics.
 */
export class UsageStatistics extends ValueObject<{
  ip: string;
  currentUsage: number;
  dailyLimit: number;
  availableQuota: number;
  bonusQuota: number;
  resetAt: Date;
  lastActivityAt?: Date;
}> {
  /**
   * Performs the ip operation.
   * @returns The string value.
   */
  get ip(): string {
    return this.props.ip;
  }
  /**
   * Performs the current usage operation.
   * @returns The number value.
   */
  get currentUsage(): number {
    return this.props.currentUsage;
  }
  /**
   * Performs the daily limit operation.
   * @returns The number value.
   */
  get dailyLimit(): number {
    return this.props.dailyLimit;
  }
  /**
   * Performs the available quota operation.
   * @returns The number value.
   */
  get availableQuota(): number {
    return this.props.availableQuota;
  }
  /**
   * Performs the bonus quota operation.
   * @returns The number value.
   */
  get bonusQuota(): number {
    return this.props.bonusQuota;
  }
  /**
   * Performs the reset at operation.
   * @returns The Date.
   */
  get resetAt(): Date {
    return this.props.resetAt;
  }
  /**
   * Performs the last activity at operation.
   * @returns The Date | undefined.
   */
  get lastActivityAt(): Date | undefined {
    return this.props.lastActivityAt;
  }

  /**
   * Retrieves usage percentage.
   * @returns The number value.
   */
  getUsagePercentage(): number {
    return Math.round(
      (this.props.currentUsage / this.props.availableQuota) * 100,
    );
  }
}

// 枚举和类型
export enum BonusType {
  QUESTIONNAIRE = 'questionnaire',
  PAYMENT = 'payment',
  REFERRAL = 'referral',
  PROMOTION = 'promotion',
}

/**
 * Defines the shape of the usage limit data.
 */
export interface UsageLimitData {
  id: string;
  ip: string;
  policy: any;
  quotaAllocation: any;
  usageTracking: any;
  lastResetAt: string;
}

// 领域事件
/**
 * Represents the usage limit created event event.
 */
export class UsageLimitCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Usage Limit Created Event.
   * @param usageLimitId - The usage limit id.
   * @param ip - The ip.
   * @param dailyLimit - The daily limit.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly dailyLimit: number,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the usage limit exceeded event event.
 */
export class UsageLimitExceededEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Usage Limit Exceeded Event.
   * @param usageLimitId - The usage limit id.
   * @param ip - The ip.
   * @param currentUsage - The current usage.
   * @param availableQuota - The available quota.
   * @param reason - The reason.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly currentUsage: number,
    public readonly availableQuota: number,
    public readonly reason: string,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the usage recorded event event.
 */
export class UsageRecordedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Usage Recorded Event.
   * @param usageLimitId - The usage limit id.
   * @param ip - The ip.
   * @param newUsageCount - The new usage count.
   * @param remainingQuota - The remaining quota.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly newUsageCount: number,
    public readonly remainingQuota: number,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the bonus quota added event event.
 */
export class BonusQuotaAddedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Bonus Quota Added Event.
   * @param usageLimitId - The usage limit id.
   * @param ip - The ip.
   * @param bonusType - The bonus type.
   * @param bonusAmount - The bonus amount.
   * @param newTotalQuota - The new total quota.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly bonusType: BonusType,
    public readonly bonusAmount: number,
    public readonly newTotalQuota: number,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the daily usage reset event event.
 */
export class DailyUsageResetEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Daily Usage Reset Event.
   * @param usageLimitId - The usage limit id.
   * @param ip - The ip.
   * @param previousUsage - The previous usage.
   * @param previousQuota - The previous quota.
   * @param newDailyLimit - The new daily limit.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly previousUsage: number,
    public readonly previousQuota: number,
    public readonly newDailyLimit: number,
    public readonly occurredAt: Date,
  ) {}
}
