import { DomainEvent } from './base/domain-event.js';

export class IncentiveValidatedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly occurredAt: Date
  ) {}
}
