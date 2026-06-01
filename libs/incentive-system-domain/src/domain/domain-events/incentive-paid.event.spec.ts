import { IncentivePaidEvent } from './incentive-paid.event';
import { Currency, PaymentMethod } from '../aggregates/incentive.aggregate';

describe('IncentivePaidEvent', () => {
  const createEvent = (
    overrides?: Partial<{
      incentiveId: string;
      recipientIP: string;
      amount: number;
      currency: Currency;
      paymentMethod: PaymentMethod;
      transactionId: string;
      occurredAt: Date;
    }>,
  ) => {
    return new IncentivePaidEvent(
      overrides?.incentiveId ?? 'incentive-123',
      overrides?.recipientIP ?? '192.168.1.1',
      overrides?.amount ?? 5,
      overrides?.currency ?? Currency.CNY,
      overrides?.paymentMethod ?? PaymentMethod.WECHAT_PAY,
      overrides?.transactionId ?? 'txn-456',
      overrides?.occurredAt ?? new Date('2024-01-01'),
    );
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const occurredAt = new Date();
      const event = createEvent({
        incentiveId: 'inc-1',
        recipientIP: '10.0.0.1',
        amount: 10,
        currency: Currency.USD,
        paymentMethod: PaymentMethod.ALIPAY,
        transactionId: 'txn-789',
        occurredAt,
      });

      expect(event.incentiveId).toBe('inc-1');
      expect(event.recipientIP).toBe('10.0.0.1');
      expect(event.amount).toBe(10);
      expect(event.currency).toBe(Currency.USD);
      expect(event.paymentMethod).toBe(PaymentMethod.ALIPAY);
      expect(event.transactionId).toBe('txn-789');
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should create event with default values', () => {
      const event = createEvent();

      expect(event.incentiveId).toBe('incentive-123');
      expect(event.recipientIP).toBe('192.168.1.1');
      expect(event.amount).toBe(5);
      expect(event.currency).toBe(Currency.CNY);
      expect(event.paymentMethod).toBe(PaymentMethod.WECHAT_PAY);
      expect(event.transactionId).toBe('txn-456');
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
