import { UsageRecordResult } from './usage-record-result.value-object';

describe('UsageRecordResult', () => {
  describe('success', () => {
    it('should create successful result', () => {
      const result = UsageRecordResult.success(5, 10);

      expect(result.isSuccess()).toBe(true);
      expect(result.getCurrentUsage()).toBe(5);
      expect(result.getRemainingQuota()).toBe(10);
      expect(result.getError()).toBeUndefined();
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const result = UsageRecordResult.failed('Quota exceeded');

      expect(result.isSuccess()).toBe(false);
      expect(result.getCurrentUsage()).toBeUndefined();
      expect(result.getRemainingQuota()).toBeUndefined();
      expect(result.getError()).toBe('Quota exceeded');
    });
  });

  describe('isSuccess', () => {
    it('should return true for success result', () => {
      const result = UsageRecordResult.success(1, 4);
      expect(result.isSuccess()).toBe(true);
    });

    it('should return false for failed result', () => {
      const result = UsageRecordResult.failed('Error');
      expect(result.isSuccess()).toBe(false);
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current usage for success', () => {
      const result = UsageRecordResult.success(3, 7);
      expect(result.getCurrentUsage()).toBe(3);
    });

    it('should return undefined for failure', () => {
      const result = UsageRecordResult.failed('Error');
      expect(result.getCurrentUsage()).toBeUndefined();
    });
  });

  describe('getRemainingQuota', () => {
    it('should return remaining quota for success', () => {
      const result = UsageRecordResult.success(2, 8);
      expect(result.getRemainingQuota()).toBe(8);
    });

    it('should return undefined for failure', () => {
      const result = UsageRecordResult.failed('Error');
      expect(result.getRemainingQuota()).toBeUndefined();
    });
  });

  describe('getError', () => {
    it('should return error message for failure', () => {
      const result = UsageRecordResult.failed('Rate limit exceeded');
      expect(result.getError()).toBe('Rate limit exceeded');
    });

    it('should return undefined for success', () => {
      const result = UsageRecordResult.success(1, 4);
      expect(result.getError()).toBeUndefined();
    });
  });
});
