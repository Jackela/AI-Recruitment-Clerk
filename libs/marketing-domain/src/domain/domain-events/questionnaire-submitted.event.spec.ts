import { QuestionnaireSubmittedEvent } from './questionnaire-submitted.event';
import type { SubmissionSummary } from '../value-objects/submission-summary.value-object';

describe('QuestionnaireSubmittedEvent', () => {
  const createMockSubmissionSummary = (): SubmissionSummary => {
    return {
      role: 'hr',
      industry: 'Technology',
      companySize: 'medium',
      location: 'Beijing',
      overallSatisfaction: 4,
      accuracyRating: 5,
      speedRating: 4,
      uiRating: 5,
      mostUsefulFeature: 'AI Screening',
      currentScreeningMethod: 'ats',
      timeSavingPercentage: 60,
      willingnessToPayMonthly: 100,
      recommendLikelihood: 4,
      completionRate: 0.95,
      textLength: 300,
      detailedAnswers: 3,
    } as unknown as SubmissionSummary;
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const questionnaireId = 'quest_123';
      const submitterIP = '192.168.1.1';
      const qualityScore = 85;
      const bonusEligible = true;
      const submissionData = createMockSubmissionSummary();
      const occurredAt = new Date();

      const event = new QuestionnaireSubmittedEvent(
        questionnaireId,
        submitterIP,
        qualityScore,
        bonusEligible,
        submissionData,
        occurredAt,
      );

      expect(event.questionnaireId).toBe(questionnaireId);
      expect(event.submitterIP).toBe(submitterIP);
      expect(event.qualityScore).toBe(qualityScore);
      expect(event.bonusEligible).toBe(bonusEligible);
      expect(event.submissionData).toBe(submissionData);
      expect(event.occurredAt).toBe(occurredAt);
    });

    it('should have occurredAt as Date', () => {
      const occurredAt = new Date();
      const event = new QuestionnaireSubmittedEvent(
        'quest_123',
        '192.168.1.1',
        85,
        true,
        createMockSubmissionSummary(),
        occurredAt,
      );

      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('DomainEvent compliance', () => {
    it('should implement DomainEvent interface', () => {
      const event = new QuestionnaireSubmittedEvent(
        'quest_123',
        '192.168.1.1',
        85,
        true,
        createMockSubmissionSummary(),
        new Date(),
      );

      expect(event.occurredAt).toBeDefined();
    });

    it('should allow accessing all properties', () => {
      const event = new QuestionnaireSubmittedEvent(
        'quest_456',
        '10.0.0.1',
        92,
        false,
        createMockSubmissionSummary(),
        new Date(),
      );

      expect(event.questionnaireId).toBe('quest_456');
      expect(event.submitterIP).toBe('10.0.0.1');
      expect(event.qualityScore).toBe(92);
      expect(event.bonusEligible).toBe(false);
    });
  });
});
