import { BonusQuotaAddedEvent } from './bonus-quota-added.event';
import { BonusType } from '../../application/dtos/usage-limit.dto';

describe('BonusQuotaAddedEvent', () => {
  const mockOccuredAt = new Date('2024-01-15T10:30:00Z');

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new BonusQuotaAddedEvent(
        'usage_123',
        '192.168.1.1',
        BonusType.QUESTIONNAIRE,
        5,
        10,
        mockOccuredAt,
      );

      expect(event.usageLimitId).toBe('usage_123');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.bonusType).toBe(BonusType.QUESTIONNAIRE);
      expect(event.bonusAmount).toBe(5);
      expect(event.newTotalQuota).toBe(10);
      expect(event.occurredAt).toEqual(mockOccuredAt);
    });

    it('should handle different bonus types', () => {
      const paymentEvent = new BonusQuotaAddedEvent(
        'usage_456',
        '10.0.0.1',
        BonusType.PAYMENT,
        10,
        15,
        mockOccuredAt,
      );

      expect(paymentEvent.bonusType).toBe(BonusType.PAYMENT);
      expect(paymentEvent.bonusAmount).toBe(10);
    });

    it('should handle referral bonus', () => {
      const event = new BonusQuotaAddedEvent(
        'usage_789',
        '172.16.0.1',
        BonusType.REFERRAL,
        3,
        8,
        mockOccuredAt,
      );

      expect(event.bonusType).toBe(BonusType.REFERRAL);
      expect(event.bonusAmount).toBe(3);
    });

    it('should handle promotion bonus', () => {
      const event = new BonusQuotaAddedEvent(
        'usage_abc',
        '192.168.0.1',
        BonusType.PROMOTION,
        2,
        7,
        mockOccuredAt,
      );

      expect(event.bonusType).toBe(BonusType.PROMOTION);
      expect(event.bonusAmount).toBe(2);
    });
  });
});
