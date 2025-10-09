import { DomainEvent } from './base/domain-event.js';

/**
 * Represents the incentive validated event event.
 */
export class IncentiveValidatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Validated Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param rewardAmount - The reward amount.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly occurredAt: Date
  ) {}
}
