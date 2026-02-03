import type { DomainEvent } from './base/domain-event.js';

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
