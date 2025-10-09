import { DomainEvent } from './base/domain-event.js';

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
    public readonly occurredAt: Date
  ) {}
}
