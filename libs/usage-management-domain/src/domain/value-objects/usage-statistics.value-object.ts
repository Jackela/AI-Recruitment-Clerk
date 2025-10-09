import { ValueObject } from './base/value-object.js';

/**
 * Represents the usage statistics.
 */
export class UsageStatistics extends ValueObject<{
  ip: string;
  currentUsage: number;
  dailyLimit: number;
  availableQuota: number;
  bonusQuota: number;
  resetAt: Date;
  lastActivityAt?: Date;
}> {
  /**
   * Performs the ip operation.
   * @returns The string value.
   */
  get ip(): string { return this.props.ip; }
  /**
   * Performs the current usage operation.
   * @returns The number value.
   */
  get currentUsage(): number { return this.props.currentUsage; }
  /**
   * Performs the daily limit operation.
   * @returns The number value.
   */
  get dailyLimit(): number { return this.props.dailyLimit; }
  /**
   * Performs the available quota operation.
   * @returns The number value.
   */
  get availableQuota(): number { return this.props.availableQuota; }
  /**
   * Performs the bonus quota operation.
   * @returns The number value.
   */
  get bonusQuota(): number { return this.props.bonusQuota; }
  /**
   * Performs the reset at operation.
   * @returns The Date.
   */
  get resetAt(): Date { return this.props.resetAt; }
  /**
   * Performs the last activity at operation.
   * @returns The Date | undefined.
   */
  get lastActivityAt(): Date | undefined { return this.props.lastActivityAt; }
  
  /**
   * Retrieves usage percentage.
   * @returns The number value.
   */
  getUsagePercentage(): number {
    return Math.round((this.props.currentUsage / this.props.availableQuota) * 100);
  }
}
