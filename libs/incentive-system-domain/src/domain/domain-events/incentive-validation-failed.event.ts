import { DomainEvent } from './base/domain-event.js';

export class IncentiveValidationFailedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly errors: string[],
    public readonly occurredAt: Date
  ) {}
}
