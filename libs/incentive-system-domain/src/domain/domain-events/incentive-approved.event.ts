import { DomainEvent } from './base/domain-event.js';

export class IncentiveApprovedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}
