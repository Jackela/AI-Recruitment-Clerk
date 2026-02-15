import type { DomainEvent } from '../base/domain-event';

/**
 * Represents a usage limit created domain event.
 */
export class UsageLimitCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of Usage Limit Created Event.
   * @param usageLimitId - The usage limit ID.
   * @param ip - The IP address.
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
 * Represents a usage limit exceeded domain event.
 */
export class UsageLimitExceededEvent implements DomainEvent {
  /**
   * Initializes a new instance of Usage Limit Exceeded Event.
   * @param usageLimitId - The usage limit ID.
   * @param ip - The IP address.
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
 * Represents a usage recorded domain event.
 */
export class UsageRecordedEvent implements DomainEvent {
  /**
   * Initializes a new instance of Usage Recorded Event.
   * @param usageLimitId - The usage limit ID.
   * @param ip - The IP address.
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
 * Represents a bonus quota added domain event.
 */
export class BonusQuotaAddedEvent implements DomainEvent {
  /**
   * Initializes a new instance of Bonus Quota Added Event.
   * @param usageLimitId - The usage limit ID.
   * @param ip - The IP address.
   * @param bonusType - The bonus type.
   * @param bonusAmount - The bonus amount.
   * @param newTotalQuota - The new total quota.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly bonusType: string,
    public readonly bonusAmount: number,
    public readonly newTotalQuota: number,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents a daily usage reset domain event.
 */
export class DailyUsageResetEvent implements DomainEvent {
  /**
   * Initializes a new instance of Daily Usage Reset Event.
   * @param usageLimitId - The usage limit ID.
   * @param ip - The IP address.
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
