import { UsageRecordedEvent } from './usage-recorded.event';

describe('UsageRecordedEvent', () => {
  const mockOccuredAt = new Date('2024-01-15T10:30:00Z');

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new UsageRecordedEvent(
        'usage_123',
        '192.168.1.1',
        3,
        7,
        mockOccuredAt,
      );

      expect(event.usageLimitId).toBe('usage_123');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.newUsageCount).toBe(3);
      expect(event.remainingQuota).toBe(7);
      expect(event.occurredAt).toEqual(mockOccuredAt);
    });

    it('should handle first usage (count = 1)', () => {
      const event = new UsageRecordedEvent(
        'usage_123',
        '192.168.1.1',
        1,
        4,
        mockOccuredAt,
      );

      expect(event.newUsageCount).toBe(1);
      expect(event.remainingQuota).toBe(4);
    });

    it('should handle zero remaining quota', () => {
      const event = new UsageRecordedEvent(
        'usage_123',
        '192.168.1.1',
        5,
        0,
        mockOccuredAt,
      );

      expect(event.newUsageCount).toBe(5);
      expect(event.remainingQuota).toBe(0);
    });
  });
});
