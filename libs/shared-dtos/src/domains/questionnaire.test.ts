import { 
  Questionnaire, 
  QuestionnaireId, 
  QuestionnaireSubmission, 
  SubmissionQuality,
  UserProfile, 
  UserExperience, 
  BusinessValue,
  FeatureNeeds,
  OptionalInfo,
  SubmissionMetadata,
  QuestionnaireStatus,
  QuestionnaireValidationResult,
  QualityScore,
  RawSubmissionData
} from './questionnaire.dto';

import { QuestionnaireRules } from './questionnaire.rules';
import { 
  QuestionnaireDomainService, 
  QuestionnaireSubmissionResult,
  SubmissionTrendsAnalysis,
  IPSubmissionCheckResult 
} from './questionnaire.service';

describe('Agent-3: Questionnaire Domain Entity Tests', () => {
  
  // Test Data
  const mockRawData: RawSubmissionData = {
    userProfile: {
      role: 'hr',
      industry: 'Technology',
      companySize: 'medium',
      location: 'Beijing'
    },
    userExperience: {
      overallSatisfaction: 4,
      accuracyRating: 4,
      speedRating: 3,
      uiRating: 4,
      mostUsefulFeature: 'Resume parsing accuracy',
      mainPainPoint: 'Manual screening takes too much time and is prone to human error',
      improvementSuggestion: 'Better integration with existing ATS systems would help'
    },
    businessValue: {
      currentScreeningMethod: 'hybrid',
      timeSpentPerResume: 15,
      resumesPerWeek: 50,
      timeSavingPercentage: 60,
      willingnessToPayMonthly: 100,
      recommendLikelihood: 4
    },
    featureNeeds: {
      priorityFeatures: ['batch processing', 'custom scoring'],
      integrationNeeds: ['ATS integration', 'Email notifications']
    },
    optional: {
      additionalFeedback: 'Overall great product, would recommend to other HR professionals',
      contactPreference: 'email'
    }
  };

  const mockMetadata: SubmissionMetadata = new SubmissionMetadata({
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: new Date()
  });

  const mockInvalidData: RawSubmissionData = {
    // Minimal invalid data to trigger validation failures
    userProfile: undefined,
    userExperience: undefined,
    businessValue: undefined
  };

  describe('1. Questionnaire Aggregate Creation', () => {
    it('should create questionnaire with valid data', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      
      expect(questionnaire).toBeDefined();
      expect(questionnaire.getId().getValue()).toMatch(/^quest_/);
      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.SUBMITTED);
      expect(questionnaire.getSubmitterIP()).toBe('192.168.1.100');
    });

    it('should generate unique IDs for questionnaires', () => {
      const q1 = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const q2 = Questionnaire.create('template_1', mockRawData, mockMetadata);
      
      expect(q1.getId().getValue()).not.toBe(q2.getId().getValue());
    });

    it('should publish domain events on creation', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const events = questionnaire.getUncommittedEvents();
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].constructor.name).toBe('QuestionnaireSubmittedEvent');
    });
  });

  describe('2. Validation Rules', () => {
    it('should validate complete submission successfully', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const result = questionnaire.validateSubmission();
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail validation for incomplete submission', () => {
      const questionnaire = Questionnaire.create('template_1', mockInvalidData, mockMetadata);
      const result = questionnaire.validateSubmission();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('required'))).toBe(true);
    });

    it('should validate individual business rules', () => {
      const submission = QuestionnaireSubmission.fromRawData(mockRawData);
      
      expect(QuestionnaireRules.isValidRating(4)).toBe(true);
      expect(QuestionnaireRules.isValidRating(0)).toBe(false);
      expect(QuestionnaireRules.isValidRating(6)).toBe(false);
    });
  });

  describe('3. Quality Assessment', () => {
    it('should calculate quality score correctly', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const qualityScore = questionnaire.calculateQualityScore();
      
      expect(qualityScore.value).toBeGreaterThan(0);
      expect(qualityScore.value).toBeLessThanOrEqual(100);
    });

    it('should identify high-quality submissions', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const qualityScore = questionnaire.calculateQualityScore();
      
      // Our mock data should produce a high-quality score
      expect(qualityScore.value).toBeGreaterThan(70);
    });

    it('should determine bonus eligibility correctly', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const isEligible = questionnaire.isEligibleForBonus();
      
      // Mock data has sufficient quality for bonus
      expect(isEligible).toBe(true);
    });

    it('should calculate quality based on completion, text quality, and business value', () => {
      const submission = QuestionnaireSubmission.fromRawData(mockRawData);
      const quality = SubmissionQuality.calculate(submission);
      
      expect(quality.getQualityScore()).toBeGreaterThan(0);
      expect(quality.getTotalTextLength()).toBeGreaterThan(50);
      expect(quality.hasDetailedFeedback()).toBe(true);
    });
  });

  describe('4. Business Rules Validation', () => {
    it('should enforce minimum text length for bonus', () => {
      const shortTextData = { ...mockRawData };
      shortTextData.userExperience = {
        ...mockRawData.userExperience!,
        mainPainPoint: 'Short',
        improvementSuggestion: 'Also short'
      };
      shortTextData.optional = { additionalFeedback: 'Brief' };
      
      const submission = QuestionnaireSubmission.fromRawData(shortTextData);
      const quality = SubmissionQuality.calculate(submission);
      
      expect(quality.isBonusEligible()).toBe(false);
    });

    it('should require minimum completion rate', () => {
      const incompleteData = {
        userProfile: { role: 'hr' as const },
        // Missing other required sections
      };
      
      const submission = QuestionnaireSubmission.fromRawData(incompleteData);
      const quality = SubmissionQuality.calculate(submission);
      
      expect(quality.isBonusEligible()).toBe(false);
    });

    it('should validate business value thresholds', () => {
      const lowValueData = { ...mockRawData };
      lowValueData.businessValue = {
        ...mockRawData.businessValue!,
        willingnessToPayMonthly: 0,
        recommendLikelihood: 1
      };
      
      const questionnaire = Questionnaire.create('template_1', lowValueData, mockMetadata);
      const qualityScore = questionnaire.calculateQualityScore();
      
      // Should still get some score but lower due to low business value
      expect(qualityScore.value).toBeLessThan(80);
    });
  });

  describe('5. Status Transitions', () => {
    it('should handle status transitions correctly', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      
      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.SUBMITTED);
      
      questionnaire.markAsProcessed();
      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.PROCESSED);
      
      questionnaire.markAsRewarded();
      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.REWARDED);
    });

    it('should allow marking as low quality', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      
      questionnaire.flagAsLowQuality();
      expect(questionnaire.getStatus()).toBe(QuestionnaireStatus.LOW_QUALITY);
    });
  });

  describe('6. Domain Events', () => {
    it('should publish high-quality submission events', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const events = questionnaire.getUncommittedEvents();
      
      const highQualityEvent = events.find(e => e.constructor.name === 'HighQualitySubmissionEvent');
      expect(highQualityEvent).toBeDefined();
    });

    it('should manage event lifecycle correctly', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      
      expect(questionnaire.getUncommittedEvents().length).toBeGreaterThan(0);
      
      questionnaire.markEventsAsCommitted();
      expect(questionnaire.getUncommittedEvents().length).toBe(0);
    });
  });

  describe('7. Value Objects', () => {
    it('should create UserProfile value object correctly', () => {
      const profile = new UserProfile({
        role: 'hr',
        industry: 'Technology',
        companySize: 'medium',
        location: 'Beijing'
      });
      
      // Test via submission processing instead of direct prop access
      expect(profile).toBeDefined();
      expect(profile.equals(profile)).toBe(true);
    });

    it('should create BusinessValue value object correctly', () => {
      const businessValue = new BusinessValue({
        currentScreeningMethod: 'hybrid',
        timeSpentPerResume: 15,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 100,
        recommendLikelihood: 4
      });
      
      expect(businessValue).toBeDefined();
      expect(businessValue.equals(businessValue)).toBe(true);
    });

    it('should handle optional information correctly', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback: 'Great product',
        contactPreference: 'email'
      });
      
      expect(optionalInfo).toBeDefined();
      expect(optionalInfo.equals(optionalInfo)).toBe(true);
    });
  });

  describe('8. Questionnaire Submission Processing', () => {
    it('should process complete submission data', () => {
      const submission = QuestionnaireSubmission.fromRawData(mockRawData);
      const summary = submission.getSummary();
      
      // Test through well-defined public interface with getters
      expect(summary).toBeDefined();
      expect(summary.role).toBe('hr');
      expect(summary.industry).toBe('Technology');
      expect(summary.overallSatisfaction).toBe(4);
      expect(summary.willingnessToPayMonthly).toBe(100);
      expect(summary.textLength).toBeGreaterThan(0);
      expect(summary.completionRate).toBeGreaterThan(0.8);
    });

    it('should calculate text metrics correctly', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const textLength = questionnaire.getTotalTextLength();
      const hasDetailedFeedback = questionnaire.hasDetailedFeedback();
      
      expect(textLength).toBeGreaterThan(50);
      expect(hasDetailedFeedback).toBe(true);
    });

    it('should provide quality metrics', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const metrics = questionnaire.getQualityMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalTextLength).toBeGreaterThan(0);
      expect(metrics.qualityScore).toBeGreaterThan(0);
      expect(metrics.bonusEligible).toBeDefined();
    });
  });

  describe('9. Contract-based Programming', () => {
    it('should enforce preconditions in business logic', () => {
      expect(() => {
        QuestionnaireRules.isEligibleForBonus(-1, 100, 5);
      }).not.toThrow(); // Should handle negative quality score gracefully
      
      expect(() => {
        QuestionnaireRules.isEligibleForBonus(80, -1, 5);
      }).not.toThrow(); // Should handle negative text length gracefully
    });

    it('should validate postconditions in quality calculation', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      const qualityScore = questionnaire.calculateQualityScore();
      
      // Postcondition: Quality score should be 0-100
      expect(qualityScore.value).toBeGreaterThanOrEqual(0);
      expect(qualityScore.value).toBeLessThanOrEqual(100);
    });

    it('should maintain invariants in aggregate state', () => {
      const questionnaire = Questionnaire.create('template_1', mockRawData, mockMetadata);
      
      // Invariant: Questionnaire should always have valid ID
      expect(questionnaire.getId().getValue()).toMatch(/^quest_/);
      
      // Invariant: Metadata should be preserved
      expect(questionnaire.getSubmitterIP()).toBe(mockMetadata.ip);
    });
  });

  describe('10. Domain Service Integration', () => {
    // Mock implementations for testing
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIPAndDate: jest.fn().mockResolvedValue([]),
      findRecent: jest.fn().mockResolvedValue([])
    };

    const mockTemplateService = {
      getCurrentTemplate: jest.fn().mockResolvedValue({ id: 'template_1', version: '1.0' })
    };

    const mockEventBus = {
      publish: jest.fn()
    };

    const domainService = new QuestionnaireDomainService(
      mockRepository,
      mockTemplateService,
      mockEventBus
    );

    it('should create domain service successfully', () => {
      expect(domainService).toBeDefined();
    });

    it('should validate IP submission limits', async () => {
      const result = await domainService.validateIPSubmissionLimit('192.168.1.100');
      
      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should process successful submissions', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      
      const result = await domainService.submitQuestionnaire(mockRawData, mockMetadata);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.qualityScore).toBeGreaterThan(0);
    });

    it('should handle validation failures', async () => {
      const result = await domainService.submitQuestionnaire(mockInvalidData, mockMetadata);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should analyze submission trends', async () => {
      const mockSubmissions = [
        Questionnaire.create('template_1', mockRawData, mockMetadata)
      ];
      mockRepository.findRecent.mockResolvedValue(mockSubmissions);
      
      const trends = await domainService.analyzeSubmissionTrends();
      
      expect(trends.totalSubmissions).toBe(1);
      expect(trends.averageQualityScore).toBeGreaterThan(0);
      expect(trends.bonusEligibilityRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty trend analysis', async () => {
      mockRepository.findRecent.mockResolvedValue([]);
      
      const trends = await domainService.analyzeSubmissionTrends();
      
      expect(trends.totalSubmissions).toBe(0);
      expect(trends.averageQualityScore).toBe(0);
    });

    it('should block IP after daily limit', async () => {
      const existingSubmissions = [
        Questionnaire.create('template_1', mockRawData, mockMetadata)
      ];
      mockRepository.findByIPAndDate.mockResolvedValue(existingSubmissions);
      
      const result = await domainService.validateIPSubmissionLimit('192.168.1.100');
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('already submitted');
    });

    it('should handle service errors gracefully', async () => {
      mockRepository.save.mockRejectedValue(new Error('Database error'));
      
      const result = await domainService.submitQuestionnaire(mockRawData, mockMetadata);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred');
    });
  });

});