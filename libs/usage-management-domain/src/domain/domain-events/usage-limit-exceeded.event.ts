import { DomainEvent } from './base/domain-event.js';

export class UsageLimitExceededEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly currentUsage: number,
    public readonly availableQuota: number,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}
