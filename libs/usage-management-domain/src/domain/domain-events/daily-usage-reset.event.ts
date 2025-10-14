import { DomainEvent } from './base/domain-event.js';

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
