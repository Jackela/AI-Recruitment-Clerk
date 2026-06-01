import { SubmissionSummary } from './submission-summary.value-object.js';

describe('SubmissionSummary', () => {
  describe('constructor', () => {
    it('should create submission summary with all properties', () => {
      const summary = new SubmissionSummary({
        role: 'hr',
        industry: 'Technology',
        overallSatisfaction: 4,
        willingnessToPayMonthly: 100,
        textLength: 300,
        completionRate: 0.95,
      });

      expect(summary).toBeInstanceOf(SubmissionSummary);
    });

    it('should handle different roles', () => {
      const roles = ['hr', 'recruiter', 'manager', 'founder', 'other'];

      roles.forEach((role) => {
        const summary = new SubmissionSummary({
          role,
          industry: 'Tech',
          overallSatisfaction: 4,
          willingnessToPayMonthly: 100,
          textLength: 200,
          completionRate: 0.9,
        });
        expect(summary.role).toBe(role);
      });
    });

    it('should handle different industries', () => {
      const industries = [
        'Technology',
        'Finance',
        'Healthcare',
        'Education',
        'Retail',
      ];

      industries.forEach((industry) => {
        const summary = new SubmissionSummary({
          role: 'hr',
          industry,
          overallSatisfaction: 4,
          willingnessToPayMonthly: 100,
          textLength: 200,
          completionRate: 0.9,
        });
        expect(summary.industry).toBe(industry);
      });
    });

    it('should handle all satisfaction ratings', () => {
      const ratings = [1, 2, 3, 4, 5];

      ratings.forEach((rating) => {
        const summary = new SubmissionSummary({
          role: 'hr',
          industry: 'Tech',
          overallSatisfaction: rating,
          willingnessToPayMonthly: 100,
          textLength: 200,
          completionRate: 0.9,
        });
        expect(summary.overallSatisfaction).toBe(rating);
      });
    });

    it('should handle different willingness to pay amounts', () => {
      const amounts = [0, 50, 100, 500, 1000];

      amounts.forEach((amount) => {
        const summary = new SubmissionSummary({
          role: 'hr',
          industry: 'Tech',
          overallSatisfaction: 4,
          willingnessToPayMonthly: amount,
          textLength: 200,
          completionRate: 0.9,
        });
        expect(summary.willingnessToPayMonthly).toBe(amount);
      });
    });

    it('should handle different text lengths', () => {
      const lengths = [0, 50, 100, 500, 1000];

      lengths.forEach((length) => {
        const summary = new SubmissionSummary({
          role: 'hr',
          industry: 'Tech',
          overallSatisfaction: 4,
          willingnessToPayMonthly: 100,
          textLength: length,
          completionRate: 0.9,
        });
        expect(summary.textLength).toBe(length);
      });
    });

    it('should handle different completion rates', () => {
      const rates = [0, 0.25, 0.5, 0.75, 1.0];

      rates.forEach((rate) => {
        const summary = new SubmissionSummary({
          role: 'hr',
          industry: 'Tech',
          overallSatisfaction: 4,
          willingnessToPayMonthly: 100,
          textLength: 200,
          completionRate: rate,
        });
        expect(summary.completionRate).toBe(rate);
      });
    });
  });

  describe('getters', () => {
    const createSummary = (overrides = {}) =>
      new SubmissionSummary({
        role: 'manager',
        industry: 'Finance',
        overallSatisfaction: 5,
        willingnessToPayMonthly: 200,
        textLength: 400,
        completionRate: 1.0,
        ...overrides,
      });

    it('should get role', () => {
      const summary = createSummary();
      expect(summary.role).toBe('manager');
    });

    it('should get industry', () => {
      const summary = createSummary();
      expect(summary.industry).toBe('Finance');
    });

    it('should get overall satisfaction', () => {
      const summary = createSummary();
      expect(summary.overallSatisfaction).toBe(5);
    });

    it('should get willingness to pay monthly', () => {
      const summary = createSummary();
      expect(summary.willingnessToPayMonthly).toBe(200);
    });

    it('should get text length', () => {
      const summary = createSummary();
      expect(summary.textLength).toBe(400);
    });

    it('should get completion rate', () => {
      const summary = createSummary();
      expect(summary.completionRate).toBe(1.0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty role', () => {
      const summary = new SubmissionSummary({
        role: '',
        industry: 'Tech',
        overallSatisfaction: 4,
        willingnessToPayMonthly: 100,
        textLength: 200,
        completionRate: 0.9,
      });

      expect(summary.role).toBe('');
    });

    it('should handle empty industry', () => {
      const summary = new SubmissionSummary({
        role: 'hr',
        industry: '',
        overallSatisfaction: 4,
        willingnessToPayMonthly: 100,
        textLength: 200,
        completionRate: 0.9,
      });

      expect(summary.industry).toBe('');
    });

    it('should handle zero values', () => {
      const summary = new SubmissionSummary({
        role: 'hr',
        industry: 'Tech',
        overallSatisfaction: 0,
        willingnessToPayMonthly: 0,
        textLength: 0,
        completionRate: 0,
      });

      expect(summary.overallSatisfaction).toBe(0);
      expect(summary.willingnessToPayMonthly).toBe(0);
      expect(summary.textLength).toBe(0);
      expect(summary.completionRate).toBe(0);
    });

    it('should handle decimal values', () => {
      const summary = new SubmissionSummary({
        role: 'hr',
        industry: 'Tech',
        overallSatisfaction: 4.5,
        willingnessToPayMonthly: 99.99,
        textLength: 250,
        completionRate: 0.857,
      });

      expect(summary.willingnessToPayMonthly).toBe(99.99);
      expect(summary.completionRate).toBe(0.857);
    });

    it('should handle unicode characters', () => {
      const summary = new SubmissionSummary({
        role: '🧑‍💼 HR',
        industry: '技术行业 🚀',
        overallSatisfaction: 5,
        willingnessToPayMonthly: 100,
        textLength: 200,
        completionRate: 0.9,
      });

      expect(summary.role).toBe('🧑‍💼 HR');
      expect(summary.industry).toBe('技术行业 🚀');
    });
  });
});
