import { QuestionnaireValidationFailedEvent } from './questionnaire-validation-failed.event';
import type { RawSubmissionData } from '../../application/dtos/questionnaire.dto';

describe('QuestionnaireValidationFailedEvent', () => {
  const createMockSubmissionData = (): Partial<RawSubmissionData> => ({
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
    },
    businessValue: {
      currentScreeningMethod: 'ats',
      timeSpentPerResume: 5,
      resumesPerWeek: 50,
      timeSavingPercentage: 60,
      willingnessToPayMonthly: 100,
      recommendLikelihood: 4,
    },
  });

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const submitterIP = '192.168.1.1';
      const validationErrors = [
        'Missing required field: role',
        'Invalid rating',
      ];
      const submissionData = createMockSubmissionData();
      const occurredAt = new Date();

      const event = new QuestionnaireValidationFailedEvent(
        submitterIP,
        validationErrors,
        submissionData,
        occurredAt,
      );

      expect(event.submitterIP).toBe(submitterIP);
      expect(event.validationErrors).toBe(validationErrors);
      expect(event.submissionData).toBe(submissionData);
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should handle empty submission data', () => {
      const event = new QuestionnaireValidationFailedEvent(
        '192.168.1.1',
        ['Validation error'],
        {},
        new Date(),
      );

      expect(event.submitterIP).toBe('192.168.1.1');
      expect(event.validationErrors).toEqual(['Validation error']);
      expect(event.submissionData).toEqual({});
    });

    it('should handle empty validation errors', () => {
      const event = new QuestionnaireValidationFailedEvent(
        '192.168.1.1',
        [],
        createMockSubmissionData(),
        new Date(),
      );

      expect(event.validationErrors).toEqual([]);
    });
  });

  describe('DomainEvent compliance', () => {
    it('should implement DomainEvent interface', () => {
      const event = new QuestionnaireValidationFailedEvent(
        '192.168.1.1',
        ['Error'],
        {},
        new Date(),
      );

      expect(event.occurredAt).toBeDefined();
    });

    it('should allow accessing all properties', () => {
      const event = new QuestionnaireValidationFailedEvent(
        '10.0.0.1',
        ['Field missing: industry'],
        { userProfile: { role: 'hr' } },
        new Date(),
      );

      expect(event.submitterIP).toBe('10.0.0.1');
      expect(event.validationErrors).toContain('Field missing: industry');
      expect(event.submissionData.userProfile?.role).toBe('hr');
    });
  });
});
