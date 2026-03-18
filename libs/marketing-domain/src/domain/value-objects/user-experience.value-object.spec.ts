import { UserExperience } from './user-experience.value-object.js';
import { Rating } from '../../application/dtos/questionnaire.dto.js';

describe('UserExperience', () => {
  describe('constructor', () => {
    it('should create user experience with all required properties', () => {
      const experience = new UserExperience({
        overallSatisfaction: 4 as Rating,
        accuracyRating: 5 as Rating,
        speedRating: 4 as Rating,
        uiRating: 5 as Rating,
        mostUsefulFeature: 'AI Screening',
      });

      expect(experience).toBeInstanceOf(UserExperience);
      expect(experience.overallSatisfaction).toBe(4);
      expect(experience.accuracyRating).toBe(5);
      expect(experience.speedRating).toBe(4);
      expect(experience.uiRating).toBe(5);
      expect(experience.mostUsefulFeature).toBe('AI Screening');
      expect(experience.mainPainPoint).toBeUndefined();
      expect(experience.improvementSuggestion).toBeUndefined();
    });

    it('should create user experience with optional properties', () => {
      const experience = new UserExperience({
        overallSatisfaction: 5 as Rating,
        accuracyRating: 4 as Rating,
        speedRating: 5 as Rating,
        uiRating: 4 as Rating,
        mostUsefulFeature: 'Resume Parsing',
        mainPainPoint: 'Slow processing speed',
        improvementSuggestion: 'Better UI design',
      });

      expect(experience.mainPainPoint).toBe('Slow processing speed');
      expect(experience.improvementSuggestion).toBe('Better UI design');
    });

    it('should handle all rating values', () => {
      const ratings: Rating[] = [1, 2, 3, 4, 5];

      ratings.forEach((rating) => {
        const experience = new UserExperience({
          overallSatisfaction: rating,
          accuracyRating: rating,
          speedRating: rating,
          uiRating: rating,
          mostUsefulFeature: 'Test Feature',
        });
        expect(experience.overallSatisfaction).toBe(rating);
        expect(experience.accuracyRating).toBe(rating);
      });
    });

    it('should handle different useful features', () => {
      const features = [
        'AI Screening',
        'Resume Parsing',
        'Candidate Matching',
        'Interview Scheduling',
        'Analytics Dashboard',
      ];

      features.forEach((feature) => {
        const experience = new UserExperience({
          overallSatisfaction: 4 as Rating,
          accuracyRating: 4 as Rating,
          speedRating: 4 as Rating,
          uiRating: 4 as Rating,
          mostUsefulFeature: feature,
        });
        expect(experience.mostUsefulFeature).toBe(feature);
      });
    });
  });

  describe('getters', () => {
    const createExperience = (overrides = {}) =>
      new UserExperience({
        overallSatisfaction: 5 as Rating,
        accuracyRating: 4 as Rating,
        speedRating: 5 as Rating,
        uiRating: 4 as Rating,
        mostUsefulFeature: 'AI Matching',
        mainPainPoint: 'Integration issues',
        improvementSuggestion: 'More customization',
        ...overrides,
      });

    it('should get overall satisfaction', () => {
      const experience = createExperience();
      expect(experience.overallSatisfaction).toBe(5);
    });

    it('should get accuracy rating', () => {
      const experience = createExperience();
      expect(experience.accuracyRating).toBe(4);
    });

    it('should get speed rating', () => {
      const experience = createExperience();
      expect(experience.speedRating).toBe(5);
    });

    it('should get ui rating', () => {
      const experience = createExperience();
      expect(experience.uiRating).toBe(4);
    });

    it('should get most useful feature', () => {
      const experience = createExperience();
      expect(experience.mostUsefulFeature).toBe('AI Matching');
    });

    it('should get main pain point', () => {
      const experience = createExperience();
      expect(experience.mainPainPoint).toBe('Integration issues');
    });

    it('should get improvement suggestion', () => {
      const experience = createExperience();
      expect(experience.improvementSuggestion).toBe('More customization');
    });

    it('should return undefined for optional fields when not provided', () => {
      const experience = new UserExperience({
        overallSatisfaction: 3 as Rating,
        accuracyRating: 3 as Rating,
        speedRating: 3 as Rating,
        uiRating: 3 as Rating,
        mostUsefulFeature: 'Basic Feature',
      });
      expect(experience.mainPainPoint).toBeUndefined();
      expect(experience.improvementSuggestion).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string for optional fields', () => {
      const experience = new UserExperience({
        overallSatisfaction: 4 as Rating,
        accuracyRating: 4 as Rating,
        speedRating: 4 as Rating,
        uiRating: 4 as Rating,
        mostUsefulFeature: 'Feature',
        mainPainPoint: '',
        improvementSuggestion: '',
      });

      expect(experience.mainPainPoint).toBe('');
      expect(experience.improvementSuggestion).toBe('');
    });

    it('should handle long text for optional fields', () => {
      const longText = 'A'.repeat(1000);
      const experience = new UserExperience({
        overallSatisfaction: 5 as Rating,
        accuracyRating: 5 as Rating,
        speedRating: 5 as Rating,
        uiRating: 5 as Rating,
        mostUsefulFeature: 'Feature',
        mainPainPoint: longText,
        improvementSuggestion: longText,
      });

      expect(experience.mainPainPoint).toBe(longText);
      expect(experience.improvementSuggestion).toBe(longText);
    });

    it('should handle unicode text', () => {
      const experience = new UserExperience({
        overallSatisfaction: 5 as Rating,
        accuracyRating: 5 as Rating,
        speedRating: 5 as Rating,
        uiRating: 5 as Rating,
        mostUsefulFeature: '🤖 AI助手',
        mainPainPoint: '速度太慢 🐌',
        improvementSuggestion: '需要更多功能 🚀',
      });

      expect(experience.mostUsefulFeature).toBe('🤖 AI助手');
      expect(experience.mainPainPoint).toBe('速度太慢 🐌');
      expect(experience.improvementSuggestion).toBe('需要更多功能 🚀');
    });
  });
});
