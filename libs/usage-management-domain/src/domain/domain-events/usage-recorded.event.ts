import { DomainEvent } from './base/domain-event.js';

export class UsageRecordedEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly newUsageCount: number,
    public readonly remainingQuota: number,
    public readonly occurredAt: Date
  ) {}
}
