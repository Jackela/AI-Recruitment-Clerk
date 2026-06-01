import { PaymentResult } from './payment-result.value-object';
import { Currency } from '../aggregates/incentive.aggregate';

describe('PaymentResult', () => {
  describe('success', () => {
    it('should create successful payment result', () => {
      const result = PaymentResult.success('txn-123', 10.5, Currency.CNY);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-123');
      expect(result.amount).toBe(10.5);
      expect(result.currency).toBe(Currency.CNY);
      expect(result.error).toBeUndefined();
    });
  });

  describe('failed', () => {
    it('should create failed payment result', () => {
      const result = PaymentResult.failed('Insufficient funds');

      expect(result.success).toBe(false);
      expect(result.transactionId).toBeUndefined();
      expect(result.amount).toBeUndefined();
      expect(result.currency).toBeUndefined();
      expect(result.error).toBe('Insufficient funds');
    });
  });
});
