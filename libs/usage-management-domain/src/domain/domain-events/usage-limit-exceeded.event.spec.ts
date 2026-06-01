import { UsageLimitExceededEvent } from './usage-limit-exceeded.event';

describe('UsageLimitExceededEvent', () => {
  const mockOccuredAt = new Date('2024-01-15T10:30:00Z');

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new UsageLimitExceededEvent(
        'usage_123',
        '192.168.1.1',
        5,
        5,
        'Daily limit reached',
        mockOccuredAt,
      );

      expect(event.usageLimitId).toBe('usage_123');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.currentUsage).toBe(5);
      expect(event.availableQuota).toBe(5);
      expect(event.reason).toBe('Daily limit reached');
      expect(event.occurredAt).toEqual(mockOccuredAt);
    });

    it('should handle quota exceeded scenario', () => {
      const event = new UsageLimitExceededEvent(
        'usage_456',
        '10.0.0.1',
        10,
        5,
        'Usage limit exceeded',
        mockOccuredAt,
      );

      expect(event.currentUsage).toBe(10);
      expect(event.availableQuota).toBe(5);
    });
  });
});
