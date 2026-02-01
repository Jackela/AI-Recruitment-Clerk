import type { DomainEvent } from './base/domain-event.js';

/**
 * Represents the incentive approved event event.
 */
export class IncentiveApprovedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Approved Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param rewardAmount - The reward amount.
   * @param reason - The reason.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly reason: string,
    public readonly occurredAt: Date,
  ) {}
}
