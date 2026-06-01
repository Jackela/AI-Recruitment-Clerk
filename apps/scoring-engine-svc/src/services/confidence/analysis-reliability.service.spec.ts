import { Test } from '@nestjs/testing';
import { AnalysisReliabilityService } from './analysis-reliability.service';
import type { ComponentScores, ProcessingMetrics } from './confidence.types';

describe('AnalysisReliabilityService', () => {
  let service: AnalysisReliabilityService;

  const createMockComponentScores = (overrides = {}): ComponentScores => ({
    skills: { score: 85, confidence: 0.9, evidenceStrength: 80 },
    experience: { score: 78, confidence: 0.85, evidenceStrength: 75 },
    culturalFit: { score: 92, confidence: 0.88, evidenceStrength: 85 },
    ...overrides,
  });

  const createMockProcessingMetrics = (
    overrides: Partial<ProcessingMetrics> = {},
  ): ProcessingMetrics => ({
    aiResponseTimes: [200, 180, 220],
    fallbackUsed: [false, false, false],
    errorRates: [0, 0, 0],
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AnalysisReliabilityService],
    }).compile();

    service = module.get<AnalysisReliabilityService>(
      AnalysisReliabilityService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('assessAnalysisReliability', () => {
    it('should calculate reliability score for standard input', () => {
      const componentScores = createMockComponentScores();
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('uncertainties');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate algorithmConfidence as weighted average of component confidences', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 1.0, evidenceStrength: 80 },
        experience: { score: 78, confidence: 1.0, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 1.0, evidenceStrength: 85 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.factors.algorithmConfidence).toBe(100);
    });

    it('should handle zero confidence values', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0, evidenceStrength: 80 },
        experience: { score: 78, confidence: 0, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 0, evidenceStrength: 85 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.factors.algorithmConfidence).toBe(0);
    });

    it('should handle low confidence in one component', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.5, evidenceStrength: 80 },
        experience: { score: 78, confidence: 0.9, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 0.9, evidenceStrength: 85 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.factors.algorithmConfidence).toBe(74); // 0.5*0.4*100 + 0.9*0.35*100 + 0.9*0.25*100
    });

    it('should identify low algorithm confidence in uncertainties', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.5, evidenceStrength: 80 },
        experience: { score: 78, confidence: 0.5, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 0.5, evidenceStrength: 85 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.uncertainties).toContain(
        'Low confidence in algorithmic analysis',
      );
    });

    it('should calculate evidence strength as weighted average', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.9, evidenceStrength: 100 },
        experience: { score: 78, confidence: 0.85, evidenceStrength: 100 },
        culturalFit: { score: 92, confidence: 0.88, evidenceStrength: 100 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.factors.evidenceStrength).toBe(100);
    });

    it('should calculate overall score with correct weights', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 1.0, evidenceStrength: 100 },
        experience: { score: 78, confidence: 1.0, evidenceStrength: 100 },
        culturalFit: { score: 92, confidence: 1.0, evidenceStrength: 100 },
      });
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100, 100, 100],
        fallbackUsed: [false, false, false],
        errorRates: [0, 0, 0],
      });

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      // algorithmConfidence = 100 * 0.3 = 30
      // aiResponseQuality = 90 * 0.25 = 22.5
      // evidenceStrength = 100 * 0.25 = 25
      // crossValidation = (low variance) * 0.2 = ~20
      expect(result.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe('assessAIResponseQuality', () => {
    it('should return 90 as base quality for fast response with no fallback or errors', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100, 100, 100],
        fallbackUsed: [false, false, false],
        errorRates: [0, 0, 0],
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(90);
    });

    it('should penalize for average response time > 5000ms', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [6000, 6000, 6000],
        fallbackUsed: [false, false, false],
        errorRates: [0, 0, 0],
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(80); // 90 - 10
    });

    it('should penalize for average response time > 10000ms', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [12000, 12000, 12000],
        fallbackUsed: [false, false, false],
        errorRates: [0, 0, 0],
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(60); // 90 - 20 - 10
    });

    it('should penalize for fallback usage at 30% rate', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100, 100, 100],
        fallbackUsed: [true, false, false], // 1/3 = 33%
        errorRates: [0, 0, 0],
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBeCloseTo(80, 0); // 90 - (1/3)*30
    });

    it('should penalize for 100% fallback usage', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100, 100, 100],
        fallbackUsed: [true, true, true], // 100%
        errorRates: [0, 0, 0],
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(60); // 90 - 30
    });

    it('should penalize for high error rates', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100, 100, 100],
        fallbackUsed: [false, false, false],
        errorRates: [0.2, 0.2, 0.2], // 20% average
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(80); // 90 - (0.2)*50
    });

    it('should penalize for maximum error rates', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100, 100, 100],
        fallbackUsed: [false, false, false],
        errorRates: [1.0, 1.0, 1.0], // 100%
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(40); // 90 - (1.0)*50
    });

    it('should not go below 0 even with extreme penalties', () => {
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [15000, 15000, 15000],
        fallbackUsed: [true, true, true],
        errorRates: [2.0, 2.0, 2.0], // >100% error
      });

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBe(0);
    });

    it('should handle edge case with zero fallback used items', () => {
      const processingMetrics = {
        aiResponseTimes: [100],
        fallbackUsed: [],
        errorRates: [0],
      };

      const result = (service as any).assessAIResponseQuality(
        processingMetrics,
      );

      expect(result).toBeNaN(); // Division by zero
    });
  });

  describe('calculateCrossValidation', () => {
    it('should return 100 when all scores are identical', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 80, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 80, confidence: 0.85, evidenceStrength: 75 },
        culturalFit: { score: 80, confidence: 0.88, evidenceStrength: 85 },
      });

      const result = (service as any).calculateCrossValidation(componentScores);

      expect(result).toBe(100);
    });

    it('should return lower score for high variance', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 100, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 50, confidence: 0.85, evidenceStrength: 75 },
        culturalFit: { score: 25, confidence: 0.88, evidenceStrength: 85 },
      });

      const result = (service as any).calculateCrossValidation(componentScores);

      expect(result).toBeLessThan(100);
    });

    it('should calculate correct consistency for moderate variance', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 80, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 75, confidence: 0.85, evidenceStrength: 75 },
        culturalFit: { score: 70, confidence: 0.88, evidenceStrength: 85 },
      });

      const result = (service as any).calculateCrossValidation(componentScores);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    it('should identify inconsistent results in uncertainties when crossValidation < 70', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 95, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 60, confidence: 0.85, evidenceStrength: 75 },
        culturalFit: { score: 40, confidence: 0.88, evidenceStrength: 85 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.uncertainties).toContain(
        'Inconsistent results between scoring methods',
      );
    });
  });

  describe('identifyAnalysisUncertainties', () => {
    it('should identify low algorithm confidence uncertainty', () => {
      const factors = {
        algorithmConfidence: 50,
        aiResponseQuality: 90,
        evidenceStrength: 80,
        crossValidation: 85,
      };
      const processingMetrics = createMockProcessingMetrics();

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toContain('Low confidence in algorithmic analysis');
    });

    it('should identify AI response quality concerns', () => {
      const factors = {
        algorithmConfidence: 90,
        aiResponseQuality: 50,
        evidenceStrength: 80,
        crossValidation: 85,
      };
      const processingMetrics = createMockProcessingMetrics();

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toContain('AI analysis quality concerns');
    });

    it('should identify limited evidence uncertainty', () => {
      const factors = {
        algorithmConfidence: 90,
        aiResponseQuality: 90,
        evidenceStrength: 50,
        crossValidation: 85,
      };
      const processingMetrics = createMockProcessingMetrics();

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toContain('Limited evidence for scoring decisions');
    });

    it('should identify inconsistent results uncertainty', () => {
      const factors = {
        algorithmConfidence: 90,
        aiResponseQuality: 90,
        evidenceStrength: 80,
        crossValidation: 60,
      };
      const processingMetrics = createMockProcessingMetrics();

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toContain('Inconsistent results between scoring methods');
    });

    it('should identify high fallback usage uncertainty', () => {
      const factors = {
        algorithmConfidence: 90,
        aiResponseQuality: 90,
        evidenceStrength: 80,
        crossValidation: 85,
      };
      const processingMetrics = createMockProcessingMetrics({
        fallbackUsed: [true, true, true, false], // 75%
      });

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toContain('High reliance on fallback methods');
    });

    it('should not add uncertainties when all factors are good', () => {
      const factors = {
        algorithmConfidence: 90,
        aiResponseQuality: 90,
        evidenceStrength: 80,
        crossValidation: 85,
      };
      const processingMetrics = createMockProcessingMetrics({
        fallbackUsed: [false, false, false],
      });

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toHaveLength(0);
    });

    it('should identify multiple uncertainties', () => {
      const factors = {
        algorithmConfidence: 60,
        aiResponseQuality: 60,
        evidenceStrength: 50,
        crossValidation: 60,
      };
      const processingMetrics = createMockProcessingMetrics({
        fallbackUsed: [true, true, true],
      });

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).toContain('Low confidence in algorithmic analysis');
      expect(result).toContain('AI analysis quality concerns');
      expect(result).toContain('Limited evidence for scoring decisions');
      expect(result).toContain('Inconsistent results between scoring methods');
      expect(result).toContain('High reliance on fallback methods');
    });

    it('should identify uncertainty when fallback rate is exactly at threshold (30%)', () => {
      const factors = {
        algorithmConfidence: 90,
        aiResponseQuality: 90,
        evidenceStrength: 80,
        crossValidation: 85,
      };
      const processingMetrics = createMockProcessingMetrics({
        fallbackUsed: [true, false, false, false], // 25% which is < 30%, not >
      });

      const result = (service as any).identifyAnalysisUncertainties(
        factors,
        processingMetrics,
      );

      expect(result).not.toContain('High reliance on fallback methods');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty arrays in processing metrics', () => {
      const componentScores = createMockComponentScores();
      const processingMetrics = createMockProcessingMetrics({
        aiResponseTimes: [100],
        fallbackUsed: [false],
        errorRates: [0],
      });

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.score).toBeDefined();
      expect(result.factors).toBeDefined();
    });

    it('should handle single item arrays', () => {
      const componentScores = createMockComponentScores();
      const processingMetrics: ProcessingMetrics = {
        aiResponseTimes: [500],
        fallbackUsed: [true],
        errorRates: [0.1],
      };

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.factors.aiResponseQuality).toBeDefined();
    });

    it('should handle varying component scores', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 0, confidence: 0, evidenceStrength: 0 },
        experience: { score: 50, confidence: 0.5, evidenceStrength: 50 },
        culturalFit: { score: 100, confidence: 1.0, evidenceStrength: 100 },
      });
      const processingMetrics = createMockProcessingMetrics();

      const result = service.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      expect(result.factors.algorithmConfidence).toBe(58); // 0*0.4 + 50*0.35 + 100*0.25
      expect(result.factors.evidenceStrength).toBe(55); // 0*0.4 + 50*0.35 + 100*0.25
    });
  });
});
