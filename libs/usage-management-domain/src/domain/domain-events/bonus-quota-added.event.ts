import { DomainEvent } from './base/domain-event.js';
import { BonusType } from '../../application/dtos/usage-limit.dto.js';

export class BonusQuotaAddedEvent implements DomainEvent {
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly bonusType: BonusType,
    public readonly bonusAmount: number,
    public readonly newTotalQuota: number,
    public readonly occurredAt: Date
  ) {}
}
