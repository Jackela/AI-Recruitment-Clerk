import { QuestionnaireRules } from '../domain-services/questionnaire.rules';
import type { QuestionnaireSubmission } from '../value-objects/questionnaire-submission.value-object';

describe('QuestionnaireRules', () => {
  const createMockSubmission = (overrides = {}): QuestionnaireSubmission => {
    return {
      getUserProfile: () => ({
        role: 'hr',
        industry: 'Technology',
        companySize: 'medium',
        location: 'Beijing',
        ...((overrides as { userProfile?: object }).userProfile || {}),
      }),
      getUserExperience: () => ({
        overallSatisfaction: 4,
        accuracyRating: 5,
        speedRating: 4,
        uiRating: 5,
        mostUsefulFeature: 'AI Screening',
        mainPainPoint: 'Resume parsing accuracy issues',
        improvementSuggestion: 'Better ATS integration and customization',
        ...((overrides as { userExperience?: object }).userExperience || {}),
      }),
      getBusinessValue: () => ({
        currentScreeningMethod: 'ats',
        timeSpentPerResume: 5,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 100,
        recommendLikelihood: 4,
        ...((overrides as { businessValue?: object }).businessValue || {}),
      }),
      getOptionalInfo: () => ({
        additionalFeedback: 'Great product, very helpful for hiring',
        contactPreference: 'email',
        ...((overrides as { optional?: object }).optional || {}),
      }),
      getSummary: () => ({
        completionRate: 0.95,
        textLength: 300,
        detailedAnswers: 3,
        ...((overrides as { summary?: object }).summary || {}),
      }),
      getAnswer: () => null,
    } as unknown as QuestionnaireSubmission;
  };

  describe('constants', () => {
    it('should have correct quality thresholds', () => {
      expect(QuestionnaireRules.MIN_TEXT_LENGTH_FOR_BONUS).toBe(50);
      expect(QuestionnaireRules.MIN_COMPLETION_RATE).toBe(0.8);
      expect(QuestionnaireRules.MIN_DETAILED_ANSWERS).toBe(3);
      expect(QuestionnaireRules.QUALITY_SCORE_THRESHOLD).toBe(70);
    });

    it('should have correct required fields', () => {
      expect(QuestionnaireRules.REQUIRED_FIELDS).toContain('userProfile.role');
      expect(QuestionnaireRules.REQUIRED_FIELDS).toContain(
        'userProfile.industry',
      );
      expect(QuestionnaireRules.REQUIRED_FIELDS).toContain(
        'userExperience.overallSatisfaction',
      );
      expect(QuestionnaireRules.REQUIRED_FIELDS).toContain(
        'businessValue.currentScreeningMethod',
      );
      expect(QuestionnaireRules.REQUIRED_FIELDS).toContain(
        'businessValue.willingnessToPayMonthly',
      );
    });
  });

  describe('isHighQualitySubmission', () => {
    it('should return true for high quality submission', () => {
      const submission = createMockSubmission({
        summary: { completionRate: 0.9, textLength: 200, detailedAnswers: 4 },
      });

      expect(QuestionnaireRules.isHighQualitySubmission(submission)).toBe(true);
    });

    it('should return false for low text length', () => {
      const submission = createMockSubmission({
        summary: { completionRate: 0.9, textLength: 30, detailedAnswers: 4 },
      });

      expect(QuestionnaireRules.isHighQualitySubmission(submission)).toBe(
        false,
      );
    });

    it('should return false for low completion rate', () => {
      const submission = createMockSubmission({
        summary: { completionRate: 0.5, textLength: 200, detailedAnswers: 4 },
      });

      expect(QuestionnaireRules.isHighQualitySubmission(submission)).toBe(
        false,
      );
    });

    it('should return false for insufficient detailed answers', () => {
      const submission = createMockSubmission({
        summary: { completionRate: 0.9, textLength: 200, detailedAnswers: 1 },
      });

      expect(QuestionnaireRules.isHighQualitySubmission(submission)).toBe(
        false,
      );
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate score based on completion rate', () => {
      const submission = createMockSubmission({
        summary: { completionRate: 1.0, textLength: 300, detailedAnswers: 3 },
        userExperience: {
          mainPainPoint: 'Some pain point description here',
          improvementSuggestion: 'Some improvement suggestion here',
        },
        businessValue: {
          willingnessToPayMonthly: 100,
          recommendLikelihood: 5,
          timeSavingPercentage: 50,
        },
      });

      const score = QuestionnaireRules.calculateQualityScore(submission);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      const submission = createMockSubmission({
        summary: { completionRate: 1.0, textLength: 1000, detailedAnswers: 5 },
        userExperience: {
          mainPainPoint: 'A'.repeat(100),
          improvementSuggestion: 'B'.repeat(100),
        },
        businessValue: {
          willingnessToPayMonthly: 500,
          recommendLikelihood: 5,
          timeSavingPercentage: 80,
        },
      });

      const score = QuestionnaireRules.calculateQualityScore(submission);
      expect(score).toBe(100);
    });
  });

  describe('isValidSubmission', () => {
    it('should validate complete submission', () => {
      const submission = createMockSubmission();
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('should fail validation for missing role', () => {
      const submission = createMockSubmission({
        userProfile: { role: undefined },
      });
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toContain(
        'Required field missing: userProfile.role',
      );
    });

    it('should fail validation for missing industry', () => {
      const submission = createMockSubmission({
        userProfile: { industry: undefined },
      });
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toContain(
        'Required field missing: userProfile.industry',
      );
    });

    it('should fail validation for missing satisfaction rating', () => {
      const submission = createMockSubmission({
        userExperience: { overallSatisfaction: undefined },
      });
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toContain(
        'Required field missing: userExperience.overallSatisfaction',
      );
    });

    it('should fail validation for invalid rating', () => {
      const submission = createMockSubmission({
        userExperience: { overallSatisfaction: 6 },
      });
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toContain('Overall satisfaction must be 1-5');
    });

    it('should fail validation for negative willingness to pay', () => {
      const submission = createMockSubmission({
        businessValue: { willingnessToPayMonthly: -10 },
      });
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toContain(
        'Willingness to pay must be non-negative',
      );
    });

    it('should fail validation for invalid time saving percentage', () => {
      const submission = createMockSubmission({
        businessValue: { timeSavingPercentage: 150 },
      });
      const result = QuestionnaireRules.isValidSubmission(submission);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toContain(
        'Time saving percentage must be 0-100',
      );
    });
  });

  describe('isValidRating', () => {
    it('should return true for valid ratings', () => {
      expect(QuestionnaireRules.isValidRating(1)).toBe(true);
      expect(QuestionnaireRules.isValidRating(3)).toBe(true);
      expect(QuestionnaireRules.isValidRating(5)).toBe(true);
    });

    it('should return false for invalid ratings', () => {
      expect(QuestionnaireRules.isValidRating(0)).toBe(false);
      expect(QuestionnaireRules.isValidRating(6)).toBe(false);
      expect(QuestionnaireRules.isValidRating(-1)).toBe(false);
    });
  });

  describe('isEligibleForBonus', () => {
    it('should return true when all criteria met', () => {
      expect(QuestionnaireRules.isEligibleForBonus(80, 100, 5)).toBe(true);
    });

    it('should return false when quality score too low', () => {
      expect(QuestionnaireRules.isEligibleForBonus(60, 100, 5)).toBe(false);
    });

    it('should return false when text length too short', () => {
      expect(QuestionnaireRules.isEligibleForBonus(80, 30, 5)).toBe(false);
    });

    it('should return false when detailed answers insufficient', () => {
      expect(QuestionnaireRules.isEligibleForBonus(80, 100, 1)).toBe(false);
    });
  });
});
