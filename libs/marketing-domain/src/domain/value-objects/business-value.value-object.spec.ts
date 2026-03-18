import { BusinessValue } from './business-value.value-object.js';
import {
  ScreeningMethod,
  Rating,
} from '../../application/dtos/questionnaire.dto.js';

describe('BusinessValue', () => {
  describe('constructor', () => {
    it('should create business value with all properties', () => {
      const businessValue = new BusinessValue({
        currentScreeningMethod: 'ats' as ScreeningMethod,
        timeSpentPerResume: 5,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 100,
        recommendLikelihood: 4 as Rating,
      });

      expect(businessValue).toBeInstanceOf(BusinessValue);
      expect(businessValue.currentScreeningMethod).toBe('ats');
      expect(businessValue.timeSpentPerResume).toBe(5);
      expect(businessValue.resumesPerWeek).toBe(50);
      expect(businessValue.timeSavingPercentage).toBe(60);
      expect(businessValue.willingnessToPayMonthly).toBe(100);
      expect(businessValue.recommendLikelihood).toBe(4);
    });

    it('should handle different screening methods', () => {
      const methods: ScreeningMethod[] = ['manual', 'ats', 'hybrid', 'other'];

      methods.forEach((method) => {
        const businessValue = new BusinessValue({
          currentScreeningMethod: method,
          timeSpentPerResume: 5,
          resumesPerWeek: 50,
          timeSavingPercentage: 60,
          willingnessToPayMonthly: 100,
          recommendLikelihood: 4 as Rating,
        });
        expect(businessValue.currentScreeningMethod).toBe(method);
      });
    });

    it('should handle different time spent per resume values', () => {
      const times = [1, 5, 10, 15, 30, 60];

      times.forEach((time) => {
        const businessValue = new BusinessValue({
          currentScreeningMethod: 'manual',
          timeSpentPerResume: time,
          resumesPerWeek: 50,
          timeSavingPercentage: 60,
          willingnessToPayMonthly: 100,
          recommendLikelihood: 4 as Rating,
        });
        expect(businessValue.timeSpentPerResume).toBe(time);
      });
    });

    it('should handle different resumes per week values', () => {
      const counts = [10, 50, 100, 500, 1000];

      counts.forEach((count) => {
        const businessValue = new BusinessValue({
          currentScreeningMethod: 'manual',
          timeSpentPerResume: 5,
          resumesPerWeek: count,
          timeSavingPercentage: 60,
          willingnessToPayMonthly: 100,
          recommendLikelihood: 4 as Rating,
        });
        expect(businessValue.resumesPerWeek).toBe(count);
      });
    });

    it('should handle different time saving percentages', () => {
      const percentages = [0, 25, 50, 75, 100];

      percentages.forEach((percentage) => {
        const businessValue = new BusinessValue({
          currentScreeningMethod: 'manual',
          timeSpentPerResume: 5,
          resumesPerWeek: 50,
          timeSavingPercentage: percentage,
          willingnessToPayMonthly: 100,
          recommendLikelihood: 4 as Rating,
        });
        expect(businessValue.timeSavingPercentage).toBe(percentage);
      });
    });

    it('should handle different willingness to pay values', () => {
      const amounts = [0, 50, 100, 500, 1000];

      amounts.forEach((amount) => {
        const businessValue = new BusinessValue({
          currentScreeningMethod: 'manual',
          timeSpentPerResume: 5,
          resumesPerWeek: 50,
          timeSavingPercentage: 60,
          willingnessToPayMonthly: amount,
          recommendLikelihood: 4 as Rating,
        });
        expect(businessValue.willingnessToPayMonthly).toBe(amount);
      });
    });

    it('should handle all recommend likelihood ratings', () => {
      const ratings: Rating[] = [1, 2, 3, 4, 5];

      ratings.forEach((rating) => {
        const businessValue = new BusinessValue({
          currentScreeningMethod: 'manual',
          timeSpentPerResume: 5,
          resumesPerWeek: 50,
          timeSavingPercentage: 60,
          willingnessToPayMonthly: 100,
          recommendLikelihood: rating,
        });
        expect(businessValue.recommendLikelihood).toBe(rating);
      });
    });
  });

  describe('getters', () => {
    const createBusinessValue = (overrides = {}) =>
      new BusinessValue({
        currentScreeningMethod: 'hybrid' as ScreeningMethod,
        timeSpentPerResume: 10,
        resumesPerWeek: 100,
        timeSavingPercentage: 75,
        willingnessToPayMonthly: 200,
        recommendLikelihood: 5 as Rating,
        ...overrides,
      });

    it('should get current screening method', () => {
      const value = createBusinessValue();
      expect(value.currentScreeningMethod).toBe('hybrid');
    });

    it('should get time spent per resume', () => {
      const value = createBusinessValue();
      expect(value.timeSpentPerResume).toBe(10);
    });

    it('should get resumes per week', () => {
      const value = createBusinessValue();
      expect(value.resumesPerWeek).toBe(100);
    });

    it('should get time saving percentage', () => {
      const value = createBusinessValue();
      expect(value.timeSavingPercentage).toBe(75);
    });

    it('should get willingness to pay monthly', () => {
      const value = createBusinessValue();
      expect(value.willingnessToPayMonthly).toBe(200);
    });

    it('should get recommend likelihood', () => {
      const value = createBusinessValue();
      expect(value.recommendLikelihood).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      const businessValue = new BusinessValue({
        currentScreeningMethod: 'manual',
        timeSpentPerResume: 0,
        resumesPerWeek: 0,
        timeSavingPercentage: 0,
        willingnessToPayMonthly: 0,
        recommendLikelihood: 1 as Rating,
      });

      expect(businessValue.timeSpentPerResume).toBe(0);
      expect(businessValue.resumesPerWeek).toBe(0);
      expect(businessValue.timeSavingPercentage).toBe(0);
      expect(businessValue.willingnessToPayMonthly).toBe(0);
    });

    it('should handle decimal values for monetary amounts', () => {
      const businessValue = new BusinessValue({
        currentScreeningMethod: 'manual',
        timeSpentPerResume: 5.5,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 99.99,
        recommendLikelihood: 4 as Rating,
      });

      expect(businessValue.willingnessToPayMonthly).toBe(99.99);
    });

    it('should handle large numbers', () => {
      const businessValue = new BusinessValue({
        currentScreeningMethod: 'manual',
        timeSpentPerResume: 1000,
        resumesPerWeek: 10000,
        timeSavingPercentage: 100,
        willingnessToPayMonthly: 10000,
        recommendLikelihood: 5 as Rating,
      });

      expect(businessValue.resumesPerWeek).toBe(10000);
      expect(businessValue.willingnessToPayMonthly).toBe(10000);
    });
  });
});
