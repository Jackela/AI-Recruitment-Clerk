import { QualityMetrics } from './quality-metrics.value-object.js';

describe('QualityMetrics', () => {
  describe('constructor', () => {
    it('should create quality metrics with all properties', () => {
      const metrics = new QualityMetrics({
        totalTextLength: 200,
        detailedAnswers: 3,
        completionRate: 0.95,
        qualityScore: 85,
        bonusEligible: true,
        qualityReasons: ['High completion rate', 'Detailed responses'],
      });

      expect(metrics).toBeInstanceOf(QualityMetrics);
    });

    it('should handle zero values', () => {
      const metrics = new QualityMetrics({
        totalTextLength: 0,
        detailedAnswers: 0,
        completionRate: 0,
        qualityScore: 0,
        bonusEligible: false,
        qualityReasons: [],
      });

      expect(metrics.totalTextLength).toBe(0);
      expect(metrics.detailedAnswers).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.qualityScore).toBe(0);
      expect(metrics.bonusEligible).toBe(false);
    });

    it('should handle maximum values', () => {
      const metrics = new QualityMetrics({
        totalTextLength: 10000,
        detailedAnswers: 10,
        completionRate: 1,
        qualityScore: 100,
        bonusEligible: true,
        qualityReasons: ['Reason 1', 'Reason 2', 'Reason 3'],
      });

      expect(metrics.completionRate).toBe(1);
      expect(metrics.qualityScore).toBe(100);
    });

    it('should handle empty quality reasons', () => {
      const metrics = new QualityMetrics({
        totalTextLength: 100,
        detailedAnswers: 1,
        completionRate: 0.5,
        qualityScore: 50,
        bonusEligible: false,
        qualityReasons: [],
      });

      expect(metrics.qualityReasons).toEqual([]);
    });
  });

  describe('getters', () => {
    const createMetrics = (overrides = {}) =>
      new QualityMetrics({
        totalTextLength: 300,
        detailedAnswers: 4,
        completionRate: 0.9,
        qualityScore: 80,
        bonusEligible: true,
        qualityReasons: ['High completion rate', 'Detailed text responses'],
        ...overrides,
      });

    it('should get total text length', () => {
      const metrics = createMetrics();
      expect(metrics.totalTextLength).toBe(300);
    });

    it('should get detailed answers count', () => {
      const metrics = createMetrics();
      expect(metrics.detailedAnswers).toBe(4);
    });

    it('should get completion rate', () => {
      const metrics = createMetrics();
      expect(metrics.completionRate).toBe(0.9);
    });

    it('should get quality score', () => {
      const metrics = createMetrics();
      expect(metrics.qualityScore).toBe(80);
    });

    it('should get bonus eligible status', () => {
      const metrics = createMetrics();
      expect(metrics.bonusEligible).toBe(true);
    });

    it('should get quality reasons', () => {
      const metrics = createMetrics();
      expect(metrics.qualityReasons).toEqual([
        'High completion rate',
        'Detailed text responses',
      ]);
    });

    it('should return quality reasons array', () => {
      const reasons = ['Reason 1', 'Reason 2'];
      const metrics = createMetrics({ qualityReasons: reasons });
      const retrieved = metrics.qualityReasons;

      expect(retrieved).toEqual(reasons);
    });
  });

  describe('edge cases', () => {
    it('should handle decimal completion rates', () => {
      const metrics = new QualityMetrics({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.857,
        qualityScore: 75,
        bonusEligible: false,
        qualityReasons: ['Partial completion'],
      });

      expect(metrics.completionRate).toBe(0.857);
    });

    it('should handle long quality reasons', () => {
      const longReason = 'A'.repeat(500);
      const metrics = new QualityMetrics({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 70,
        bonusEligible: true,
        qualityReasons: [longReason],
      });

      expect(metrics.qualityReasons[0]).toBe(longReason);
    });

    it('should handle many quality reasons', () => {
      const reasons = Array.from({ length: 20 }, (_, i) => `Reason ${i + 1}`);
      const metrics = new QualityMetrics({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 70,
        bonusEligible: true,
        qualityReasons: reasons,
      });

      expect(metrics.qualityReasons).toHaveLength(20);
    });

    it('should handle unicode in quality reasons', () => {
      const reasons = ['🎉 高质量', '详细回答 📄', '完成度高 ✅'];
      const metrics = new QualityMetrics({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 70,
        bonusEligible: true,
        qualityReasons: reasons,
      });

      expect(metrics.qualityReasons).toEqual(reasons);
    });
  });
});
