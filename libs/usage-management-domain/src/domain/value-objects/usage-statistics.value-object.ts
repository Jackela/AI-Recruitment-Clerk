import { ValueObject } from './base/value-object.js';

export class UsageStatistics extends ValueObject<{
  ip: string;
  currentUsage: number;
  dailyLimit: number;
  availableQuota: number;
  bonusQuota: number;
  resetAt: Date;
  lastActivityAt?: Date;
}> {
  get ip(): string { return this.props.ip; }
  get currentUsage(): number { return this.props.currentUsage; }
  get dailyLimit(): number { return this.props.dailyLimit; }
  get availableQuota(): number { return this.props.availableQuota; }
  get bonusQuota(): number { return this.props.bonusQuota; }
  get resetAt(): Date { return this.props.resetAt; }
  get lastActivityAt(): Date | undefined { return this.props.lastActivityAt; }
  
  getUsagePercentage(): number {
    return Math.round((this.props.currentUsage / this.props.availableQuota) * 100);
  }
}
