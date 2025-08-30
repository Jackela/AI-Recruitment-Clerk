import { DomainEvent } from './base/domain-event.js';

export class DailyUsageResetEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly previousUsage: number,
    public readonly previousQuota: number,
    public readonly newDailyLimit: number,
    public readonly occurredAt: Date
  ) {}
}
