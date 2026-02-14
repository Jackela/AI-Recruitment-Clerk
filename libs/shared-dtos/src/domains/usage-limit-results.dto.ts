/**
 * Represents a usage limit check result.
 */
export class UsageLimitCheckResult {
  private constructor(
    private readonly allowed: boolean,
    private readonly remainingQuota?: number,
    private readonly blockReason?: string,
  ) {}

  /**
   * Creates an allowed result.
   * @param remainingQuota - The remaining quota.
   * @returns The UsageLimitCheckResult.
   */
  public static allowed(remainingQuota: number): UsageLimitCheckResult {
    return new UsageLimitCheckResult(true, remainingQuota);
  }

  /**
   * Creates a blocked result.
   * @param reason - The reason.
   * @returns The UsageLimitCheckResult.
   */
  public static blocked(reason: string): UsageLimitCheckResult {
    return new UsageLimitCheckResult(false, undefined, reason);
  }

  /**
   * Checks if usage is allowed.
   * @returns The boolean value.
   */
  public isAllowed(): boolean {
    return this.allowed;
  }

  /**
   * Gets remaining quota.
   * @returns The number | undefined.
   */
  public getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  /**
   * Gets block reason.
   * @returns The string | undefined.
   */
  public getBlockReason(): string | undefined {
    return this.blockReason;
  }
}

/**
 * Represents a usage record result.
 */
export class UsageRecordResult {
  private constructor(
    private readonly success: boolean,
    private readonly currentUsage?: number,
    private readonly remainingQuota?: number,
    private readonly error?: string,
  ) {}

  /**
   * Creates a success result.
   * @param currentUsage - The current usage.
   * @param remainingQuota - The remaining quota.
   * @returns The UsageRecordResult.
   */
  public static success(
    currentUsage: number,
    remainingQuota: number,
  ): UsageRecordResult {
    return new UsageRecordResult(true, currentUsage, remainingQuota);
  }

  /**
   * Creates a failed result.
   * @param error - The error.
   * @returns The UsageRecordResult.
   */
  public static failed(error: string): UsageRecordResult {
    return new UsageRecordResult(false, undefined, undefined, error);
  }

  /**
   * Checks if successful.
   * @returns The boolean value.
   */
  public isSuccess(): boolean {
    return this.success;
  }

  /**
   * Gets current usage.
   * @returns The number | undefined.
   */
  public getCurrentUsage(): number | undefined {
    return this.currentUsage;
  }

  /**
   * Gets remaining quota.
   * @returns The number | undefined.
   */
  public getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  /**
   * Gets error.
   * @returns The string | undefined.
   */
  public getError(): string | undefined {
    return this.error;
  }
}

// ValueObject base import for UsageStatistics
import { ValueObject } from '../base/value-object';

/**
 * Represents usage statistics.
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
   * Gets the IP address.
   * @returns The string value.
   */
  public get ip(): string {
    return this.props.ip;
  }

  /**
   * Gets current usage.
   * @returns The number value.
   */
  public get currentUsage(): number {
    return this.props.currentUsage;
  }

  /**
   * Gets daily limit.
   * @returns The number value.
   */
  public get dailyLimit(): number {
    return this.props.dailyLimit;
  }

  /**
   * Gets available quota.
   * @returns The number value.
   */
  public get availableQuota(): number {
    return this.props.availableQuota;
  }

  /**
   * Gets bonus quota.
   * @returns The number value.
   */
  public get bonusQuota(): number {
    return this.props.bonusQuota;
  }

  /**
   * Gets reset at time.
   * @returns The Date value.
   */
  public get resetAt(): Date {
    return this.props.resetAt;
  }

  /**
   * Gets last activity at.
   * @returns The Date | undefined.
   */
  public get lastActivityAt(): Date | undefined {
    return this.props.lastActivityAt;
  }

  /**
   * Gets usage percentage.
   * @returns The number value.
   */
  public getUsagePercentage(): number {
    return Math.round(
      (this.props.currentUsage / this.props.availableQuota) * 100,
    );
  }
}
