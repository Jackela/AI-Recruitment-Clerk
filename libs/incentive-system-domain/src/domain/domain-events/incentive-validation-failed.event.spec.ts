import { IncentiveValidationFailedEvent } from './incentive-validation-failed.event';

describe('IncentiveValidationFailedEvent', () => {
  const createEvent = (
    overrides?: Partial<{
      incentiveId: string;
      recipientIP: string;
      errors: string[];
      occurredAt: Date;
    }>,
  ) => {
    return new IncentiveValidationFailedEvent(
      overrides?.incentiveId ?? 'incentive-123',
      overrides?.recipientIP ?? '192.168.1.1',
      overrides?.errors ?? ['Error 1', 'Error 2'],
      overrides?.occurredAt ?? new Date('2024-01-01'),
    );
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const occurredAt = new Date();
      const errors = ['Invalid IP', 'Missing field'];
      const event = createEvent({
        incentiveId: 'inc-1',
        recipientIP: '10.0.0.1',
        errors,
        occurredAt,
      });

      expect(event.incentiveId).toBe('inc-1');
      expect(event.recipientIP).toBe('10.0.0.1');
      expect(event.errors).toEqual(['Invalid IP', 'Missing field']);
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should create event with empty errors', () => {
      const event = createEvent({ errors: [] });
      expect(event.errors).toEqual([]);
    });

    it('should create event with default values', () => {
      const event = createEvent();

      expect(event.incentiveId).toBe('incentive-123');
      expect(event.recipientIP).toBe('192.168.1.1');
      expect(event.errors).toEqual(['Error 1', 'Error 2']);
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
