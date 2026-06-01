import { QuestionnaireValidationResult } from './questionnaire-validation-result.value-object.js';

describe('QuestionnaireValidationResult', () => {
  describe('constructor', () => {
    it('should create valid result with no errors', () => {
      const result = new QuestionnaireValidationResult(true, []);

      expect(result).toBeInstanceOf(QuestionnaireValidationResult);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should create invalid result with errors', () => {
      const errors = ['Role is required', 'Industry is required'];
      const result = new QuestionnaireValidationResult(false, errors);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it('should create invalid result with single error', () => {
      const result = new QuestionnaireValidationResult(false, [
        'Invalid rating',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should create valid result with empty errors array', () => {
      const result = new QuestionnaireValidationResult(true, []);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isValid property', () => {
    it('should be true when explicitly true', () => {
      const result = new QuestionnaireValidationResult(true, []);
      expect(result.isValid).toBe(true);
    });

    it('should be false when explicitly false', () => {
      const result = new QuestionnaireValidationResult(false, ['Error']);
      expect(result.isValid).toBe(false);
    });

    it('should be false even with empty errors', () => {
      const result = new QuestionnaireValidationResult(false, []);
      expect(result.isValid).toBe(false);
    });
  });

  describe('errors property', () => {
    it('should store single error', () => {
      const result = new QuestionnaireValidationResult(false, ['Single error']);
      expect(result.errors).toEqual(['Single error']);
    });

    it('should store multiple errors', () => {
      const errorList = [
        'Role is required',
        'Industry is required',
        'Satisfaction rating is required',
        'Screening method is required',
        'Willingness to pay is required',
      ];
      const result = new QuestionnaireValidationResult(false, errorList);
      expect(result.errors).toEqual(errorList);
    });

    it('should store empty array', () => {
      const result = new QuestionnaireValidationResult(true, []);
      expect(result.errors).toEqual([]);
    });

    it('should preserve error order', () => {
      const errors = ['First error', 'Second error', 'Third error'];
      const result = new QuestionnaireValidationResult(false, errors);
      expect(result.errors[0]).toBe('First error');
      expect(result.errors[1]).toBe('Second error');
      expect(result.errors[2]).toBe('Third error');
    });
  });

  describe('edge cases', () => {
    it('should handle long error messages', () => {
      const longError = 'A'.repeat(1000);
      const result = new QuestionnaireValidationResult(false, [longError]);
      expect(result.errors[0]).toBe(longError);
    });

    it('should handle unicode in error messages', () => {
      const errors = [
        '🎉 成功验证',
        'エラーが発生しました',
        'Ошибка валидации',
      ];
      const result = new QuestionnaireValidationResult(false, errors);
      expect(result.errors).toEqual(errors);
    });

    it('should handle special characters in error messages', () => {
      const errors = [
        'Error: field <value> is invalid!',
        'Path: user/profile[0]/name',
        'Expected: string | number | boolean',
      ];
      const result = new QuestionnaireValidationResult(false, errors);
      expect(result.errors).toEqual(errors);
    });

    it('should handle errors with newlines', () => {
      const multilineError = `Validation failed:
- Field 1 is required
- Field 2 must be a number`;
      const result = new QuestionnaireValidationResult(false, [multilineError]);
      expect(result.errors[0]).toBe(multilineError);
    });

    it('should handle many errors', () => {
      const errors = Array.from({ length: 100 }, (_, i) => `Error ${i + 1}`);
      const result = new QuestionnaireValidationResult(false, errors);
      expect(result.errors).toHaveLength(100);
    });
  });
});
