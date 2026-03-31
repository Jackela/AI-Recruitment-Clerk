import type {
  IQuestionnaireRepository,
  IQuestionnaireTemplateService,
  IDomainEventBus} from './questionnaire.domain-service.js';
import {
  QuestionnaireDomainService,
  QuestionnaireSubmissionResult,
  SubmissionTrendsAnalysis,
  IPSubmissionCheckResult,
  UserSegmentation
} from './questionnaire.domain-service.js';
import { Questionnaire } from '../aggregates/questionnaire.aggregate.js';
import { SubmissionMetadata } from '../value-objects/submission-metadata.value-object.js';
import type { RawSubmissionData } from '../../application/dtos/questionnaire.dto.js';

describe('QuestionnaireDomainService', () => {
  let mockRepository: jest.Mocked<IQuestionnaireRepository>;
  let mockTemplateService: jest.Mocked<IQuestionnaireTemplateService>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;
  let service: QuestionnaireDomainService;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findByIPAndDate: jest.fn().mockResolvedValue([]),
      findRecent: jest.fn().mockResolvedValue([]),
    };

    mockTemplateService = {
      getCurrentTemplate: jest
        .fn()
        .mockResolvedValue({ id: 'template-1', version: '1.0' }),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    service = new QuestionnaireDomainService(
      mockRepository,
      mockTemplateService,
      mockEventBus,
    );
  });

  describe('submitQuestionnaire', () => {
    const validRawData: RawSubmissionData = {
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
        mainPainPoint: 'Slow processing',
        improvementSuggestion: 'Better UI',
      },
      businessValue: {
        currentScreeningMethod: 'ats',
        timeSpentPerResume: 5,
        resumesPerWeek: 50,
        timeSavingPercentage: 60,
        willingnessToPayMonthly: 100,
        recommendLikelihood: 4,
      },
    };

    const mockMetadata = new SubmissionMetadata({
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
    });

    it('should successfully submit questionnaire', async () => {
      const result = await service.submitQuestionnaire(
        validRawData,
        mockMetadata,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.questionnaireId).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should save questionnaire to repository', async () => {
      await service.submitQuestionnaire(validRawData, mockMetadata);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.any(Questionnaire),
      );
    });

    it('should publish events to event bus', async () => {
      await service.submitQuestionnaire(validRawData, mockMetadata);

      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should return quality score in result', async () => {
      const result = await service.submitQuestionnaire(
        validRawData,
        mockMetadata,
      );

      expect(result.data?.qualityScore).toBeDefined();
      expect(typeof result.data?.qualityScore).toBe('number');
    });

    it('should return bonus eligibility in result', async () => {
      const result = await service.submitQuestionnaire(
        validRawData,
        mockMetadata,
      );

      expect(typeof result.data?.bonusEligible).toBe('boolean');
    });

    it('should return submission summary in result', async () => {
      const result = await service.submitQuestionnaire(
        validRawData,
        mockMetadata,
      );

      expect(result.data?.summary).toBeDefined();
    });

    it('should handle validation failure', async () => {
      const invalidData: RawSubmissionData = {
        userProfile: { role: 'other', industry: '' },
        userExperience: { overallSatisfaction: 1 },
        businessValue: { willingnessToPayMonthly: 0 },
      };

      const result = await service.submitQuestionnaire(
        invalidData,
        mockMetadata,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should publish validation failed event for invalid submission', async () => {
      const invalidData: RawSubmissionData = {
        userProfile: { role: 'other', industry: '' },
        userExperience: { overallSatisfaction: 1 },
        businessValue: { willingnessToPayMonthly: 0 },
      };

      await service.submitQuestionnaire(invalidData, mockMetadata);

      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should handle internal errors gracefully', async () => {
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await service.submitQuestionnaire(
        validRawData,
        mockMetadata,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal error occurred');
    });

    it('should fetch current template from template service', async () => {
      await service.submitQuestionnaire(validRawData, mockMetadata);

      expect(mockTemplateService.getCurrentTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeSubmissionTrends', () => {
    it('should return empty analysis when no submissions', async () => {
      mockRepository.findRecent.mockResolvedValue([]);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis).toBeInstanceOf(SubmissionTrendsAnalysis);
      expect(analysis.totalSubmissions).toBe(0);
    });

    it('should calculate total submissions', async () => {
      const mockQuestionnaires = [
        createMockQuestionnaire({ qualityScore: 80 }),
        createMockQuestionnaire({ qualityScore: 90 }),
        createMockQuestionnaire({ qualityScore: 70 }),
      ];
      mockRepository.findRecent.mockResolvedValue(mockQuestionnaires);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis.totalSubmissions).toBe(3);
    });

    it('should calculate average quality score', async () => {
      const mockQuestionnaires = [
        createMockQuestionnaire({ qualityScore: 80, wtp: 100 }),
        createMockQuestionnaire({ qualityScore: 90, wtp: 150 }),
      ];
      mockRepository.findRecent.mockResolvedValue(mockQuestionnaires);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis.averageQualityScore).toBe(85);
    });

    it('should calculate bonus eligibility rate', async () => {
      const mockQuestionnaires = [
        createMockQuestionnaire({ qualityScore: 80, eligible: true, wtp: 100 }),
        createMockQuestionnaire({ qualityScore: 60, eligible: false, wtp: 50 }),
      ];
      mockRepository.findRecent.mockResolvedValue(mockQuestionnaires);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis.bonusEligibilityRate).toBe(50);
    });

    it('should include top pain points', async () => {
      mockRepository.findRecent.mockResolvedValue([
        createMockQuestionnaire({}),
      ]);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis.topPainPoints).toBeInstanceOf(Array);
      expect(analysis.topPainPoints.length).toBeGreaterThan(0);
    });

    it('should calculate average willingness to pay', async () => {
      const mockQuestionnaires = [
        createMockQuestionnaire({ wtp: 100 }),
        createMockQuestionnaire({ wtp: 200 }),
        createMockQuestionnaire({ wtp: 300 }),
      ];
      mockRepository.findRecent.mockResolvedValue(mockQuestionnaires);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis.averageWillingnessToPay).toBe(200);
    });

    it('should include user segmentation', async () => {
      const mockQuestionnaires = [
        createMockQuestionnaire({
          role: 'hr',
          industry: 'Tech',
          satisfaction: 5,
        }),
        createMockQuestionnaire({
          role: 'manager',
          industry: 'Finance',
          satisfaction: 4,
        }),
      ];
      mockRepository.findRecent.mockResolvedValue(mockQuestionnaires);

      const analysis = await service.analyzeSubmissionTrends();

      expect(analysis.userSegmentation).toBeInstanceOf(UserSegmentation);
      expect(analysis.userSegmentation.data.byRole).toBeDefined();
      expect(analysis.userSegmentation.data.byIndustry).toBeDefined();
      expect(analysis.userSegmentation.data.bySatisfaction).toBeDefined();
    });

    it('should call findRecent with 30 days', async () => {
      mockRepository.findRecent.mockResolvedValue([]);

      await service.analyzeSubmissionTrends();

      expect(mockRepository.findRecent).toHaveBeenCalledWith(30);
    });
  });

  describe('validateIPSubmissionLimit', () => {
    it('should allow submission for IP with no submissions today', async () => {
      mockRepository.findByIPAndDate.mockResolvedValue([]);

      const result = await service.validateIPSubmissionLimit('192.168.1.1');

      expect(result).toBeInstanceOf(IPSubmissionCheckResult);
      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should block submission for IP with existing submission today', async () => {
      const mockQuestionnaire = createMockQuestionnaire({});
      mockRepository.findByIPAndDate.mockResolvedValue([mockQuestionnaire]);

      const result = await service.validateIPSubmissionLimit('192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('already submitted');
    });

    it('should include IP in blocked reason', async () => {
      const mockQuestionnaire = createMockQuestionnaire({});
      mockRepository.findByIPAndDate.mockResolvedValue([mockQuestionnaire]);

      const result = await service.validateIPSubmissionLimit('10.0.0.1');

      expect(result.reason).toContain('10.0.0.1');
    });

    it('should call findByIPAndDate with correct parameters', async () => {
      mockRepository.findByIPAndDate.mockResolvedValue([]);

      await service.validateIPSubmissionLimit('192.168.1.1');

      expect(mockRepository.findByIPAndDate).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.any(Date),
      );
    });
  });
});

// Helper function to create mock Questionnaires
function createMockQuestionnaire(options: {
  qualityScore?: number;
  eligible?: boolean;
  wtp?: number;
  role?: string;
  industry?: string;
  satisfaction?: number;
}): Questionnaire {
  const {
    qualityScore = 80,
    eligible = true,
    wtp = 100,
    role = 'hr',
    industry = 'Technology',
    satisfaction = 4,
  } = options;

  return {
    calculateQualityScore: () => ({ value: qualityScore }) as any,
    isEligibleForBonus: () => eligible,
    getSubmissionSummary: () =>
      ({
        willingnessToPayMonthly: wtp,
        role,
        industry,
        overallSatisfaction: satisfaction,
      }) as any,
  } as Questionnaire;
}

describe('QuestionnaireSubmissionResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const data = {
        questionnaireId: 'quest_123',
        qualityScore: 85,
        bonusEligible: true,
        summary: { role: 'hr', industry: 'Tech' },
      };

      const result = QuestionnaireSubmissionResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.errors).toBeUndefined();
    });

    it('should create success result with different data', () => {
      const data = {
        questionnaireId: 'quest_456',
        qualityScore: 60,
        bonusEligible: false,
        summary: { role: 'manager', industry: 'Finance' },
      };

      const result = QuestionnaireSubmissionResult.success(data);

      expect(result.data?.qualityScore).toBe(60);
      expect(result.data?.bonusEligible).toBe(false);
    });
  });

  describe('failed', () => {
    it('should create failed result with errors', () => {
      const errors = ['Role is required', 'Invalid rating'];

      const result = QuestionnaireSubmissionResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
      expect(result.data).toBeUndefined();
    });

    it('should create failed result with single error', () => {
      const result = QuestionnaireSubmissionResult.failed([
        'Validation failed',
      ]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toBe('Validation failed');
    });

    it('should create failed result with empty errors', () => {
      const result = QuestionnaireSubmissionResult.failed([]);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([]);
    });
  });
});

describe('SubmissionTrendsAnalysis', () => {
  describe('create', () => {
    it('should create analysis with all data', () => {
      const data = {
        totalSubmissions: 100,
        averageQualityScore: 75.5,
        bonusEligibilityRate: 60,
        topPainPoints: ['Slow processing', 'Poor UI'],
        averageWillingnessToPay: 150,
        userSegmentation: new UserSegmentation({
          byRole: { hr: 50, manager: 30 },
          byIndustry: { tech: 60, finance: 20 },
          bySatisfaction: { high: 70, medium: 20, low: 10 },
        }),
      };

      const analysis = SubmissionTrendsAnalysis.create(data);

      expect(analysis).toBeInstanceOf(SubmissionTrendsAnalysis);
      expect(analysis.totalSubmissions).toBe(100);
      expect(analysis.averageQualityScore).toBe(75.5);
      expect(analysis.bonusEligibilityRate).toBe(60);
      expect(analysis.topPainPoints).toEqual(['Slow processing', 'Poor UI']);
      expect(analysis.averageWillingnessToPay).toBe(150);
    });

    it('should handle zero values', () => {
      const data = {
        totalSubmissions: 0,
        averageQualityScore: 0,
        bonusEligibilityRate: 0,
        topPainPoints: [],
        averageWillingnessToPay: 0,
        userSegmentation: new UserSegmentation({
          byRole: {},
          byIndustry: {},
          bySatisfaction: { high: 0, medium: 0, low: 0 },
        }),
      };

      const analysis = SubmissionTrendsAnalysis.create(data);

      expect(analysis.totalSubmissions).toBe(0);
    });
  });

  describe('empty', () => {
    it('should create empty analysis', () => {
      const analysis = SubmissionTrendsAnalysis.empty();

      expect(analysis.totalSubmissions).toBe(0);
      expect(analysis.averageQualityScore).toBe(0);
      expect(analysis.bonusEligibilityRate).toBe(0);
      expect(analysis.topPainPoints).toEqual([]);
      expect(analysis.averageWillingnessToPay).toBe(0);
      expect(analysis.userSegmentation.data.bySatisfaction).toEqual({
        high: 0,
        medium: 0,
        low: 0,
      });
    });
  });
});

describe('IPSubmissionCheckResult', () => {
  describe('allowed', () => {
    it('should create allowed result', () => {
      const result = IPSubmissionCheckResult.allowed();

      expect(result).toBeInstanceOf(IPSubmissionCheckResult);
      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('blocked', () => {
    it('should create blocked result with reason', () => {
      const reason = 'IP already submitted today';

      const result = IPSubmissionCheckResult.blocked(reason);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe(reason);
    });

    it('should create blocked result with different reasons', () => {
      const result = IPSubmissionCheckResult.blocked('Rate limit exceeded');

      expect(result.reason).toBe('Rate limit exceeded');
    });
  });
});

describe('UserSegmentation', () => {
  it('should create user segmentation with data', () => {
    const data = {
      byRole: { hr: 50, manager: 30, recruiter: 20 },
      byIndustry: { tech: 60, finance: 30, healthcare: 10 },
      bySatisfaction: { high: 40, medium: 35, low: 25 },
    };

    const segmentation = new UserSegmentation(data);

    expect(segmentation).toBeInstanceOf(UserSegmentation);
    expect(segmentation.data).toEqual(data);
  });

  it('should handle empty data', () => {
    const data = {
      byRole: {},
      byIndustry: {},
      bySatisfaction: { high: 0, medium: 0, low: 0 },
    };

    const segmentation = new UserSegmentation(data);

    expect(segmentation.data.byRole).toEqual({});
    expect(segmentation.data.bySatisfaction.low).toBe(0);
  });
});
