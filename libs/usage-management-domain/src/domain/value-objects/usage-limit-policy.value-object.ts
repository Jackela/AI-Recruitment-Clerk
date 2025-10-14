import { ValueObject } from './base/value-object.js';

/**
 * Represents the usage limit policy.
 */
export class UsageLimitPolicy extends ValueObject<{
  dailyLimit: number;
  bonusEnabled: boolean;
  maxBonusQuota: number;
  resetTimeUTC: number; // Hour of day (0-23)
}> {
  /**
   * Creates default.
   * @returns The UsageLimitPolicy.
   */
  static createDefault(): UsageLimitPolicy {
    return new UsageLimitPolicy({
      dailyLimit: 5,
      bonusEnabled: true,
      maxBonusQuota: 20,
      resetTimeUTC: 0, // Midnight UTC
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UsageLimitPolicy.
   */
  static restore(data: any): UsageLimitPolicy {
    return new UsageLimitPolicy(data);
  }

  /**
   * Performs the daily limit operation.
   * @returns The number value.
   */
  get dailyLimit(): number {
    return this.props.dailyLimit;
  }
  /**
   * Performs the bonus enabled operation.
   * @returns The boolean value.
   */
  get bonusEnabled(): boolean {
    return this.props.bonusEnabled;
  }
  /**
   * Performs the max bonus quota operation.
   * @returns The number value.
   */
  get maxBonusQuota(): number {
    return this.props.maxBonusQuota;
  }
  /**
   * Performs the reset time utc operation.
   * @returns The number value.
   */
  get resetTimeUTC(): number {
    return this.props.resetTimeUTC;
  }
}
