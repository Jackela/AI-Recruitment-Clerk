import {
  QuestionnaireSubmission,
  QuestionnaireSubmissionRestoreData,
} from './questionnaire-submission.value-object.js';
import { UserProfile } from './user-profile.value-object.js';
import { UserExperience } from './user-experience.value-object.js';
import { BusinessValue } from './business-value.value-object.js';
import { OptionalInfo } from './optional-info.value-object.js';
import { SubmissionSummary } from './submission-summary.value-object.js';
import { Answer } from './answer.value-object.js';
import { RawSubmissionData } from '../../application/dtos/questionnaire.dto.js';

describe('QuestionnaireSubmission', () => {
  describe('fromRawData', () => {
    it('should create submission from complete raw data', () => {
      const data: RawSubmissionData = {
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
          mostUsefulFeature: 'AI Screening',
          mainPainPoint: 'Slow processing',
          improvementSuggestion: 'Better UI',
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
          additionalFeedback: 'Great product!',
          contactPreference: 'email',
        },
      };

      const submission = QuestionnaireSubmission.fromRawData(data);

      expect(submission).toBeInstanceOf(QuestionnaireSubmission);
      expect(submission.getUserProfile()).toBeInstanceOf(UserProfile);
      expect(submission.getUserExperience()).toBeInstanceOf(UserExperience);
    });

    it('should handle empty raw data with defaults', () => {
      const submission = QuestionnaireSubmission.fromRawData({});

      expect(submission).toBeInstanceOf(QuestionnaireSubmission);
      expect(submission.getUserProfile().role).toBe('other');
      expect(submission.getUserProfile().industry).toBe('');
      expect(submission.getUserProfile().companySize).toBe('unknown');
      expect(submission.getUserProfile().location).toBe('');
    });

    it('should handle partial raw data', () => {
      const data: RawSubmissionData = {
        userProfile: {
          role: 'manager',
          industry: 'Finance',
        },
        businessValue: {
          willingnessToPayMonthly: 200,
        },
      };

      const submission = QuestionnaireSubmission.fromRawData(data);

      expect(submission.getUserProfile().role).toBe('manager');
      expect(submission.getUserProfile().industry).toBe('Finance');
      expect(submission.getUserExperience().overallSatisfaction).toBe(1);
      expect(submission.getBusinessValue().willingnessToPayMonthly).toBe(200);
    });

    it('should set submittedAt to current date', () => {
      const before = new Date();
      const submission = QuestionnaireSubmission.fromRawData({});
      const after = new Date();

      const submittedAt = (submission as any).props.submittedAt;
      expect(submittedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(submittedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('restore', () => {
    it('should restore from complete data', () => {
      const data: QuestionnaireSubmissionRestoreData = {
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
          mostUsefulFeature: 'AI Screening',
          mainPainPoint: 'Slow processing',
          improvementSuggestion: 'Better UI',
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
          priorityFeatures: ['AI Screening'],
          integrationNeeds: ['LinkedIn'],
        },
        optional: {
          additionalFeedback: 'Great!',
          contactPreference: 'email',
        },
        submittedAt: '2024-01-15T10:30:00Z',
      };

      const submission = QuestionnaireSubmission.restore(data);

      expect(submission).toBeInstanceOf(QuestionnaireSubmission);
      expect(submission.getUserProfile().role).toBe('hr');
    });

    it('should handle Date object for submittedAt', () => {
      const date = new Date('2024-06-01T12:00:00Z');
      const data: QuestionnaireSubmissionRestoreData = {
        userProfile: {
          role: 'hr',
          industry: 'Tech',
          companySize: 'small',
          location: 'SH',
        },
        userExperience: {
          overallSatisfaction: 4,
          accuracyRating: 4,
          speedRating: 4,
          uiRating: 4,
          mostUsefulFeature: 'Test',
        },
        businessValue: {
          currentScreeningMethod: 'manual',
          timeSpentPerResume: 5,
          resumesPerWeek: 50,
          timeSavingPercentage: 60,
          willingnessToPayMonthly: 100,
          recommendLikelihood: 4,
        },
        featureNeeds: { priorityFeatures: [], integrationNeeds: [] },
        optional: {},
        submittedAt: date,
      };

      const submission = QuestionnaireSubmission.restore(data);
      const submittedAt = (submission as any).props.submittedAt;

      expect(submittedAt).toEqual(date);
    });

    it('should restore with minimal data', () => {
      const data: QuestionnaireSubmissionRestoreData = {
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
          currentScreeningMethod: 'manual',
          timeSpentPerResume: 0,
          resumesPerWeek: 0,
          timeSavingPercentage: 0,
          willingnessToPayMonthly: 0,
          recommendLikelihood: 1,
        },
        featureNeeds: { priorityFeatures: [], integrationNeeds: [] },
        optional: {},
        submittedAt: '2024-01-01T00:00:00Z',
      };

      const submission = QuestionnaireSubmission.restore(data);

      expect(submission).toBeInstanceOf(QuestionnaireSubmission);
      expect(submission.getUserProfile().role).toBe('other');
    });
  });

  describe('getUserProfile', () => {
    it('should return UserProfile', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { role: 'hr', industry: 'Tech' },
      });

      const profile = submission.getUserProfile();

      expect(profile).toBeInstanceOf(UserProfile);
      expect(profile.role).toBe('hr');
      expect(profile.industry).toBe('Tech');
    });
  });

  describe('getUserExperience', () => {
    it('should return UserExperience', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userExperience: { overallSatisfaction: 5, mostUsefulFeature: 'AI' },
      });

      const experience = submission.getUserExperience();

      expect(experience).toBeInstanceOf(UserExperience);
      expect(experience.overallSatisfaction).toBe(5);
      expect(experience.mostUsefulFeature).toBe('AI');
    });
  });

  describe('getBusinessValue', () => {
    it('should return BusinessValue', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        businessValue: { willingnessToPayMonthly: 200 },
      });

      const businessValue = submission.getBusinessValue();

      expect(businessValue).toBeInstanceOf(BusinessValue);
      expect(businessValue.willingnessToPayMonthly).toBe(200);
    });
  });

  describe('getOptionalInfo', () => {
    it('should return OptionalInfo', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        optional: { additionalFeedback: 'Great!' },
      });

      const optional = submission.getOptionalInfo();

      expect(optional).toBeInstanceOf(OptionalInfo);
      expect(optional.additionalFeedback).toBe('Great!');
    });
  });

  describe('getSummary', () => {
    it('should return SubmissionSummary', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { role: 'hr', industry: 'Technology' },
        userExperience: { overallSatisfaction: 4, mostUsefulFeature: 'AI' },
        businessValue: { willingnessToPayMonthly: 100 },
      });

      const summary = submission.getSummary();

      expect(summary).toBeInstanceOf(SubmissionSummary);
      expect(summary.role).toBe('hr');
      expect(summary.industry).toBe('Technology');
      expect(summary.overallSatisfaction).toBe(4);
      expect(summary.willingnessToPayMonthly).toBe(100);
    });

    it('should calculate correct text length', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { industry: 'Technology', location: 'Beijing' },
        userExperience: {
          mostUsefulFeature: 'AI Screening',
          mainPainPoint: 'Slow',
          improvementSuggestion: 'Faster',
        },
        optional: { additionalFeedback: 'Good' },
      });

      const summary = submission.getSummary();

      expect(summary.textLength).toBeGreaterThan(0);
    });

    it('should calculate correct completion rate', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { role: 'hr', industry: 'Tech' },
        userExperience: { overallSatisfaction: 4 },
        businessValue: { willingnessToPayMonthly: 100 },
      });

      const summary = submission.getSummary();

      expect(summary.completionRate).toBe(1.0);
    });

    it('should calculate lower completion rate for incomplete data', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { role: 'other', industry: '' },
        userExperience: { overallSatisfaction: 1 },
        businessValue: { willingnessToPayMonthly: 0 },
      });

      const summary = submission.getSummary();

      expect(summary.completionRate).toBeLessThan(1.0);
    });
  });

  describe('getAnswer', () => {
    it('should return Answer for valid question id', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { role: 'hr', industry: 'Technology' },
        userExperience: { overallSatisfaction: 4, mostUsefulFeature: 'AI' },
      });

      const roleAnswer = submission.getAnswer('role');
      const industryAnswer = submission.getAnswer('industry');

      expect(roleAnswer).toBeInstanceOf(Answer);
      expect((roleAnswer as any)?.props.value).toBe('hr');
      expect((industryAnswer as any)?.props.value).toBe('Technology');
    });

    it('should return null for invalid question id', () => {
      const submission = QuestionnaireSubmission.fromRawData({});

      const answer = submission.getAnswer('nonexistent');

      expect(answer).toBeNull();
    });

    it('should return Answer for satisfaction question', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userExperience: { overallSatisfaction: 5 },
      });

      const answer = submission.getAnswer('overallSatisfaction');

      expect(answer).toBeInstanceOf(Answer);
      expect((answer as any)?.props.value).toBe('5');
    });

    it('should return Answer for most useful feature', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userExperience: { mostUsefulFeature: 'Resume Parsing' },
      });

      const answer = submission.getAnswer('mostUsefulFeature');

      expect(answer).toBeInstanceOf(Answer);
      expect((answer as any)?.props.value).toBe('Resume Parsing');
    });
  });

  describe('calculateTotalTextLength', () => {
    it('should calculate text length correctly', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { industry: 'Tech', location: 'Beijing' },
        userExperience: {
          mostUsefulFeature: 'AI',
          mainPainPoint: 'Slow',
          improvementSuggestion: 'Fast',
        },
        optional: { additionalFeedback: 'Good' },
      });

      const summary = submission.getSummary();
      const expectedLength = 'Tech Beijing AI Slow Fast Good'.length;

      expect(summary.textLength).toBe(expectedLength);
    });

    it('should handle undefined optional fields', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { industry: 'Tech' },
        userExperience: { mostUsefulFeature: 'AI' },
        optional: {},
      });

      const summary = submission.getSummary();

      expect(summary.textLength).toBeGreaterThan(0);
    });
  });

  describe('calculateCompletionRate', () => {
    it('should return 1.0 for complete submission', () => {
      const submission = QuestionnaireSubmission.fromRawData({
        userProfile: { role: 'hr', industry: 'Tech' },
        userExperience: { overallSatisfaction: 4 },
        businessValue: { willingnessToPayMonthly: 100 },
      });

      const summary = submission.getSummary();

      expect(summary.completionRate).toBe(1.0);
    });

    it('should return less than 1.0 for incomplete submission', () => {
      const submission = QuestionnaireSubmission.fromRawData({});

      const summary = submission.getSummary();

      expect(summary.completionRate).toBeLessThan(1.0);
    });
  });
});
