import { DomainEvent } from './base/domain-event.js';

export class IncentiveRejectedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}
