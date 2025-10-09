import { DomainEvent } from './base/domain-event.js';
import { Currency, TriggerType } from '../aggregates/incentive.aggregate.js';

/**
 * Represents the incentive created event event.
 */
export class IncentiveCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Created Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param rewardAmount - The reward amount.
   * @param currency - The currency.
   * @param triggerType - The trigger type.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly currency: Currency,
    public readonly triggerType: TriggerType,
    public readonly occurredAt: Date
  ) {}
}
