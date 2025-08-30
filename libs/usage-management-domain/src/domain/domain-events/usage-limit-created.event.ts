import { DomainEvent } from './base/domain-event.js';

export class UsageLimitCreatedEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly dailyLimit: number,
    public readonly occurredAt: Date
  ) {}
}
