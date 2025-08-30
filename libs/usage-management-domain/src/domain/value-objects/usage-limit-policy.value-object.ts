import { ValueObject } from './base/value-object.js';

export class UsageLimitPolicy extends ValueObject<{
  dailyLimit: number;
  bonusEnabled: boolean;
  maxBonusQuota: number;
  resetTimeUTC: number; // Hour of day (0-23)
}> {
  static createDefault(): UsageLimitPolicy {
    return new UsageLimitPolicy({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 20,
      resetTimeUTC: 0 // Midnight UTC
    });
  }

  static restore(data: any): UsageLimitPolicy {
    return new UsageLimitPolicy(data);
  }

  get dailyLimit(): number { return this.props.dailyLimit; }
  get bonusEnabled(): boolean { return this.props.bonusEnabled; }
  get maxBonusQuota(): number { return this.props.maxBonusQuota; }
  get resetTimeUTC(): number { return this.props.resetTimeUTC; }
}
