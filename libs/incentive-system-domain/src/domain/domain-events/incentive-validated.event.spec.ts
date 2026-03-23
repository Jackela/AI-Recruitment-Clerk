import { IncentiveValidatedEvent } from './incentive-validated.event';

describe('IncentiveValidatedEvent', () => {
  const createEvent = (
    overrides?: Partial<{
      incentiveId: string;
      recipientIP: string;
      rewardAmount: number;
      occurredAt: Date;
    }>,
  ) => {
    return new IncentiveValidatedEvent(
      overrides?.incentiveId ?? 'incentive-123',
      overrides?.recipientIP ?? '192.168.1.1',
      overrides?.rewardAmount ?? 5,
      overrides?.occurredAt ?? new Date('2024-01-01'),
    );
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const occurredAt = new Date();
      const event = createEvent({
        incentiveId: 'inc-1',
        recipientIP: '10.0.0.1',
        rewardAmount: 10,
        occurredAt,
      });

      expect(event.incentiveId).toBe('inc-1');
      expect(event.recipientIP).toBe('10.0.0.1');
      expect(event.rewardAmount).toBe(10);
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should create event with default values', () => {
      const event = createEvent();

      expect(event.incentiveId).toBe('incentive-123');
      expect(event.recipientIP).toBe('192.168.1.1');
      expect(event.rewardAmount).toBe(5);
    });
  });

  describe('occurredAt', () => {
    it('should track when event occurred', () => {
      const now = new Date();
      const event = createEvent({ occurredAt: now });
      expect(event.occurredAt).toBe(now);
    });
  });
});
