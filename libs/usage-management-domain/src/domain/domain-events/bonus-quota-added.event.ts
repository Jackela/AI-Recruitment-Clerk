import { DomainEvent } from './base/domain-event.js';
import { BonusType } from '../../application/dtos/usage-limit.dto.js';

/**
 * Represents the bonus quota added event event.
 */
export class BonusQuotaAddedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Bonus Quota Added Event.
   * @param usageLimitId - The usage limit id.
   * @param ip - The ip.
   * @param bonusType - The bonus type.
   * @param bonusAmount - The bonus amount.
   * @param newTotalQuota - The new total quota.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly usageLimitId: string,
    public readonly ip: string,
    public readonly bonusType: BonusType,
    public readonly bonusAmount: number,
    public readonly newTotalQuota: number,
    public readonly occurredAt: Date
  ) {}
}
