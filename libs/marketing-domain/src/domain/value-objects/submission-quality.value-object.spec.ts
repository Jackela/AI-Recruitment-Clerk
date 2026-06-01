import { SubmissionQuality } from './submission-quality.value-object.js';
import { QuestionnaireSubmission } from './questionnaire-submission.value-object.js';
import { QualityScore } from './quality-score.value-object.js';
import { QualityMetrics } from './quality-metrics.value-object.js';
import type { RawSubmissionData } from '../../application/dtos/questionnaire.dto.js';

describe('SubmissionQuality', () => {
  const createMockSubmission = (
    overrides: Partial<RawSubmissionData> = {},
  ): QuestionnaireSubmission => {
    const defaultData: RawSubmissionData = {
      userProfile: {
        role: 'hr',
        industry: 'Technology',
        companySize: 'medium',
        location: 'Beijing',
      },
      userExperience: {
        overallSatisfaction: 4,
        accuracyRating: 5,
        speedRating: 4,
        uiRating: 5,
        mostUsefulFeature:
          'AI Screening feature that helps automate candidate filtering',
        mainPainPoint:
          'The current system is too slow and requires manual intervention for every candidate',
        improvementSuggestion:
          'Would be great to have better integration with existing ATS systems and more customization options',
      },
      businessValue: {
        currentScreeningMethod: 'manual',
        timeSpentPerResume: 5,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 100,
        recommendLikelihood: 4,
      },
      featureNeeds: {
        priorityFeatures: ['AI Screening', 'Resume Parsing'],
        integrationNeeds: ['LinkedIn', 'ATS'],
      },
      optional: {
        additionalFeedback:
          'Overall very satisfied with the product direction and feature set',
        contactPreference: 'email',
      },
    };

    return QuestionnaireSubmission.fromRawData({
      ...defaultData,
      ...overrides,
    });
  };

  describe('calculate', () => {
    it('should calculate quality for high quality submission', () => {
      const submission = createMockSubmission();
      const quality = SubmissionQuality.calculate(submission);

      expect(quality).toBeInstanceOf(SubmissionQuality);
      expect(quality.getQualityScore()).toBeGreaterThan(0);
    });

    it('should calculate with low completion rate', () => {
      const submission = createMockSubmission({
        userProfile: {
          role: 'other',
          industry: '',
          companySize: 'unknown',
          location: '',
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality).toBeInstanceOf(SubmissionQuality);
    });

    it('should calculate with minimal text', () => {
      const submission = createMockSubmission({
        userExperience: {
          overallSatisfaction: 1,
          accuracyRating: 1,
          speedRating: 1,
          uiRating: 1,
          mostUsefulFeature: '',
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality).toBeInstanceOf(SubmissionQuality);
    });

    it('should calculate with high willingness to pay', () => {
      const submission = createMockSubmission({
        businessValue: {
          willingnessToPayMonthly: 500,
          recommendLikelihood: 5,
          timeSavingPercentage: 80,
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality.getQualityScore()).toBeGreaterThan(70);
    });
  });

  describe('restore', () => {
    it('should restore from data', () => {
      const data = {
        totalTextLength: 200,
        detailedAnswers: 3,
        completionRate: 0.9,
        qualityScore: 85,
        bonusEligible: true,
        qualityReasons: ['High completion rate', 'Detailed responses'],
      };

      const quality = SubmissionQuality.restore(data);

      expect(quality).toBeInstanceOf(SubmissionQuality);
      expect(quality.getTotalTextLength()).toBe(200);
      expect(quality.getQualityScore()).toBe(85);
      expect(quality.isBonusEligible()).toBe(true);
    });
  });

  describe('calculateScore', () => {
    it('should return QualityScore', () => {
      const submission = createMockSubmission();
      const quality = SubmissionQuality.calculate(submission);
      const score = quality.calculateScore();

      expect(score).toBeInstanceOf(QualityScore);
      expect(score.value).toBe(quality.getQualityScore());
    });
  });

  describe('isBonusEligible', () => {
    it('should return true for high quality submission', () => {
      const submission = createMockSubmission({
        userExperience: {
          overallSatisfaction: 5,
          accuracyRating: 5,
          speedRating: 5,
          uiRating: 5,
          mostUsefulFeature: 'A'.repeat(100),
          mainPainPoint: 'B'.repeat(50),
          improvementSuggestion: 'C'.repeat(50),
        },
        optional: {
          additionalFeedback: 'D'.repeat(50),
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality.isBonusEligible()).toBe(true);
    });

    it('should return false for low quality submission', () => {
      const submission = createMockSubmission({
        userProfile: {
          role: 'other',
          industry: '',
          companySize: 'unknown',
          location: '',
        },
        userExperience: {
          overallSatisfaction: 1,
          accuracyRating: 1,
          speedRating: 1,
          uiRating: 1,
          mostUsefulFeature: '',
        },
        businessValue: {
          willingnessToPayMonthly: 0,
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality.isBonusEligible()).toBe(false);
    });
  });

  describe('getQualityScore', () => {
    it('should return quality score', () => {
      const quality = SubmissionQuality.restore({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 75,
        bonusEligible: false,
        qualityReasons: [],
      });

      expect(quality.getQualityScore()).toBe(75);
    });

    it('should cap score at 100', () => {
      const submission = createMockSubmission({
        userExperience: {
          overallSatisfaction: 5,
          accuracyRating: 5,
          speedRating: 5,
          uiRating: 5,
          mostUsefulFeature: 'A'.repeat(1000),
        },
        businessValue: {
          willingnessToPayMonthly: 1000,
          recommendLikelihood: 5,
          timeSavingPercentage: 100,
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality.getQualityScore()).toBeLessThanOrEqual(100);
    });
  });

  describe('getQualityReasons', () => {
    it('should return quality reasons', () => {
      const reasons = ['High completion rate', 'Detailed text responses'];
      const quality = SubmissionQuality.restore({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 75,
        bonusEligible: false,
        qualityReasons: reasons,
      });

      expect(quality.getQualityReasons()).toEqual(reasons);
    });

    it('should include high completion rate reason', () => {
      const submission = createMockSubmission({
        userProfile: {
          role: 'hr',
          industry: 'Tech',
          companySize: 'medium',
          location: 'Beijing',
        },
        userExperience: { overallSatisfaction: 4, mostUsefulFeature: 'Test' },
        businessValue: { willingnessToPayMonthly: 100 },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality.getQualityReasons()).toContain('High completion rate');
    });

    it('should include detailed text responses reason', () => {
      const submission = createMockSubmission({
        userExperience: {
          overallSatisfaction: 4,
          mostUsefulFeature: 'A'.repeat(100),
        },
      });
      const quality = SubmissionQuality.calculate(submission);

      expect(quality.getQualityReasons()).toContain('Detailed text responses');
    });
  });

  describe('getMetrics', () => {
    it('should return QualityMetrics', () => {
      const quality = SubmissionQuality.restore({
        totalTextLength: 150,
        detailedAnswers: 3,
        completionRate: 0.85,
        qualityScore: 80,
        bonusEligible: true,
        qualityReasons: ['Good submission'],
      });

      const metrics = quality.getMetrics();

      expect(metrics).toBeInstanceOf(QualityMetrics);
      expect(metrics.totalTextLength).toBe(150);
      expect(metrics.detailedAnswers).toBe(3);
      expect(metrics.completionRate).toBe(0.85);
      expect(metrics.qualityScore).toBe(80);
      expect(metrics.bonusEligible).toBe(true);
    });
  });

  describe('getTotalTextLength', () => {
    it('should return total text length', () => {
      const quality = SubmissionQuality.restore({
        totalTextLength: 500,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 75,
        bonusEligible: false,
        qualityReasons: [],
      });

      expect(quality.getTotalTextLength()).toBe(500);
    });
  });

  describe('hasDetailedFeedback', () => {
    it('should return true when detailed answers >= 3', () => {
      const quality = SubmissionQuality.restore({
        totalTextLength: 100,
        detailedAnswers: 3,
        completionRate: 0.8,
        qualityScore: 75,
        bonusEligible: false,
        qualityReasons: [],
      });

      expect(quality.hasDetailedFeedback()).toBe(true);
    });

    it('should return false when detailed answers < 3', () => {
      const quality = SubmissionQuality.restore({
        totalTextLength: 100,
        detailedAnswers: 2,
        completionRate: 0.8,
        qualityScore: 75,
        bonusEligible: false,
        qualityReasons: [],
      });

      expect(quality.hasDetailedFeedback()).toBe(false);
    });
  });
});
