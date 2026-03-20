import { UsageTracking } from './usage-tracking.value-object';
import { UsageRecord } from './usage-record.value-object';

describe('UsageTracking', () => {
  describe('createEmpty', () => {
    it('should create empty usage tracking', () => {
      const tracking = UsageTracking.createEmpty();
      expect(tracking.getCurrentCount()).toBe(0);
      expect(tracking.getUsageHistory()).toEqual([]);
      expect(tracking.getLastUsageAt()).toBeUndefined();
    });
  });

  describe('restore', () => {
    it('should restore usage tracking from serialized data', () => {
      const data = {
        currentCount: 3,
        usageHistory: [
          { timestamp: '2024-01-15T10:00:00Z', count: 1 },
          { timestamp: '2024-01-15T11:00:00Z', count: 2 },
        ],
        lastUsageAt: '2024-01-15T11:00:00Z',
      };

      const tracking = UsageTracking.restore(data);
      expect(tracking.getCurrentCount()).toBe(3);
      expect(tracking.getUsageHistory()).toHaveLength(2);
      expect(tracking.getLastUsageAt()).toBeInstanceOf(Date);
    });

    it('should handle Date objects in restore', () => {
      const data = {
        currentCount: 2,
        usageHistory: [
          { timestamp: new Date('2024-01-15T10:00:00Z'), count: 1 },
        ],
        lastUsageAt: new Date('2024-01-15T10:00:00Z'),
      };

      const tracking = UsageTracking.restore(data);
      expect(tracking.getCurrentCount()).toBe(2);
    });
  });

  describe('incrementUsage', () => {
    it('should increment current count', () => {
      const tracking = UsageTracking.createEmpty();
      const incremented = tracking.incrementUsage();

      expect(incremented.getCurrentCount()).toBe(1);
      expect(incremented.getUsageHistory()).toHaveLength(1);
      expect(incremented.getLastUsageAt()).toBeInstanceOf(Date);
    });

    it('should preserve previous usage history', () => {
      const tracking = UsageTracking.createEmpty().incrementUsage();
      const incremented = tracking.incrementUsage();

      expect(incremented.getUsageHistory()).toHaveLength(2);
    });
  });

  describe('getCurrentCount', () => {
    it('should return current count', () => {
      const tracking = UsageTracking.createEmpty();
      expect(tracking.getCurrentCount()).toBe(0);

      const incremented = tracking.incrementUsage();
      expect(incremented.getCurrentCount()).toBe(1);
    });
  });

  describe('getLastUsageAt', () => {
    it('should return undefined for empty tracking', () => {
      const tracking = UsageTracking.createEmpty();
      expect(tracking.getLastUsageAt()).toBeUndefined();
    });

    it('should return Date after increment', () => {
      const tracking = UsageTracking.createEmpty().incrementUsage();
      expect(tracking.getLastUsageAt()).toBeInstanceOf(Date);
    });
  });

  describe('getUsageHistory', () => {
    it('should return a copy of usage history', () => {
      const tracking = UsageTracking.createEmpty().incrementUsage();
      const history1 = tracking.getUsageHistory();
      const history2 = tracking.getUsageHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2);
    });

    it('should return empty array for empty tracking', () => {
      const tracking = UsageTracking.createEmpty();
      expect(tracking.getUsageHistory()).toEqual([]);
    });
  });
});
