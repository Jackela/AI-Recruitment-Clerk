import { IncentiveValidationResult } from './incentive-validation-result.value-object';

describe('IncentiveValidationResult', () => {
  describe('constructor', () => {
    it('should create valid result', () => {
      const result = new IncentiveValidationResult(true, []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should create invalid result with errors', () => {
      const result = new IncentiveValidationResult(false, [
        'Error 1',
        'Error 2',
      ]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('isValid', () => {
    it('should return true for valid result', () => {
      const result = new IncentiveValidationResult(true, []);
      expect(result.isValid).toBe(true);
    });

    it('should return false for invalid result', () => {
      const result = new IncentiveValidationResult(false, ['Some error']);
      expect(result.isValid).toBe(false);
    });
  });

  describe('errors', () => {
    it('should return empty array for valid result', () => {
      const result = new IncentiveValidationResult(true, []);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for invalid result', () => {
      const errors = ['Invalid email', 'Invalid amount'];
      const result = new IncentiveValidationResult(false, errors);
      expect(result.errors).toEqual(errors);
    });
  });
});
