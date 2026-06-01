import { QualityScore } from './quality-score.value-object.js';

describe('QualityScore', () => {
  describe('constructor', () => {
    it('should create quality score with value', () => {
      const score = new QualityScore({ value: 75 });

      expect(score).toBeInstanceOf(QualityScore);
      expect(score.value).toBe(75);
    });

    it('should handle different score values', () => {
      const values = [0, 25, 50, 75, 100];

      values.forEach((value) => {
        const score = new QualityScore({ value });
        expect(score.value).toBe(value);
      });
    });

    it('should handle zero score', () => {
      const score = new QualityScore({ value: 0 });
      expect(score.value).toBe(0);
    });

    it('should handle perfect score', () => {
      const score = new QualityScore({ value: 100 });
      expect(score.value).toBe(100);
    });

    it('should handle decimal scores', () => {
      const score = new QualityScore({ value: 75.5 });
      expect(score.value).toBe(75.5);
    });
  });

  describe('getters', () => {
    it('should get value', () => {
      const score = new QualityScore({ value: 85 });
      expect(score.value).toBe(85);
    });

    it('should return correct type', () => {
      const score = new QualityScore({ value: 90 });
      expect(typeof score.value).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle scores above 100', () => {
      const score = new QualityScore({ value: 150 });
      expect(score.value).toBe(150);
    });

    it('should handle negative scores', () => {
      const score = new QualityScore({ value: -10 });
      expect(score.value).toBe(-10);
    });

    it('should handle very precise decimal scores', () => {
      const score = new QualityScore({ value: 66.666666 });
      expect(score.value).toBe(66.666666);
    });
  });
});
