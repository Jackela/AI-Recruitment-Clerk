import { DomainEvent } from './base/domain-event.js';
import { Currency, PaymentMethod } from '../aggregates/incentive.aggregate.js';

/**
 * Represents the incentive paid event event.
 */
export class IncentivePaidEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Paid Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param amount - The amount.
   * @param currency - The currency.
   * @param paymentMethod - The payment method.
   * @param transactionId - The transaction id.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly amount: number,
    public readonly currency: Currency,
    public readonly paymentMethod: PaymentMethod,
    public readonly transactionId: string,
    public readonly occurredAt: Date,
  ) {}
}
