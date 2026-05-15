import { QuestionnaireContracts } from './questionnaire.contracts';
import type { RawSubmissionData } from '../dtos/questionnaire.dto';
import { SubmissionMetadata } from '../../domain/value-objects/submission-metadata.value-object';

describe('QuestionnaireContracts', () => {
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
      mostUsefulFeature: 'AI Screening',
      mainPainPoint: 'Resume parsing accuracy issues',
      improvementSuggestion: 'Better ATS integration',
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

  const createValidMetadata = (): SubmissionMetadata => {
    return SubmissionMetadata.restore({
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
    });
  };

  describe('submitQuestionnaire', () => {
    it('should throw error when rawData is null', () => {
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          null as unknown as RawSubmissionData,
          createValidMetadata(),
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should throw error when rawData is undefined', () => {
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          undefined as unknown as RawSubmissionData,
          createValidMetadata(),
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should throw error when rawData missing userProfile', () => {
      const invalidData: RawSubmissionData = {
        userExperience: { overallSatisfaction: 4 },
        businessValue: { currentScreeningMethod: 'ats' },
      };
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          invalidData,
          createValidMetadata(),
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should throw error when rawData missing userExperience', () => {
      const invalidData: RawSubmissionData = {
        userProfile: { role: 'hr', industry: 'Tech' },
        businessValue: { currentScreeningMethod: 'ats' },
      };
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          invalidData,
          createValidMetadata(),
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should throw error when rawData missing businessValue', () => {
      const invalidData: RawSubmissionData = {
        userProfile: { role: 'hr', industry: 'Tech' },
        userExperience: { overallSatisfaction: 4 },
      };
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          invalidData,
          createValidMetadata(),
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should throw error when metadata is null', () => {
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          createValidRawData(),
          null as unknown as SubmissionMetadata,
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should throw error when metadata has no IP', () => {
      const metadataWithoutIP = SubmissionMetadata.restore({
        ip: '',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      });
      expect(() =>
        QuestionnaireContracts.submitQuestionnaire(
          createValidRawData(),
          metadataWithoutIP,
        ),
      ).toThrow(
        'Submission must include required sections and metadata with IP',
      );
    });

    it('should return success result with valid data', () => {
      const result = QuestionnaireContracts.submitQuestionnaire(
        createValidRawData(),
        createValidMetadata(),
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.questionnaireId).toBe('quest_123');
      expect(result.data?.qualityScore).toBe(85);
      expect(result.data?.bonusEligible).toBe(true);
    });
  });

  describe('validateIPSubmissionLimit', () => {
    it('should throw error for null IP', () => {
      expect(() =>
        QuestionnaireContracts.validateIPSubmissionLimit(
          null as unknown as string,
        ),
      ).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error for empty IP', () => {
      expect(() =>
        QuestionnaireContracts.validateIPSubmissionLimit(''),
      ).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error for invalid IP format', () => {
      expect(() =>
        QuestionnaireContracts.validateIPSubmissionLimit('invalid-ip'),
      ).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error for IP with wrong segment count', () => {
      expect(() =>
        QuestionnaireContracts.validateIPSubmissionLimit('192.168.1'),
      ).toThrow('IP address must be valid IPv4 format');
    });

    it('should throw error for IP with non-numeric segments', () => {
      expect(() =>
        QuestionnaireContracts.validateIPSubmissionLimit('192.168.1.abc'),
      ).toThrow('IP address must be valid IPv4 format');
    });

    it('should return allowed result for valid IP', () => {
      const result =
        QuestionnaireContracts.validateIPSubmissionLimit('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should return allowed result for another valid IP', () => {
      const result =
        QuestionnaireContracts.validateIPSubmissionLimit('10.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });
  });
});
