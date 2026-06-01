import { UsageLimitCheckResult } from './usage-limit-check-result.value-object';

describe('UsageLimitCheckResult', () => {
  describe('allowed', () => {
    it('should create an allowed result with remaining quota', () => {
      const result = UsageLimitCheckResult.allowed(10);

      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(10);
      expect(result.getBlockReason()).toBeUndefined();
    });

    it('should handle zero remaining quota', () => {
      const result = UsageLimitCheckResult.allowed(0);

      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(0);
    });

    it('should handle large remaining quota', () => {
      const result = UsageLimitCheckResult.allowed(100);

      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(100);
    });
  });

  describe('blocked', () => {
    it('should create a blocked result with reason', () => {
      const result = UsageLimitCheckResult.blocked('Quota exceeded');

      expect(result.isAllowed()).toBe(false);
      expect(result.getBlockReason()).toBe('Quota exceeded');
      expect(result.getRemainingQuota()).toBeUndefined();
    });

    it('should handle different block reasons', () => {
      const reason = 'Daily limit reached: 5/5 uses consumed';
      const result = UsageLimitCheckResult.blocked(reason);

      expect(result.isAllowed()).toBe(false);
      expect(result.getBlockReason()).toBe(reason);
    });

    it('should handle empty block reason', () => {
      const result = UsageLimitCheckResult.blocked('');

      expect(result.isAllowed()).toBe(false);
      expect(result.getBlockReason()).toBe('');
    });
  });

  describe('state consistency', () => {
    it('allowed result should never have block reason', () => {
      const result = UsageLimitCheckResult.allowed(5);

      expect(result.isAllowed()).toBe(true);
      expect(result.getBlockReason()).toBeUndefined();
    });

    it('blocked result should never have remaining quota', () => {
      const result = UsageLimitCheckResult.blocked('Limit reached');

      expect(result.isAllowed()).toBe(false);
      expect(result.getRemainingQuota()).toBeUndefined();
    });
  });
});
