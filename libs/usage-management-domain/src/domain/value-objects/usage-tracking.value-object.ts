import { ValueObject } from './base/value-object.js';
import { UsageRecord } from './usage-record.value-object.js';

/**
 * Represents the usage tracking.
 */
export class UsageTracking extends ValueObject<{
  currentCount: number;
  usageHistory: UsageRecord[];
  lastUsageAt?: Date;
}> {
  /**
   * Creates empty.
   * @returns The UsageTracking.
   */
  public static createEmpty(): UsageTracking {
    return new UsageTracking({
      currentCount: 0,
      usageHistory: [],
      lastUsageAt: undefined,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UsageTracking.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): UsageTracking {
    return new UsageTracking({
      currentCount: data.currentCount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usageHistory: data.usageHistory.map((r: any) => new UsageRecord(r)),
      lastUsageAt: data.lastUsageAt ? new Date(data.lastUsageAt) : undefined,
    });
  }

  /**
   * Performs the increment usage operation.
   * @returns The UsageTracking.
   */
  public incrementUsage(): UsageTracking {
    const record = new UsageRecord({
      timestamp: new Date(),
      count: this.props.currentCount + 1,
    });

    return new UsageTracking({
      currentCount: this.props.currentCount + 1,
      usageHistory: [...this.props.usageHistory, record],
      lastUsageAt: new Date(),
    });
  }

  /**
   * Retrieves current count.
   * @returns The number value.
   */
  public getCurrentCount(): number {
    return this.props.currentCount;
  }

  /**
   * Retrieves last usage at.
   * @returns The Date | undefined.
   */
  public getLastUsageAt(): Date | undefined {
    return this.props.lastUsageAt;
  }

  /**
   * Retrieves usage history.
   * @returns The an array of UsageRecord.
   */
  public getUsageHistory(): UsageRecord[] {
    return [...this.props.usageHistory];
  }
}
