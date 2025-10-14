import { DomainEvent } from './base/domain-event.js';

/**
 * Represents the payment failed event event.
 */
export class PaymentFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Payment Failed Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param error - The error.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly error: string,
    public readonly occurredAt: Date,
  ) {}
}
