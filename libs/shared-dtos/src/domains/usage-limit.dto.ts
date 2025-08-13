import { ValueObject } from '../base/value-object';
import { DomainEvent } from '../base/domain-event';

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

// 值对象定义
export class UsageLimitId extends ValueObject<{ value: string }> {
  static generate(): UsageLimitId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new UsageLimitId({ value: `usage_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}

export class IPAddress extends ValueObject<{ value: string }> {
  constructor(props: { value: string }) {
    if (!IPAddress.isValidIPv4(props.value)) {
      throw new Error(`Invalid IPv4 address: ${props.value}`);
    }
    super(props);
  }

  private static isValidIPv4(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  getValue(): string {
    return this.props.value;
  }
}

export class UsageLimitPolicy extends ValueObject<{
  dailyLimit: number;
  bonusEnabled: boolean;
  maxBonusQuota: number;
  resetTimeUTC: number; // Hour of day (0-23)
}> {
  static createDefault(): UsageLimitPolicy {
    return new UsageLimitPolicy({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 20,
      resetTimeUTC: 0 // Midnight UTC
    });
  }

  static restore(data: any): UsageLimitPolicy {
    return new UsageLimitPolicy(data);
  }

  get dailyLimit(): number { return this.props.dailyLimit; }
  get bonusEnabled(): boolean { return this.props.bonusEnabled; }
  get maxBonusQuota(): number { return this.props.maxBonusQuota; }
  get resetTimeUTC(): number { return this.props.resetTimeUTC; }
}

export class QuotaAllocation extends ValueObject<{
  baseQuota: number;
  bonusQuota: number;
  bonusBreakdown: Map<BonusType, number>;
}> {
  static createDefault(baseQuota: number): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota,
      bonusQuota: 0,
      bonusBreakdown: new Map()
    });
  }

  static restore(data: any): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota: data.baseQuota,
      bonusQuota: data.bonusQuota,
      bonusBreakdown: new Map(data.bonusBreakdown || [])
    });
  }

  addBonus(bonusType: BonusType, amount: number): QuotaAllocation {
    const currentBonus = this.props.bonusBreakdown.get(bonusType) || 0;
    const newBreakdown = new Map(this.props.bonusBreakdown);
    newBreakdown.set(bonusType, currentBonus + amount);

    return new QuotaAllocation({
      baseQuota: this.props.baseQuota,
      bonusQuota: this.props.bonusQuota + amount,
      bonusBreakdown: newBreakdown
    });
  }

  getAvailableQuota(): number {
    return this.props.baseQuota + this.props.bonusQuota;
  }

  getBonusQuota(): number {
    return this.props.bonusQuota;
  }

  getBonusBreakdown(): Map<BonusType, number> {
    return new Map(this.props.bonusBreakdown);
  }
}

export class UsageTracking extends ValueObject<{
  currentCount: number;
  usageHistory: UsageRecord[];
  lastUsageAt?: Date;
}> {
  static createEmpty(): UsageTracking {
    return new UsageTracking({
      currentCount: 0,
      usageHistory: [],
      lastUsageAt: undefined
    });
  }

  static restore(data: any): UsageTracking {
    return new UsageTracking({
      currentCount: data.currentCount,
      usageHistory: data.usageHistory.map((r: any) => new UsageRecord(r)),
      lastUsageAt: data.lastUsageAt ? new Date(data.lastUsageAt) : undefined
    });
  }

  incrementUsage(): UsageTracking {
    const record = new UsageRecord({
      timestamp: new Date(),
      count: this.props.currentCount + 1
    });

    return new UsageTracking({
      currentCount: this.props.currentCount + 1,
      usageHistory: [...this.props.usageHistory, record],
      lastUsageAt: new Date()
    });
  }

  getCurrentCount(): number {
    return this.props.currentCount;
  }

  getLastUsageAt(): Date | undefined {
    return this.props.lastUsageAt;
  }

  getUsageHistory(): UsageRecord[] {
    return [...this.props.usageHistory];
  }
}

export class UsageRecord extends ValueObject<{
  timestamp: Date;
  count: number;
}> {
  get timestamp(): Date { return this.props.timestamp; }
  get count(): number { return this.props.count; }
}

// 结果类
export class UsageLimitCheckResult {
  private constructor(
    private readonly allowed: boolean,
    private readonly remainingQuota?: number,
    private readonly blockReason?: string
  ) {}

  static allowed(remainingQuota: number): UsageLimitCheckResult {
    return new UsageLimitCheckResult(true, remainingQuota);
  }

  static blocked(reason: string): UsageLimitCheckResult {
    return new UsageLimitCheckResult(false, undefined, reason);
  }

  isAllowed(): boolean {
    return this.allowed;
  }

  getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  getBlockReason(): string | undefined {
    return this.blockReason;
  }
}

export class UsageRecordResult {
  private constructor(
    private readonly success: boolean,
    private readonly currentUsage?: number,
    private readonly remainingQuota?: number,
    private readonly error?: string
  ) {}

  static success(currentUsage: number, remainingQuota: number): UsageRecordResult {
    return new UsageRecordResult(true, currentUsage, remainingQuota);
  }

  static failed(error: string): UsageRecordResult {
    return new UsageRecordResult(false, undefined, undefined, error);
  }

  isSuccess(): boolean {
    return this.success;
  }

  getCurrentUsage(): number | undefined {
    return this.currentUsage;
  }

  getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  getError(): string | undefined {
    return this.error;
  }
}

export class UsageStatistics extends ValueObject<{
  ip: string;
  currentUsage: number;
  dailyLimit: number;
  availableQuota: number;
  bonusQuota: number;
  resetAt: Date;
  lastActivityAt?: Date;
}> {
  get ip(): string { return this.props.ip; }
  get currentUsage(): number { return this.props.currentUsage; }
  get dailyLimit(): number { return this.props.dailyLimit; }
  get availableQuota(): number { return this.props.availableQuota; }
  get bonusQuota(): number { return this.props.bonusQuota; }
  get resetAt(): Date { return this.props.resetAt; }
  get lastActivityAt(): Date | undefined { return this.props.lastActivityAt; }
  
  getUsagePercentage(): number {
    return Math.round((this.props.currentUsage / this.props.availableQuota) * 100);
  }
}

// 枚举和类型
export enum BonusType {
  QUESTIONNAIRE = 'questionnaire',
  PAYMENT = 'payment',
  REFERRAL = 'referral',
  PROMOTION = 'promotion'
}

export interface UsageLimitData {
  id: string;
  ip: string;
  policy: any;
  quotaAllocation: any;
  usageTracking: any;
  lastResetAt: string;
}

// 领域事件
export class UsageLimitCreatedEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly dailyLimit: number,
    public readonly occurredAt: Date
  ) {}
}

export class UsageLimitExceededEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly currentUsage: number,
    public readonly availableQuota: number,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}

export class UsageRecordedEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly newUsageCount: number,
    public readonly remainingQuota: number,
    public readonly occurredAt: Date
  ) {}
}

export class BonusQuotaAddedEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly bonusType: BonusType,
    public readonly bonusAmount: number,
    public readonly newTotalQuota: number,
    public readonly occurredAt: Date
  ) {}
}

export class DailyUsageResetEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly previousUsage: number,
    public readonly previousQuota: number,
    public readonly newDailyLimit: number,
    public readonly occurredAt: Date
  ) {}
}