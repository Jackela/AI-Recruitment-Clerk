import { ValueObject } from '../base/value-object.js';
import { Currency, TriggerType, IncentiveStatus } from '../aggregates/incentive.aggregate.js';

/**
 * Represents the incentive summary.
 */
export class IncentiveSummary extends ValueObject<{
  id: string;
  recipientIP: string;
  rewardAmount: number;
  rewardCurrency: Currency;
  triggerType: TriggerType;
  status: IncentiveStatus;
  createdAt: Date;
  processedAt?: Date;
  paidAt?: Date;
  canBePaid: boolean;
  daysSinceCreation: number;
}> {
  /**
   * Performs the id operation.
   * @returns The string value.
   */
  get id(): string { return this.props.id; }
  /**
   * Performs the recipient ip operation.
   * @returns The string value.
   */
  get recipientIP(): string { return this.props.recipientIP; }
  /**
   * Performs the reward amount operation.
   * @returns The number value.
   */
  get rewardAmount(): number { return this.props.rewardAmount; }
  /**
   * Performs the status operation.
   * @returns The IncentiveStatus.
   */
  get status(): IncentiveStatus { return this.props.status; }
  /**
   * Performs the can be paid operation.
   * @returns The boolean value.
   */
  get canBePaid(): boolean { return this.props.canBePaid; }
  /**
   * Performs the days since creation operation.
   * @returns The number value.
   */
  get daysSinceCreation(): number { return this.props.daysSinceCreation; }
}
