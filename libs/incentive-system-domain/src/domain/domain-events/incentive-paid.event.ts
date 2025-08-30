import { DomainEvent } from './base/domain-event.js';
import { Currency, PaymentMethod } from '../aggregates/incentive.aggregate.js';

export class IncentivePaidEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly amount: number,
    public readonly currency: Currency,
    public readonly paymentMethod: PaymentMethod,
    public readonly transactionId: string,
    public readonly occurredAt: Date
  ) {}
}
