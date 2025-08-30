import { ValueObject } from './base/value-object.js';
import { UsageRecord } from './usage-record.value-object.js';

export class UsageTracking extends ValueObject<{
  currentCount: number;
  usageHistory: UsageRecord[];
  lastUsageAt?: Date;
}> {
  static createEmpty(): UsageTracking {
    return new UsageTracking({
      currentCount: 0,
      usageHistory: [],
      lastUsageAt: undefined
    });
  }

  static restore(data: any): UsageTracking {
    return new UsageTracking({
      currentCount: data.currentCount,
      usageHistory: data.usageHistory.map((r: any) => new UsageRecord(r)),
      lastUsageAt: data.lastUsageAt ? new Date(data.lastUsageAt) : undefined
    });
  }

  incrementUsage(): UsageTracking {
    const record = new UsageRecord({
      timestamp: new Date(),
      count: this.props.currentCount + 1
    });

    return new UsageTracking({
      currentCount: this.props.currentCount + 1,
      usageHistory: [...this.props.usageHistory, record],
      lastUsageAt: new Date()
    });
  }

  getCurrentCount(): number {
    return this.props.currentCount;
  }

  getLastUsageAt(): Date | undefined {
    return this.props.lastUsageAt;
  }

  getUsageHistory(): UsageRecord[] {
    return [...this.props.usageHistory];
  }
}
