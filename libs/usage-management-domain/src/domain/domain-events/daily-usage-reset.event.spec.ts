import { DailyUsageResetEvent } from './daily-usage-reset.event';

describe('DailyUsageResetEvent', () => {
  const mockOccuredAt = new Date('2024-01-15T00:00:00Z');

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new DailyUsageResetEvent(
        'usage_123',
        '192.168.1.1',
        5,
        5,
        5,
        mockOccuredAt,
      );

      expect(event.usageLimitId).toBe('usage_123');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.previousUsage).toBe(5);
      expect(event.previousQuota).toBe(5);
      expect(event.newDailyLimit).toBe(5);
      expect(event.occurredAt).toEqual(mockOccuredAt);
    });

    it('should handle partial usage scenario', () => {
      const event = new DailyUsageResetEvent(
        'usage_456',
        '10.0.0.1',
        3,
        10,
        5,
        mockOccuredAt,
      );

      expect(event.previousUsage).toBe(3);
      expect(event.previousQuota).toBe(10);
      expect(event.newDailyLimit).toBe(5);
    });

    it('should handle zero usage scenario', () => {
      const event = new DailyUsageResetEvent(
        'usage_789',
        '172.16.0.1',
        0,
        5,
        5,
        mockOccuredAt,
      );

      expect(event.previousUsage).toBe(0);
      expect(event.previousQuota).toBe(5);
      expect(event.newDailyLimit).toBe(5);
    });
  });
});
