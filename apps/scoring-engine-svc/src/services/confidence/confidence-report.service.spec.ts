import { Test } from '@nestjs/testing';
import { ConfidenceReportService } from './confidence-report.service';
import type {
  ComponentScores,
  ConfidenceMetrics,
  DataQualityAssessment,
  AnalysisReliabilityAssessment,
  ScoreVarianceAssessment,
  QualityIndicators,
} from './confidence.types';

describe('ConfidenceReportService', () => {
  let service: ConfidenceReportService;

  const createMockComponentScores = (overrides = {}): ComponentScores => ({
    skills: { score: 85, confidence: 0.9, evidenceStrength: 80 },
    experience: { score: 78, confidence: 0.85, evidenceStrength: 75 },
    culturalFit: { score: 92, confidence: 0.88, evidenceStrength: 85 },
    ...overrides,
  });

  const createMockDataQualityAssessment = (
    overrides = {},
  ): DataQualityAssessment => ({
    score: 85,
    factors: {
      completeness: 90,
      consistency: 85,
      recency: 80,
      detail: 85,
    },
    issues: [],
    ...overrides,
  });

  const createMockAnalysisReliabilityAssessment = (
    overrides = {},
  ): AnalysisReliabilityAssessment => ({
    score: 80,
    factors: {
      algorithmConfidence: 85,
      aiResponseQuality: 75,
      evidenceStrength: 80,
      crossValidation: 80,
    },
    uncertainties: [],
    ...overrides,
  });

  const createMockScoreVarianceAssessment = (
    overrides = {},
  ): ScoreVarianceAssessment => ({
    skillsVariance: 1.0,
    experienceVariance: 1.2,
    culturalFitVariance: 0.8,
    overallVariance: 1.0,
    stabilityScore: 85,
    ...overrides,
  });

  const createMockConfidenceMetrics = (overrides = {}): ConfidenceMetrics => ({
    dataQuality: createMockDataQualityAssessment(),
    analysisReliability: createMockAnalysisReliabilityAssessment(),
    scoreVariance: createMockScoreVarianceAssessment(),
    recommendationCertainty: {
      level: 'high',
      score: 85,
      factors: {
        scoringConsistency: 85,
        dataCompleteness: 90,
        algorithmMaturity: 80,
      },
      riskFactors: [],
    },
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfidenceReportService],
    }).compile();

    service = module.get<ConfidenceReportService>(ConfidenceReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateScoreVariance', () => {
    it('should calculate variance for all components', () => {
      const componentScores = createMockComponentScores();

      const result = service.calculateScoreVariance(componentScores);

      expect(result).toHaveProperty('skillsVariance');
      expect(result).toHaveProperty('experienceVariance');
      expect(result).toHaveProperty('culturalFitVariance');
      expect(result).toHaveProperty('overallVariance');
      expect(result).toHaveProperty('stabilityScore');
    });

    it('should calculate skills variance based on confidence', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.8, evidenceStrength: 80 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.skillsVariance).toBe(2.0);
    });

    it('should calculate variance for high confidence', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 1.0, evidenceStrength: 80 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.skillsVariance).toBe(0);
    });

    it('should calculate variance for low confidence', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.5, evidenceStrength: 80 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.skillsVariance).toBe(5.0);
    });

    it('should calculate overall variance as RMS of component variances', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 78, confidence: 0.9, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 0.9, evidenceStrength: 85 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.overallVariance).toBe(1.0);
    });

    it('should calculate stability score based on overall variance', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 1.0, evidenceStrength: 80 },
        experience: { score: 78, confidence: 1.0, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 1.0, evidenceStrength: 85 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.stabilityScore).toBe(100);
    });

    it('should cap stability score at 0', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0, evidenceStrength: 80 },
        experience: { score: 78, confidence: 0, evidenceStrength: 75 },
        culturalFit: { score: 92, confidence: 0, evidenceStrength: 85 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.stabilityScore).toBe(0);
    });

    it('should round variances to 1 decimal place', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 85, confidence: 0.88, evidenceStrength: 80 },
      });

      const result = service.calculateScoreVariance(componentScores);

      expect(result.skillsVariance).toBe(1.2);
    });
  });

  describe('calculateRecommendationCertainty', () => {
    it('should return certainty with level, score, factors, and riskFactors', () => {
      const dataQuality = createMockDataQualityAssessment();
      const analysisReliability = createMockAnalysisReliabilityAssessment();
      const scoreVariance = createMockScoreVarianceAssessment();

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('riskFactors');
    });

    it('should set level to "high" when score >= 80', () => {
      const dataQuality = createMockDataQualityAssessment({ score: 90 });
      const analysisReliability = createMockAnalysisReliabilityAssessment({
        score: 90,
      });
      const scoreVariance = createMockScoreVarianceAssessment({
        stabilityScore: 90,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.level).toBe('high');
    });

    it('should set level to "medium" when score is 60-79', () => {
      const dataQuality = createMockDataQualityAssessment({ score: 60 });
      const analysisReliability = createMockAnalysisReliabilityAssessment({
        score: 60,
      });
      const scoreVariance = createMockScoreVarianceAssessment({
        stabilityScore: 60,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.level).toBe('medium');
    });

    it('should set level to "low" when score < 60', () => {
      const dataQuality = createMockDataQualityAssessment({ score: 40 });
      const analysisReliability = createMockAnalysisReliabilityAssessment({
        score: 40,
      });
      const scoreVariance = createMockScoreVarianceAssessment({
        stabilityScore: 40,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.level).toBe('low');
    });

    it('should calculate score with correct weights', () => {
      const dataQuality = createMockDataQualityAssessment({ score: 100 });
      const analysisReliability = createMockAnalysisReliabilityAssessment({
        score: 100,
      });
      const scoreVariance = createMockScoreVarianceAssessment({
        stabilityScore: 100,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.score).toBe(100);
    });

    it('should include factors in result', () => {
      const scoreVariance = createMockScoreVarianceAssessment({
        stabilityScore: 75,
      });
      const dataQuality = createMockDataQualityAssessment({ score: 80 });
      const analysisReliability = createMockAnalysisReliabilityAssessment({
        score: 85,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.factors.scoringConsistency).toBe(75);
      expect(result.factors.dataCompleteness).toBe(80);
      expect(result.factors.algorithmMaturity).toBe(85);
    });

    it('should identify risk factors for low data quality', () => {
      const dataQuality = createMockDataQualityAssessment({ score: 50 });
      const analysisReliability = createMockAnalysisReliabilityAssessment();
      const scoreVariance = createMockScoreVarianceAssessment();

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.riskFactors).toContain(
        'Poor data quality may affect scoring accuracy',
      );
    });

    it('should identify risk factors for low analysis reliability', () => {
      const dataQuality = createMockDataQualityAssessment();
      const analysisReliability = createMockAnalysisReliabilityAssessment({
        score: 60,
      });
      const scoreVariance = createMockScoreVarianceAssessment();

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.riskFactors).toContain('Analysis reliability concerns');
    });

    it('should identify risk factors for low stability score', () => {
      const dataQuality = createMockDataQualityAssessment();
      const analysisReliability = createMockAnalysisReliabilityAssessment();
      const scoreVariance = createMockScoreVarianceAssessment({
        stabilityScore: 60,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.riskFactors).toContain(
        'High score variability indicates uncertainty',
      );
    });

    it('should identify risk factors for high variance', () => {
      const dataQuality = createMockDataQualityAssessment();
      const analysisReliability = createMockAnalysisReliabilityAssessment();
      const scoreVariance = createMockScoreVarianceAssessment({
        overallVariance: 2.0,
      });

      const result = service.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      expect(result.riskFactors).toContain(
        'Significant variance between scoring components',
      );
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate overall confidence with correct weights', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 100,
          factors: {
            completeness: 100,
            consistency: 100,
            recency: 100,
            detail: 100,
          },
          issues: [],
        },
        analysisReliability: {
          score: 100,
          factors: {
            algorithmConfidence: 100,
            aiResponseQuality: 100,
            evidenceStrength: 100,
            crossValidation: 100,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 0,
          experienceVariance: 0,
          culturalFitVariance: 0,
          overallVariance: 0,
          stabilityScore: 100,
        },
        recommendationCertainty: {
          level: 'high',
          score: 100,
          factors: {
            scoringConsistency: 100,
            dataCompleteness: 100,
            algorithmMaturity: 100,
          },
          riskFactors: [],
        },
      };

      const result = service.calculateOverallConfidence(confidenceMetrics);

      expect(result).toBe(100);
    });

    it('should calculate with varying scores', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 80,
          factors: {
            completeness: 80,
            consistency: 80,
            recency: 80,
            detail: 80,
          },
          issues: [],
        },
        analysisReliability: {
          score: 70,
          factors: {
            algorithmConfidence: 70,
            aiResponseQuality: 70,
            evidenceStrength: 70,
            crossValidation: 70,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 2,
          experienceVariance: 2,
          culturalFitVariance: 2,
          overallVariance: 2,
          stabilityScore: 80,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 75,
          factors: {
            scoringConsistency: 80,
            dataCompleteness: 80,
            algorithmMaturity: 70,
          },
          riskFactors: [],
        },
      };

      const result = service.calculateOverallConfidence(confidenceMetrics);

      expect(result).toBe(
        Math.round(80 * 0.3 + 70 * 0.35 + 80 * 0.2 + 75 * 0.15),
      );
    });

    it('should round to integer', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 83,
          factors: {
            completeness: 83,
            consistency: 83,
            recency: 83,
            detail: 83,
          },
          issues: [],
        },
        analysisReliability: {
          score: 67,
          factors: {
            algorithmConfidence: 67,
            aiResponseQuality: 67,
            evidenceStrength: 67,
            crossValidation: 67,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 1.7,
          experienceVariance: 1.7,
          culturalFitVariance: 1.7,
          overallVariance: 1.7,
          stabilityScore: 83,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 74,
          factors: {
            scoringConsistency: 83,
            dataCompleteness: 83,
            algorithmMaturity: 67,
          },
          riskFactors: [],
        },
      };

      const result = service.calculateOverallConfidence(confidenceMetrics);

      expect(result).toBe(
        Math.round(83 * 0.3 + 67 * 0.35 + 83 * 0.2 + 74 * 0.15),
      );
    });
  });

  describe('calculateReliabilityBand', () => {
    it('should calculate reliability band with min, max, most likely, and interval', () => {
      const componentScores = createMockComponentScores();
      const confidenceMetrics = createMockConfidenceMetrics();

      const result = service.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      expect(result).toHaveProperty('minScore');
      expect(result).toHaveProperty('maxScore');
      expect(result).toHaveProperty('mostLikelyScore');
      expect(result).toHaveProperty('confidenceInterval');
    });

    it('should calculate most likely score as weighted average', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 80, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 70, confidence: 0.85, evidenceStrength: 75 },
        culturalFit: { score: 90, confidence: 0.88, evidenceStrength: 85 },
      });
      const confidenceMetrics = createMockConfidenceMetrics();

      const result = service.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      expect(result.mostLikelyScore).toBe(79);
    });

    it('should calculate confidence interval based on variance', () => {
      const componentScores = createMockComponentScores();
      const confidenceMetrics = createMockConfidenceMetrics({
        scoreVariance: {
          skillsVariance: 1,
          experienceVariance: 1,
          culturalFitVariance: 1,
          overallVariance: 1,
          stabilityScore: 90,
        },
      });

      const result = service.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      expect(result.confidenceInterval).toBe(4);
    });

    it('should calculate min and max scores correctly', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 50, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 50, confidence: 0.85, evidenceStrength: 75 },
        culturalFit: { score: 50, confidence: 0.88, evidenceStrength: 85 },
      });
      const confidenceMetrics = createMockConfidenceMetrics({
        scoreVariance: {
          skillsVariance: 2,
          experienceVariance: 2,
          culturalFitVariance: 2,
          overallVariance: 2,
          stabilityScore: 80,
        },
      });

      const result = service.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      expect(result.minScore).toBe(46);
      expect(result.maxScore).toBe(54);
    });

    it('should cap min score at 0', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 10, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 10, confidence: 0.9, evidenceStrength: 80 },
        culturalFit: { score: 10, confidence: 0.9, evidenceStrength: 80 },
      });
      const confidenceMetrics = createMockConfidenceMetrics({
        scoreVariance: {
          skillsVariance: 5,
          experienceVariance: 5,
          culturalFitVariance: 5,
          overallVariance: 20,
          stabilityScore: 50,
        },
      });

      const result = service.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      expect(result.minScore).toBe(0);
    });

    it('should cap max score at 100', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 95, confidence: 0.9, evidenceStrength: 80 },
        experience: { score: 95, confidence: 0.9, evidenceStrength: 80 },
        culturalFit: { score: 95, confidence: 0.9, evidenceStrength: 80 },
      });
      const confidenceMetrics = createMockConfidenceMetrics({
        scoreVariance: {
          skillsVariance: 5,
          experienceVariance: 5,
          culturalFitVariance: 5,
          overallVariance: 20,
          stabilityScore: 50,
        },
      });

      const result = service.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      expect(result.maxScore).toBe(100);
    });
  });

  describe('generateQualityIndicators', () => {
    it('should return grades for data quality, analysis depth, and reliability', () => {
      const confidenceMetrics = createMockConfidenceMetrics();

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result).toHaveProperty('dataQualityGrade');
      expect(result).toHaveProperty('analysisDepthGrade');
      expect(result).toHaveProperty('reliabilityGrade');
    });

    it('should assign A grade for score >= 90', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 95,
          factors: {
            completeness: 95,
            consistency: 95,
            recency: 95,
            detail: 95,
          },
          issues: [],
        },
        analysisReliability: {
          score: 95,
          factors: {
            algorithmConfidence: 95,
            aiResponseQuality: 95,
            evidenceStrength: 95,
            crossValidation: 95,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 0.5,
          experienceVariance: 0.5,
          culturalFitVariance: 0.5,
          overallVariance: 0.5,
          stabilityScore: 95,
        },
        recommendationCertainty: {
          level: 'high',
          score: 95,
          factors: {
            scoringConsistency: 95,
            dataCompleteness: 95,
            algorithmMaturity: 95,
          },
          riskFactors: [],
        },
      };

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result.dataQualityGrade).toBe('A');
      expect(result.analysisDepthGrade).toBe('A');
      expect(result.reliabilityGrade).toBe('A');
    });

    it('should assign B grade for score 80-89', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 85,
          factors: {
            completeness: 85,
            consistency: 85,
            recency: 85,
            detail: 85,
          },
          issues: [],
        },
        analysisReliability: {
          score: 85,
          factors: {
            algorithmConfidence: 85,
            aiResponseQuality: 85,
            evidenceStrength: 85,
            crossValidation: 85,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 1.5,
          experienceVariance: 1.5,
          culturalFitVariance: 1.5,
          overallVariance: 1.5,
          stabilityScore: 85,
        },
        recommendationCertainty: {
          level: 'high',
          score: 85,
          factors: {
            scoringConsistency: 85,
            dataCompleteness: 85,
            algorithmMaturity: 85,
          },
          riskFactors: [],
        },
      };

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result.dataQualityGrade).toBe('B');
      expect(result.analysisDepthGrade).toBe('B');
      expect(result.reliabilityGrade).toBe('B');
    });

    it('should assign C grade for score 70-79', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 75,
          factors: {
            completeness: 75,
            consistency: 75,
            recency: 75,
            detail: 75,
          },
          issues: [],
        },
        analysisReliability: {
          score: 75,
          factors: {
            algorithmConfidence: 75,
            aiResponseQuality: 75,
            evidenceStrength: 75,
            crossValidation: 75,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 2.5,
          experienceVariance: 2.5,
          culturalFitVariance: 2.5,
          overallVariance: 2.5,
          stabilityScore: 75,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 75,
          factors: {
            scoringConsistency: 75,
            dataCompleteness: 75,
            algorithmMaturity: 75,
          },
          riskFactors: [],
        },
      };

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result.dataQualityGrade).toBe('C');
      expect(result.analysisDepthGrade).toBe('C');
      expect(result.reliabilityGrade).toBe('C');
    });

    it('should assign D grade for score 60-69', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 65,
          factors: {
            completeness: 65,
            consistency: 65,
            recency: 65,
            detail: 65,
          },
          issues: [],
        },
        analysisReliability: {
          score: 65,
          factors: {
            algorithmConfidence: 65,
            aiResponseQuality: 65,
            evidenceStrength: 65,
            crossValidation: 65,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 3.5,
          experienceVariance: 3.5,
          culturalFitVariance: 3.5,
          overallVariance: 3.5,
          stabilityScore: 65,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 65,
          factors: {
            scoringConsistency: 65,
            dataCompleteness: 65,
            algorithmMaturity: 65,
          },
          riskFactors: [],
        },
      };

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result.dataQualityGrade).toBe('D');
      expect(result.analysisDepthGrade).toBe('D');
      expect(result.reliabilityGrade).toBe('D');
    });

    it('should assign F grade for score < 60', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 50,
          factors: {
            completeness: 50,
            consistency: 50,
            recency: 50,
            detail: 50,
          },
          issues: [],
        },
        analysisReliability: {
          score: 50,
          factors: {
            algorithmConfidence: 50,
            aiResponseQuality: 50,
            evidenceStrength: 50,
            crossValidation: 50,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 5,
          experienceVariance: 5,
          culturalFitVariance: 5,
          overallVariance: 5,
          stabilityScore: 50,
        },
        recommendationCertainty: {
          level: 'low',
          score: 50,
          factors: {
            scoringConsistency: 50,
            dataCompleteness: 50,
            algorithmMaturity: 50,
          },
          riskFactors: [],
        },
      };

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result.dataQualityGrade).toBe('F');
      expect(result.analysisDepthGrade).toBe('F');
      expect(result.reliabilityGrade).toBe('F');
    });

    it('should handle boundary values correctly', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 90,
          factors: {
            completeness: 90,
            consistency: 90,
            recency: 90,
            detail: 90,
          },
          issues: [],
        },
        analysisReliability: {
          score: 80,
          factors: {
            algorithmConfidence: 80,
            aiResponseQuality: 80,
            evidenceStrength: 80,
            crossValidation: 80,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 2,
          experienceVariance: 2,
          culturalFitVariance: 2,
          overallVariance: 2,
          stabilityScore: 70,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 75,
          factors: {
            scoringConsistency: 70,
            dataCompleteness: 90,
            algorithmMaturity: 80,
          },
          riskFactors: [],
        },
      };

      const result = service.generateQualityIndicators(confidenceMetrics);

      expect(result.dataQualityGrade).toBe('A');
      expect(result.analysisDepthGrade).toBe('B');
      expect(result.reliabilityGrade).toBe('C');
    });
  });

  describe('generateConfidenceRecommendations', () => {
    it('should return recommendations with reliability level, action items, and risk mitigation', () => {
      const confidenceMetrics = createMockConfidenceMetrics();
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'B',
        analysisDepthGrade: 'B',
        reliabilityGrade: 'B',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result).toHaveProperty('scoringReliability');
      expect(result).toHaveProperty('actionItems');
      expect(result).toHaveProperty('riskMitigation');
    });

    it('should set high reliability when overall confidence >= 80', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 90,
          factors: {
            completeness: 90,
            consistency: 90,
            recency: 90,
            detail: 90,
          },
          issues: [],
        },
        analysisReliability: {
          score: 90,
          factors: {
            algorithmConfidence: 90,
            aiResponseQuality: 90,
            evidenceStrength: 90,
            crossValidation: 90,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 0.5,
          experienceVariance: 0.5,
          culturalFitVariance: 0.5,
          overallVariance: 0.5,
          stabilityScore: 90,
        },
        recommendationCertainty: {
          level: 'high',
          score: 90,
          factors: {
            scoringConsistency: 90,
            dataCompleteness: 90,
            algorithmMaturity: 90,
          },
          riskFactors: [],
        },
      };
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'A',
        analysisDepthGrade: 'A',
        reliabilityGrade: 'A',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.scoringReliability).toBe('high');
    });

    it('should set medium reliability when overall confidence is 60-79', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 70,
          factors: {
            completeness: 70,
            consistency: 70,
            recency: 70,
            detail: 70,
          },
          issues: [],
        },
        analysisReliability: {
          score: 70,
          factors: {
            algorithmConfidence: 70,
            aiResponseQuality: 70,
            evidenceStrength: 70,
            crossValidation: 70,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 2,
          experienceVariance: 2,
          culturalFitVariance: 2,
          overallVariance: 2,
          stabilityScore: 70,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 70,
          factors: {
            scoringConsistency: 70,
            dataCompleteness: 70,
            algorithmMaturity: 70,
          },
          riskFactors: [],
        },
      };
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'C',
        analysisDepthGrade: 'C',
        reliabilityGrade: 'C',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.scoringReliability).toBe('medium');
    });

    it('should set low reliability when overall confidence < 60', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 50,
          factors: {
            completeness: 50,
            consistency: 50,
            recency: 50,
            detail: 50,
          },
          issues: [],
        },
        analysisReliability: {
          score: 50,
          factors: {
            algorithmConfidence: 50,
            aiResponseQuality: 50,
            evidenceStrength: 50,
            crossValidation: 50,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 5,
          experienceVariance: 5,
          culturalFitVariance: 5,
          overallVariance: 5,
          stabilityScore: 50,
        },
        recommendationCertainty: {
          level: 'low',
          score: 50,
          factors: {
            scoringConsistency: 50,
            dataCompleteness: 50,
            algorithmMaturity: 50,
          },
          riskFactors: [],
        },
      };
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'F',
        analysisDepthGrade: 'F',
        reliabilityGrade: 'F',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.scoringReliability).toBe('low');
    });

    it('should generate action items for poor data quality grade', () => {
      const confidenceMetrics = createMockConfidenceMetrics();
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'D',
        analysisDepthGrade: 'A',
        reliabilityGrade: 'A',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.actionItems).toContain(
        'Request additional resume information for more accurate scoring',
      );
    });

    it('should generate action items for poor analysis depth grade', () => {
      const confidenceMetrics = createMockConfidenceMetrics();
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'A',
        analysisDepthGrade: 'C',
        reliabilityGrade: 'A',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.actionItems).toContain(
        'Consider manual review to supplement algorithmic analysis',
      );
    });

    it('should generate action items for poor reliability grade', () => {
      const confidenceMetrics = createMockConfidenceMetrics();
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'A',
        analysisDepthGrade: 'A',
        reliabilityGrade: 'D',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.actionItems).toContain(
        'Use scoring results as initial filter only, conduct thorough interviews',
      );
    });

    it('should generate risk mitigation for low scoring reliability', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 50,
          factors: {
            completeness: 50,
            consistency: 50,
            recency: 50,
            detail: 50,
          },
          issues: [],
        },
        analysisReliability: {
          score: 50,
          factors: {
            algorithmConfidence: 50,
            aiResponseQuality: 50,
            evidenceStrength: 50,
            crossValidation: 50,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 5,
          experienceVariance: 5,
          culturalFitVariance: 5,
          overallVariance: 5,
          stabilityScore: 50,
        },
        recommendationCertainty: {
          level: 'low',
          score: 50,
          factors: {
            scoringConsistency: 50,
            dataCompleteness: 50,
            algorithmMaturity: 50,
          },
          riskFactors: [],
        },
      };
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'F',
        analysisDepthGrade: 'F',
        reliabilityGrade: 'F',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.riskMitigation).toContain(
        'Treat scoring results as preliminary only',
      );
      expect(result.riskMitigation).toContain(
        'Conduct additional assessment methods',
      );
      expect(result.riskMitigation).toContain(
        'Consider multiple reviewer evaluations',
      );
    });

    it('should generate risk mitigation for low data quality score', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 60,
          factors: {
            completeness: 60,
            consistency: 60,
            recency: 60,
            detail: 60,
          },
          issues: [],
        },
        analysisReliability: {
          score: 85,
          factors: {
            algorithmConfidence: 85,
            aiResponseQuality: 75,
            evidenceStrength: 80,
            crossValidation: 80,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 1,
          experienceVariance: 1.2,
          culturalFitVariance: 0.8,
          overallVariance: 1,
          stabilityScore: 85,
        },
        recommendationCertainty: {
          level: 'high',
          score: 85,
          factors: {
            scoringConsistency: 85,
            dataCompleteness: 90,
            algorithmMaturity: 80,
          },
          riskFactors: [],
        },
      };
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'D',
        analysisDepthGrade: 'A',
        reliabilityGrade: 'A',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.riskMitigation).toContain(
        'Verify critical information during interview process',
      );
    });

    it('should generate risk mitigation for high variance', () => {
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality: {
          score: 85,
          factors: {
            completeness: 90,
            consistency: 85,
            recency: 80,
            detail: 85,
          },
          issues: [],
        },
        analysisReliability: {
          score: 80,
          factors: {
            algorithmConfidence: 85,
            aiResponseQuality: 75,
            evidenceStrength: 80,
            crossValidation: 80,
          },
          uncertainties: [],
        },
        scoreVariance: {
          skillsVariance: 2,
          experienceVariance: 2,
          culturalFitVariance: 2,
          overallVariance: 2,
          stabilityScore: 50,
        },
        recommendationCertainty: {
          level: 'high',
          score: 85,
          factors: {
            scoringConsistency: 85,
            dataCompleteness: 90,
            algorithmMaturity: 80,
          },
          riskFactors: [],
        },
      };
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'A',
        analysisDepthGrade: 'A',
        reliabilityGrade: 'B',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.riskMitigation).toContain(
        'Focus on areas with highest confidence scores',
      );
      expect(result.riskMitigation).toContain(
        'Use range-based evaluation rather than point scores',
      );
    });

    it('should generate empty action items for good grades', () => {
      const confidenceMetrics = createMockConfidenceMetrics();
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'A',
        analysisDepthGrade: 'A',
        reliabilityGrade: 'A',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.actionItems).toHaveLength(0);
    });

    it('should handle grade C as poor grade', () => {
      const confidenceMetrics = createMockConfidenceMetrics();
      const qualityIndicators: QualityIndicators = {
        dataQualityGrade: 'C',
        analysisDepthGrade: 'C',
        reliabilityGrade: 'C',
      };

      const result = service.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      expect(result.actionItems).toContain(
        'Request additional resume information for more accurate scoring',
      );
      expect(result.actionItems).toContain(
        'Consider manual review to supplement algorithmic analysis',
      );
      expect(result.actionItems).toContain(
        'Use scoring results as initial filter only, conduct thorough interviews',
      );
    });
  });

  describe('fallbackConfidenceReport', () => {
    it('should return complete fallback report structure', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result).toHaveProperty('overallConfidence');
      expect(result).toHaveProperty('confidenceMetrics');
      expect(result).toHaveProperty('reliabilityBand');
      expect(result).toHaveProperty('qualityIndicators');
      expect(result).toHaveProperty('recommendations');
    });

    it('should set overall confidence to 50', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.overallConfidence).toBe(50);
    });

    it('should set conservative data quality metrics', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.confidenceMetrics.dataQuality.score).toBe(60);
      expect(result.confidenceMetrics.dataQuality.factors.completeness).toBe(
        60,
      );
      expect(result.confidenceMetrics.dataQuality.issues).toContain(
        'Limited confidence analysis available',
      );
    });

    it('should set conservative analysis reliability metrics', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.confidenceMetrics.analysisReliability.score).toBe(50);
      expect(
        result.confidenceMetrics.analysisReliability.uncertainties,
      ).toContain('Analysis confidence could not be determined');
    });

    it('should set conservative score variance metrics', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.confidenceMetrics.scoreVariance.overallVariance).toBe(1.0);
      expect(result.confidenceMetrics.scoreVariance.stabilityScore).toBe(50);
    });

    it('should set conservative recommendation certainty', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.confidenceMetrics.recommendationCertainty.level).toBe(
        'medium',
      );
      expect(result.confidenceMetrics.recommendationCertainty.score).toBe(50);
      expect(
        result.confidenceMetrics.recommendationCertainty.riskFactors,
      ).toContain('Confidence analysis failed');
    });

    it('should calculate reliability band based on skills score', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 80, confidence: 0.9, evidenceStrength: 80 },
      });

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.reliabilityBand.minScore).toBe(65);
      expect(result.reliabilityBand.maxScore).toBe(95);
      expect(result.reliabilityBand.mostLikelyScore).toBe(80);
      expect(result.reliabilityBand.confidenceInterval).toBe(30);
    });

    it('should set all grades to C', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.qualityIndicators.dataQualityGrade).toBe('C');
      expect(result.qualityIndicators.analysisDepthGrade).toBe('C');
      expect(result.qualityIndicators.reliabilityGrade).toBe('C');
    });

    it('should set conservative recommendations', () => {
      const componentScores = createMockComponentScores();

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.recommendations.scoringReliability).toBe('medium');
      expect(result.recommendations.actionItems).toContain(
        'Manual review recommended',
      );
      expect(result.recommendations.riskMitigation).toContain(
        'Use as preliminary screening only',
      );
    });

    it('should handle edge case with very low skills score', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 10, confidence: 0.9, evidenceStrength: 80 },
      });

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.reliabilityBand.minScore).toBe(0);
      expect(result.reliabilityBand.maxScore).toBe(25);
    });

    it('should handle edge case with very high skills score', () => {
      const componentScores = createMockComponentScores({
        skills: { score: 95, confidence: 0.9, evidenceStrength: 80 },
      });

      const result = service.fallbackConfidenceReport(componentScores);

      expect(result.reliabilityBand.minScore).toBe(80);
      expect(result.reliabilityBand.maxScore).toBe(100);
    });
  });

  describe('private helper methods', () => {
    describe('scoreToGrade', () => {
      it('should return A for scores >= 90', () => {
        const scores = [90, 95, 100];
        const results = scores.map((score) =>
          (service as any).scoreToGrade(score),
        );
        expect(results.every((g) => g === 'A')).toBe(true);
      });

      it('should return B for scores 80-89', () => {
        const scores = [80, 85, 89];
        const results = scores.map((score) =>
          (service as any).scoreToGrade(score),
        );
        expect(results.every((g) => g === 'B')).toBe(true);
      });

      it('should return C for scores 70-79', () => {
        const scores = [70, 75, 79];
        const results = scores.map((score) =>
          (service as any).scoreToGrade(score),
        );
        expect(results.every((g) => g === 'C')).toBe(true);
      });

      it('should return D for scores 60-69', () => {
        const scores = [60, 65, 69];
        const results = scores.map((score) =>
          (service as any).scoreToGrade(score),
        );
        expect(results.every((g) => g === 'D')).toBe(true);
      });

      it('should return F for scores < 60', () => {
        const scores = [0, 30, 59];
        const results = scores.map((score) =>
          (service as any).scoreToGrade(score),
        );
        expect(results.every((g) => g === 'F')).toBe(true);
      });
    });
  });
});
