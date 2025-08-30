import { ValueObject } from '../base/value-object.js';
import { Currency, TriggerType, IncentiveStatus } from '../aggregates/incentive.aggregate.js';

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
  get id(): string { return this.props.id; }
  get recipientIP(): string { return this.props.recipientIP; }
  get rewardAmount(): number { return this.props.rewardAmount; }
  get status(): IncentiveStatus { return this.props.status; }
  get canBePaid(): boolean { return this.props.canBePaid; }
  get daysSinceCreation(): number { return this.props.daysSinceCreation; }
}
