import { ValueObject } from '../base/value-object';
import type { DomainEvent } from '../base/domain-event';

/**
 * Represents a usage limit ID.
 */
export class UsageLimitId extends ValueObject<{ value: string }> {
  /**
   * Generates a new UsageLimitId.
   * @returns The UsageLimitId.
   */
  public static generate(): UsageLimitId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new UsageLimitId({ value: `usage_${timestamp}_${random}` });
  }

  /**
   * Gets the value.
   * @returns The string value.
   */
  public getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents an IP address.
 */
export class IPAddress extends ValueObject<{ value: string }> {
  /**
   * Initializes a new instance of IPAddress.
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
   * Gets the value.
   * @returns The string value.
   */
  public getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents a usage limit policy.
 */
export class UsageLimitPolicy extends ValueObject<{
  dailyLimit: number;
  bonusEnabled: boolean;
  maxBonusQuota: number;
  resetTimeUTC: number;
}> {
  /**
   * Creates a default UsageLimitPolicy.
   * @returns The UsageLimitPolicy.
   */
  public static createDefault(): UsageLimitPolicy {
    return new UsageLimitPolicy({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 20,
      resetTimeUTC: 0,
    });
  }

  /**
   * Restores a UsageLimitPolicy from data.
   * @param data - The data.
   * @returns The UsageLimitPolicy.
   */
  public static restore(data: unknown): UsageLimitPolicy {
    return new UsageLimitPolicy(data as { [key: string]: unknown });
  }

  /**
   * Gets the daily limit.
   * @returns The number value.
   */
  public get dailyLimit(): number {
    return this.props.dailyLimit;
  }

  /**
   * Gets whether bonus is enabled.
   * @returns The boolean value.
   */
  public get bonusEnabled(): boolean {
    return this.props.bonusEnabled;
  }

  /**
   * Gets the max bonus quota.
   * @returns The number value.
   */
  public get maxBonusQuota(): number {
    return this.props.maxBonusQuota;
  }

  /**
   * Gets the reset time UTC.
   * @returns The number value.
   */
  public get resetTimeUTC(): number {
    return this.props.resetTimeUTC;
  }
}

/**
 * Represents quota allocation.
 */
export class QuotaAllocation extends ValueObject<{
  baseQuota: number;
  bonusQuota: number;
  bonusBreakdown: Map<BonusType, number>;
}> {
  /**
   * Creates a default QuotaAllocation.
   * @param baseQuota - The base quota.
   * @returns The QuotaAllocation.
   */
  public static createDefault(baseQuota: number): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota,
      bonusQuota: 0,
      bonusBreakdown: new Map(),
    });
  }

  /**
   * Restores a QuotaAllocation from data.
   * @param data - The data.
   * @returns The QuotaAllocation.
   */
  public static restore(data: unknown): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota: (data as { baseQuota: number }).baseQuota,
      bonusQuota: (data as { bonusQuota: number }).bonusQuota,
      bonusBreakdown: new Map((data as { bonusBreakdown: Iterable<[BonusType, number]> }).bonusBreakdown || []),
    });
  }

  /**
   * Adds bonus quota.
   * @param bonusType - The bonus type.
   * @param amount - The amount.
   * @returns The QuotaAllocation.
   */
  public addBonus(bonusType: BonusType, amount: number): QuotaAllocation {
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
   * Gets available quota.
   * @returns The number value.
   */
  public getAvailableQuota(): number {
    return this.props.baseQuota + this.props.bonusQuota;
  }

  /**
   * Gets bonus quota.
   * @returns The number value.
   */
  public getBonusQuota(): number {
    return this.props.bonusQuota;
  }

  /**
   * Gets bonus breakdown.
   * @returns The Map<BonusType, number>.
   */
  public getBonusBreakdown(): Map<BonusType, number> {
    return new Map(this.props.bonusBreakdown);
  }
}

/**
 * Represents usage tracking.
 */
export class UsageTracking extends ValueObject<{
  currentCount: number;
  usageHistory: UsageRecord[];
  lastUsageAt?: Date;
}> {
  /**
   * Creates an empty UsageTracking.
   * @returns The UsageTracking.
   */
  public static createEmpty(): UsageTracking {
    return new UsageTracking({
      currentCount: 0,
      usageHistory: [],
      lastUsageAt: undefined,
    });
  }

  /**
   * Restores a UsageTracking from data.
   * @param data - The data.
   * @returns The UsageTracking.
   */
  public static restore(data: unknown): UsageTracking {
    const dataObj = data as {
      currentCount: number;
      usageHistory: unknown[];
      lastUsageAt?: string;
    };
    return new UsageTracking({
      currentCount: dataObj.currentCount,
      usageHistory: dataObj.usageHistory.map((r) => new UsageRecord(r as { timestamp: string; count: number })),
      lastUsageAt: dataObj.lastUsageAt ? new Date(dataObj.lastUsageAt) : undefined,
    });
  }

  /**
   * Increments usage.
   * @returns The UsageTracking.
   */
  public incrementUsage(): UsageTracking {
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
   * Gets current count.
   * @returns The number value.
   */
  public getCurrentCount(): number {
    return this.props.currentCount;
  }

  /**
   * Gets last usage at.
   * @returns The Date | undefined.
   */
  public getLastUsageAt(): Date | undefined {
    return this.props.lastUsageAt;
  }

  /**
   * Gets usage history.
   * @returns An array of UsageRecord.
   */
  public getUsageHistory(): UsageRecord[] {
    return [...this.props.usageHistory];
  }
}

/**
 * Represents a usage record.
 */
export class UsageRecord extends ValueObject<{
  timestamp: Date;
  count: number;
}> {
  /**
   * Gets the timestamp.
   * @returns The Date.
   */
  public get timestamp(): Date {
    return this.props.timestamp;
  }

  /**
   * Gets the count.
   * @returns The number value.
   */
  public get count(): number {
    return this.props.count;
  }
}

/**
 * Bonus type enum.
 */
export enum BonusType {
  QUESTIONNAIRE = 'questionnaire',
  PAYMENT = 'payment',
  REFERRAL = 'referral',
  PROMOTION = 'promotion',
}

/**
 * Defines the shape of usage limit data.
 */
export interface UsageLimitData {
  id: string;
  ip: string;
  policy: unknown;
  quotaAllocation: unknown;
  usageTracking: unknown;
  lastResetAt: string;
}
