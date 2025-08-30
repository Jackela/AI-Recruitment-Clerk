import { DomainEvent } from './base/domain-event.js';
import { Currency, TriggerType } from '../aggregates/incentive.aggregate.js';

export class IncentiveCreatedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly currency: Currency,
    public readonly triggerType: TriggerType,
    public readonly occurredAt: Date
  ) {}
}
