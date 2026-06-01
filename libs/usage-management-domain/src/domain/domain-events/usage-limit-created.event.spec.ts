import { UsageLimitCreatedEvent } from './usage-limit-created.event';

describe('UsageLimitCreatedEvent', () => {
  const mockOccuredAt = new Date('2024-01-15T10:30:00Z');

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new UsageLimitCreatedEvent(
        'usage_123',
        '192.168.1.1',
        5,
        mockOccuredAt,
      );

      expect(event.usageLimitId).toBe('usage_123');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.dailyLimit).toBe(5);
      expect(event.occurredAt).toEqual(mockOccuredAt);
    });

    it('should store occurredAt as Date instance', () => {
      const event = new UsageLimitCreatedEvent(
        'usage_456',
        '10.0.0.1',
        10,
        mockOccuredAt,
      );

      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });
});
