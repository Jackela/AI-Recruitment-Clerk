import { QuestionnaireDomainService } from './questionnaire.service';
import type { Questionnaire } from './questionnaire.dto';
import { QuestionnaireValidationFailedEvent } from './questionnaire-events.dto';
import { SubmissionMetadata } from './questionnaire-value-objects.dto';
import type {
  IQuestionnaireRepository,
  IQuestionnaireTemplateService,
  IDomainEventBus,
} from './questionnaire.service';

// Mocks
const mockRepository: jest.Mocked<IQuestionnaireRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByIPAndDate: jest.fn(),
  findRecent: jest.fn(),
};

const mockTemplateService: jest.Mocked<IQuestionnaireTemplateService> = {
  getCurrentTemplate: jest.fn(),
};

const mockEventBus: jest.Mocked<IDomainEventBus> = {
  publish: jest.fn(),
};

describe('QuestionnaireDomainService', () => {
  let service: QuestionnaireDomainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuestionnaireDomainService(
      mockRepository,
      mockTemplateService,
      mockEventBus,
    );
  });

  describe('submitQuestionnaire', () => {
    const mockRawData = {
      userProfile: {
        role: 'hr' as const,
        industry: 'Technology',
        companySize: 'medium' as const,
        location: 'Beijing',
      },
      userExperience: {
        overallSatisfaction: 4 as const,
        accuracyRating: 4 as const,
        speedRating: 4 as const,
        uiRating: 4 as const,
        mostUsefulFeature: 'Resume parsing',
        mainPainPoint: 'Time-consuming manual screening process',
        improvementSuggestion: 'Better AI matching algorithm',
      },
      businessValue: {
        currentScreeningMethod: 'ats' as const,
        timeSpentPerResume: 10,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 100,
        recommendLikelihood: 4 as const,
      },
      featureNeeds: {
        priorityFeatures: ['AI matching', 'Resume parsing'],
        integrationNeeds: ['ATS integration'],
      },
      optional: {
        additionalFeedback:
          'Great product overall, looking forward to new features',
        contactPreference: 'email',
      },
    };

    const mockMetadata = new SubmissionMetadata({
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
    });

    it('should submit questionnaire successfully', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.submitQuestionnaire(
        mockRawData,
        mockMetadata,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.questionnaireId).toBeDefined();
      expect(result.data?.qualityScore).toBeGreaterThanOrEqual(0);
      expect(typeof result.data?.bonusEligible).toBe('boolean');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when validation fails', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      const invalidData = {
        ...mockRawData,
        userProfile: {
          ...mockRawData.userProfile,
          role: undefined as any,
        },
      };

      const result = await service.submitQuestionnaire(
        invalidData,
        mockMetadata,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should calculate quality score correctly', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.submitQuestionnaire(
        mockRawData,
        mockMetadata,
      );

      expect(result.success).toBe(true);
      expect(result.data?.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.data?.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should determine bonus eligibility', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.submitQuestionnaire(
        mockRawData,
        mockMetadata,
      );

      expect(result.success).toBe(true);
      expect(typeof result.data?.bonusEligible).toBe('boolean');
    });

    it('should handle template service errors', async () => {
      mockTemplateService.getCurrentTemplate.mockRejectedValue(
        new Error('Template error'),
      );

      const result = await service.submitQuestionnaire(
        mockRawData,
        mockMetadata,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred');
    });

    it('should handle repository save errors', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await service.submitQuestionnaire(
        mockRawData,
        mockMetadata,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred');
    });

    it('should handle missing optional fields', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      const dataWithoutOptional = {
        userProfile: mockRawData.userProfile,
        userExperience: mockRawData.userExperience,
        businessValue: mockRawData.businessValue,
        featureNeeds: mockRawData.featureNeeds,
      };

      const result = await service.submitQuestionnaire(
        dataWithoutOptional,
        mockMetadata,
      );

      expect(result.success).toBe(true);
    });

    it('should publish validation failed event on validation errors', async () => {
      mockTemplateService.getCurrentTemplate.mockResolvedValue({
        id: 'template-123',
        version: '1.0',
      });
      mockEventBus.publish.mockResolvedValue(undefined);

      const invalidData = {
        userProfile: {
          role: undefined as any,
          industry: '',
        },
        userExperience: {
          overallSatisfaction: undefined as any,
        },
        businessValue: {
          currentScreeningMethod: undefined as any,
          willingnessToPayMonthly: -10,
        },
        featureNeeds: {
          priorityFeatures: [],
        },
      };

      await service.submitQuestionnaire(invalidData, mockMetadata);

      expect(mockEventBus.publish).toHaveBeenCalled();
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(QuestionnaireValidationFailedEvent);
    });
  });

  describe('analyzeSubmissionTrends', () => {
    it('should analyze submission trends successfully', async () => {
      const mockSubmissions = [
        createMockQuestionnaire(85, true, 100),
        createMockQuestionnaire(75, false, 80),
        createMockQuestionnaire(90, true, 150),
      ];

      mockRepository.findRecent.mockResolvedValue(mockSubmissions);

      const result = await service.analyzeSubmissionTrends();

      expect(result.totalSubmissions).toBe(3);
      expect(result.averageQualityScore).toBeGreaterThan(0);
      expect(result.bonusEligibilityRate).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.topPainPoints)).toBe(true);
      expect(result.averageWillingnessToPay).toBeGreaterThan(0);
      expect(result.userSegmentation).toBeDefined();
    });

    it('should return empty analysis when no submissions', async () => {
      mockRepository.findRecent.mockResolvedValue([]);

      const result = await service.analyzeSubmissionTrends();

      expect(result.totalSubmissions).toBe(0);
      expect(result.averageQualityScore).toBe(0);
      expect(result.bonusEligibilityRate).toBe(0);
      expect(result.topPainPoints).toEqual([]);
      expect(result.averageWillingnessToPay).toBe(0);
    });

    it('should calculate average quality score correctly', async () => {
      const mockSubmissions = [
        createMockQuestionnaire(80, false, 100),
        createMockQuestionnaire(90, true, 100),
      ];

      mockRepository.findRecent.mockResolvedValue(mockSubmissions);

      const result = await service.analyzeSubmissionTrends();

      expect(result.averageQualityScore).toBe(85);
    });

    it('should calculate bonus eligibility rate correctly', async () => {
      const mockSubmissions = [
        createMockQuestionnaire(80, true, 100),
        createMockQuestionnaire(60, false, 100),
        createMockQuestionnaire(90, true, 100),
      ];

      mockRepository.findRecent.mockResolvedValue(mockSubmissions);

      const result = await service.analyzeSubmissionTrends();

      expect(result.bonusEligibilityRate).toBeCloseTo(66.67, 1);
    });

    it('should segment users by role', async () => {
      const mockSubmissions = [
        createMockQuestionnaire(80, false, 100, 'hr'),
        createMockQuestionnaire(90, true, 100, 'recruiter'),
        createMockQuestionnaire(85, true, 100, 'hr'),
      ];

      mockRepository.findRecent.mockResolvedValue(mockSubmissions);

      const result = await service.analyzeSubmissionTrends();

      expect(result.userSegmentation.data.byRole['hr']).toBe(2);
      expect(result.userSegmentation.data.byRole['recruiter']).toBe(1);
    });

    it('should segment users by satisfaction', async () => {
      const mockSubmissions = [
        createMockQuestionnaireWithSatisfaction(80, false, 100, 5),
        createMockQuestionnaireWithSatisfaction(70, false, 100, 3),
        createMockQuestionnaireWithSatisfaction(60, false, 100, 2),
      ];

      mockRepository.findRecent.mockResolvedValue(mockSubmissions);

      const result = await service.analyzeSubmissionTrends();

      expect(result.userSegmentation.data.bySatisfaction.high).toBe(1);
      expect(result.userSegmentation.data.bySatisfaction.medium).toBe(1);
      expect(result.userSegmentation.data.bySatisfaction.low).toBe(1);
    });

    it('should handle repository errors', async () => {
      mockRepository.findRecent.mockRejectedValue(new Error('Database error'));

      await expect(service.analyzeSubmissionTrends()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('validateIPSubmissionLimit', () => {
    const mockIP = '192.168.1.1';

    it('should allow submission when under limit', async () => {
      mockRepository.findByIPAndDate.mockResolvedValue([]);

      const result = await service.validateIPSubmissionLimit(mockIP);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should block submission when limit reached', async () => {
      const existingSubmissions = [createMockQuestionnaire(80, false, 100)];
      mockRepository.findByIPAndDate.mockResolvedValue(existingSubmissions);

      const result = await service.validateIPSubmissionLimit(mockIP);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain(mockIP);
    });

    it('should block submission when over limit', async () => {
      const existingSubmissions = [
        createMockQuestionnaire(80, false, 100),
        createMockQuestionnaire(90, true, 100),
      ];
      mockRepository.findByIPAndDate.mockResolvedValue(existingSubmissions);

      const result = await service.validateIPSubmissionLimit(mockIP);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should use current date for validation', async () => {
      mockRepository.findByIPAndDate.mockResolvedValue([]);

      await service.validateIPSubmissionLimit(mockIP);

      expect(mockRepository.findByIPAndDate).toHaveBeenCalledWith(
        mockIP,
        expect.any(Date),
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findByIPAndDate.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.validateIPSubmissionLimit(mockIP)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('QuestionnaireSubmissionResult', () => {
    it('should create success result', () => {
      const data = {
        questionnaireId: 'q-123',
        qualityScore: 85,
        bonusEligible: true,
        summary: { test: true },
      };

      const result = QuestionnaireSubmissionResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.errors).toBeUndefined();
    });

    it('should create failed result', () => {
      const errors = ['Validation failed', 'Required field missing'];

      const result = QuestionnaireSubmissionResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
      expect(result.data).toBeUndefined();
    });
  });

  describe('SubmissionTrendsAnalysis', () => {
    it('should create analysis with data', () => {
      const data = {
        totalSubmissions: 100,
        averageQualityScore: 75.5,
        bonusEligibilityRate: 60,
        topPainPoints: ['Point 1', 'Point 2'],
        averageWillingnessToPay: 120,
        userSegmentation: new (class {
          data = {
            byRole: {},
            byIndustry: {},
            bySatisfaction: { high: 0, medium: 0, low: 0 },
          };
        })(),
      };

      const analysis = SubmissionTrendsAnalysis.create(data);

      expect(analysis.totalSubmissions).toBe(100);
      expect(analysis.averageQualityScore).toBe(75.5);
      expect(analysis.bonusEligibilityRate).toBe(60);
    });

    it('should create empty analysis', () => {
      const analysis = SubmissionTrendsAnalysis.empty();

      expect(analysis.totalSubmissions).toBe(0);
      expect(analysis.averageQualityScore).toBe(0);
      expect(analysis.bonusEligibilityRate).toBe(0);
      expect(analysis.topPainPoints).toEqual([]);
      expect(analysis.averageWillingnessToPay).toBe(0);
    });
  });

  describe('IPSubmissionCheckResult', () => {
    it('should create allowed result', () => {
      const result = IPSubmissionCheckResult.allowed();

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should create blocked result with reason', () => {
      const reason = 'Limit reached';
      const result = IPSubmissionCheckResult.blocked(reason);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe(reason);
    });
  });
});

// Import result classes from the service file
import {
  QuestionnaireSubmissionResult,
  SubmissionTrendsAnalysis,
  IPSubmissionCheckResult,
} from './questionnaire.service';

// Helper functions
function createMockQuestionnaire(
  qualityScore: number,
  bonusEligible: boolean,
  willingnessToPay: number,
  role = 'hr',
): Questionnaire {
  return {
    calculateQualityScore: jest.fn().mockReturnValue({ value: qualityScore }),
    isEligibleForBonus: jest.fn().mockReturnValue(bonusEligible),
    getSubmissionSummary: jest.fn().mockReturnValue({
      willingnessToPayMonthly: willingnessToPay,
      role,
      industry: 'Technology',
      overallSatisfaction: 4,
    }),
    getId: jest.fn().mockReturnValue({ getValue: () => `q-${Math.random()}` }),
    getUncommittedEvents: jest.fn().mockReturnValue([]),
    markEventsAsCommitted: jest.fn(),
    validateSubmission: jest
      .fn()
      .mockReturnValue({ isValid: true, errors: [] }),
  } as unknown as Questionnaire;
}

function createMockQuestionnaireWithSatisfaction(
  qualityScore: number,
  bonusEligible: boolean,
  willingnessToPay: number,
  satisfaction: number,
): Questionnaire {
  return {
    calculateQualityScore: jest.fn().mockReturnValue({ value: qualityScore }),
    isEligibleForBonus: jest.fn().mockReturnValue(bonusEligible),
    getSubmissionSummary: jest.fn().mockReturnValue({
      willingnessToPayMonthly: willingnessToPay,
      role: 'hr',
      industry: 'Technology',
      overallSatisfaction: satisfaction,
    }),
    getId: jest.fn().mockReturnValue({ getValue: () => `q-${Math.random()}` }),
    getUncommittedEvents: jest.fn().mockReturnValue([]),
    markEventsAsCommitted: jest.fn(),
    validateSubmission: jest
      .fn()
      .mockReturnValue({ isValid: true, errors: [] }),
  } as unknown as Questionnaire;
}
