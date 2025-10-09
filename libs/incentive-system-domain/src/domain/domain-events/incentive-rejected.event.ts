import { DomainEvent } from './base/domain-event.js';

/**
 * Represents the incentive rejected event event.
 */
export class IncentiveRejectedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Rejected Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param reason - The reason.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}
