import type { DomainEvent } from './base/domain-event.js';

/**
 * Represents the incentive validation failed event event.
 */
export class IncentiveValidationFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Validation Failed Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param errors - The errors.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly errors: string[],
    public readonly occurredAt: Date,
  ) {}
}
