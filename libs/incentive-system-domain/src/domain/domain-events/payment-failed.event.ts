import { DomainEvent } from './base/domain-event.js';

export class PaymentFailedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly error: string,
    public readonly occurredAt: Date
  ) {}
}
