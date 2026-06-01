import type { QuestionnaireData } from './questionnaire.aggregate';
import { Questionnaire } from './questionnaire.aggregate';
import { SubmissionMetadata } from '../value-objects/submission-metadata.value-object';
import type {
  RawSubmissionData} from '../../application/dtos/questionnaire.dto';
import {
  QuestionnaireStatus
} from '../../application/dtos/questionnaire.dto';

describe('Questionnaire', () => {
  const createValidRawData = (): RawSubmissionData => ({
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
      mostUsefulFeature: 'AI Screening feature',
      mainPainPoint: 'Current system is slow and requires manual intervention',
      improvementSuggestion: 'Better integration with existing ATS systems',
    },
    businessValue: {
      currentScreeningMethod: 'ats',
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
      additionalFeedback: 'Great product overall',
      contactPreference: 'email',
    },
  });

  const createValidMetadata = (): SubmissionMetadata => {
    return SubmissionMetadata.restore({
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
    });
  };

  describe('create', () => {
    it('should create questionnaire with SUBMITTED status', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.SUBMITTED);
    });

    it('should generate questionnaire id', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      expect(questionnaire.getId()).toBeDefined();
      expect(questionnaire.getId().getValue()).toBeTruthy();
    });

    it('should create submission events on creation', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const events = questionnaire.getUncommittedEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should create high quality event when eligible', () => {
      const highQualityData = createValidRawData();
      highQualityData.userExperience = {
        overallSatisfaction: 5,
        accuracyRating: 5,
        speedRating: 5,
        uiRating: 5,
        mostUsefulFeature: 'AI Screening helps automate candidate filtering',
        mainPainPoint: 'Current system is too slow for processing high volume',
        improvementSuggestion:
          'Better integration with existing ATS systems would help workflow',
      };
      highQualityData.optional = {
        additionalFeedback: 'Overall very satisfied with the product direction',
        contactPreference: 'email',
      };

      const questionnaire = Questionnaire.create(
        'template_123',
        highQualityData,
        createValidMetadata(),
      );

      const events = questionnaire.getUncommittedEvents();
      expect(events.length).toBe(2); // Submitted + HighQuality events
    });
  });

  describe('restore', () => {
    it('should restore questionnaire from data', () => {
      const data: QuestionnaireData = {
        id: 'quest_123',
        template: { id: 'template_123', version: '1.0' },
        submission: {
          userProfile: {
            role: 'hr',
            industry: 'Tech',
            companySize: 'medium',
            location: 'Beijing',
          },
          userExperience: {
            overallSatisfaction: 4,
            accuracyRating: 5,
            speedRating: 4,
            uiRating: 5,
            mostUsefulFeature: 'AI',
          },
          businessValue: {
            currentScreeningMethod: 'ats',
            willingnessToPayMonthly: 100,
          },
          featureNeeds: { priorityFeatures: [], integrationNeeds: [] },
          optional: {},
          submittedAt: new Date(),
        },
        quality: {
          totalTextLength: 100,
          detailedAnswers: 2,
          completionRate: 0.8,
          qualityScore: 75,
          bonusEligible: false,
          qualityReasons: [],
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
        },
        status: QuestionnaireStatus.SUBMITTED,
      };

      const questionnaire = Questionnaire.restore(data);

      expect(questionnaire.getId().getValue()).toBe('quest_123');
      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.SUBMITTED);
    });
  });

  describe('validateSubmission', () => {
    it('should return valid for complete submission', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const result = questionnaire.validateSubmission();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when role is missing', () => {
      const invalidData = createValidRawData();
      invalidData.userProfile!.role = undefined as unknown as 'hr';

      const questionnaire = Questionnaire.create(
        'template_123',
        invalidData,
        createValidMetadata(),
      );

      const result = questionnaire.validateSubmission();

      expect(result.isValid).toBe(false);
    });

    it('should fail validation when industry is empty', () => {
      const invalidData = createValidRawData();
      invalidData.userProfile!.industry = '';

      const questionnaire = Questionnaire.create(
        'template_123',
        invalidData,
        createValidMetadata(),
      );

      const result = questionnaire.validateSubmission();

      expect(result.isValid).toBe(false);
    });

    it('should fail validation when overall satisfaction is 1', () => {
      const invalidData = createValidRawData();
      invalidData.userExperience!.overallSatisfaction = 1;

      const questionnaire = Questionnaire.create(
        'template_123',
        invalidData,
        createValidMetadata(),
      );

      const result = questionnaire.validateSubmission();

      expect(result.isValid).toBe(false);
    });

    it('should fail validation when screening method is manual', () => {
      const invalidData = createValidRawData();
      invalidData.businessValue!.currentScreeningMethod = 'manual';

      const questionnaire = Questionnaire.create(
        'template_123',
        invalidData,
        createValidMetadata(),
      );

      const result = questionnaire.validateSubmission();

      expect(result.isValid).toBe(false);
    });

    it('should fail validation when willingness to pay is 0', () => {
      const invalidData = createValidRawData();
      invalidData.businessValue!.willingnessToPayMonthly = 0;

      const questionnaire = Questionnaire.create(
        'template_123',
        invalidData,
        createValidMetadata(),
      );

      const result = questionnaire.validateSubmission();

      expect(result.isValid).toBe(false);
    });
  });

  describe('calculateQualityScore', () => {
    it('should return quality score', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const score = questionnaire.calculateQualityScore();

      expect(score.value).toBeGreaterThan(0);
      expect(score.value).toBeLessThanOrEqual(100);
    });
  });

  describe('isEligibleForBonus', () => {
    it('should return boolean', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const eligible = questionnaire.isEligibleForBonus();

      expect(typeof eligible).toBe('boolean');
    });
  });

  describe('getSubmissionSummary', () => {
    it('should return submission summary', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const summary = questionnaire.getSubmissionSummary();

      expect(summary).toBeDefined();
      expect(summary.role).toBe('hr');
      expect(summary.industry).toBe('Technology');
    });
  });

  describe('status transitions', () => {
    it('should mark as processed', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      questionnaire.markAsProcessed();

      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.PROCESSED);
    });

    it('should mark as rewarded', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      questionnaire.markAsRewarded();

      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.REWARDED);
    });

    it('should flag as low quality', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      questionnaire.flagAsLowQuality();

      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.LOW_QUALITY);
    });
  });

  describe('getAnswerByQuestionId', () => {
    it('should return answer for valid question id', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const answer = questionnaire.getAnswerByQuestionId('role');

      expect(answer).toBeDefined();
    });

    it('should return null for invalid question id', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const answer = questionnaire.getAnswerByQuestionId('nonexistent');

      expect(answer).toBeNull();
    });
  });

  describe('getQualityMetrics', () => {
    it('should return quality metrics', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const metrics = questionnaire.getQualityMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.qualityScore).toBeGreaterThan(0);
    });
  });

  describe('getTotalTextLength', () => {
    it('should return total text length', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const textLength = questionnaire.getTotalTextLength();

      expect(textLength).toBeGreaterThan(0);
    });
  });

  describe('hasDetailedFeedback', () => {
    it('should return boolean', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const hasFeedback = questionnaire.hasDetailedFeedback();

      expect(typeof hasFeedback).toBe('boolean');
    });
  });

  describe('getUncommittedEvents', () => {
    it('should return copy of events array', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const events1 = questionnaire.getUncommittedEvents();
      const events2 = questionnaire.getUncommittedEvents();

      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });

  describe('markEventsAsCommitted', () => {
    it('should clear uncommitted events', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      expect(questionnaire.getUncommittedEvents().length).toBeGreaterThan(0);

      questionnaire.markEventsAsCommitted();

      expect(questionnaire.getUncommittedEvents()).toEqual([]);
    });
  });

  describe('getId', () => {
    it('should return questionnaire id', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const id = questionnaire.getId();

      expect(id).toBeDefined();
    });
  });

  describe('getSubmitterIP', () => {
    it('should return submitter IP from metadata', () => {
      const metadata = createValidMetadata();
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        metadata,
      );

      const ip = questionnaire.getSubmitterIP();

      expect(ip).toBe(metadata.ip);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      const questionnaire = Questionnaire.create(
        'template_123',
        createValidRawData(),
        createValidMetadata(),
      );

      const status = questionnaire.getStatus();

      expect(status).toBe(QuestionnaireStatus.SUBMITTED);
    });
  });
});
