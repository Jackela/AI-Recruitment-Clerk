import { DomainEvent } from './base/domain-event.js';

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
    public readonly occurredAt: Date
  ) {}
}
