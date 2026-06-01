import { IncentiveApprovedEvent } from './incentive-approved.event';

describe('IncentiveApprovedEvent', () => {
  const createEvent = (
    overrides?: Partial<{
      incentiveId: string;
      recipientIP: string;
      rewardAmount: number;
      reason: string;
      occurredAt: Date;
    }>,
  ) => {
    return new IncentiveApprovedEvent(
      overrides?.incentiveId ?? 'incentive-123',
      overrides?.recipientIP ?? '192.168.1.1',
      overrides?.rewardAmount ?? 5,
      overrides?.reason ?? 'Test reason',
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
        reason: 'Quality submission',
        occurredAt,
      });

      expect(event.incentiveId).toBe('inc-1');
      expect(event.recipientIP).toBe('10.0.0.1');
      expect(event.rewardAmount).toBe(10);
      expect(event.reason).toBe('Quality submission');
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should create event with default values', () => {
      const event = createEvent();

      expect(event.incentiveId).toBe('incentive-123');
      expect(event.recipientIP).toBe('192.168.1.1');
      expect(event.rewardAmount).toBe(5);
      expect(event.reason).toBe('Test reason');
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
