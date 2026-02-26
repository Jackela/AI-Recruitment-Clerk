import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

/**
 * Defines the shape of the confidence metrics.
 */
export interface ConfidenceMetrics {
  dataQuality: {
    score: number; // 0-100
    factors: {
      completeness: number; // 0-100
      consistency: number; // 0-100
      recency: number; // 0-100
      detail: number; // 0-100
    };
    issues: string[];
  };
  analysisReliability: {
    score: number; // 0-100
    factors: {
      algorithmConfidence: number; // 0-100
      aiResponseQuality: number; // 0-100
      evidenceStrength: number; // 0-100
      crossValidation: number; // 0-100
    };
    uncertainties: string[];
  };
  scoreVariance: {
    skillsVariance: number; // Standard deviation of skill scores
    experienceVariance: number;
    culturalFitVariance: number;
    overallVariance: number;
    stabilityScore: number; // 0-100, higher = more stable
  };
  recommendationCertainty: {
    level: 'high' | 'medium' | 'low';
    score: number; // 0-100
    factors: {
      scoringConsistency: number;
      dataCompleteness: number;
      algorithmMaturity: number;
    };
    riskFactors: string[];
  };
}

/**
 * Defines the shape of the score reliability report.
 */
export interface ScoreReliabilityReport {
  overallConfidence: number; // 0-100
  confidenceMetrics: ConfidenceMetrics;
  reliabilityBand: {
    minScore: number;
    maxScore: number;
    mostLikelyScore: number;
    confidenceInterval: number; // 95% confidence interval width
  };
  qualityIndicators: {
    dataQualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    analysisDepthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    reliabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  recommendations: {
    scoringReliability: 'high' | 'medium' | 'low';
    actionItems: string[];
    riskMitigation: string[];
  };
}

/**
 * Defines the shape of the processing metrics.
 */
export interface ProcessingMetrics {
  aiResponseTimes: number[];
  fallbackUsed: boolean[];
  errorRates: number[];
}

/**
 * Defines the shape of the data quality factors.
 */
export interface DataQualityFactors {
  completeness: number;
  consistency: number;
  recency: number;
  detail: number;
}

/**
 * Defines the shape of the analysis reliability factors.
 */
export interface AnalysisReliabilityFactors {
  algorithmConfidence: number;
  aiResponseQuality: number;
  evidenceStrength: number;
  crossValidation: number;
}

/**
 * Defines the shape of the data quality assessment.
 */
export interface DataQualityAssessment {
  score: number;
  factors: DataQualityFactors;
  issues: string[];
}

/**
 * Defines the shape of the analysis reliability assessment.
 */
export interface AnalysisReliabilityAssessment {
  score: number;
  factors: AnalysisReliabilityFactors;
  uncertainties: string[];
}

/**
 * Defines the shape of the score variance assessment.
 */
export interface ScoreVarianceAssessment {
  skillsVariance: number;
  experienceVariance: number;
  culturalFitVariance: number;
  overallVariance: number;
  stabilityScore: number;
}

/**
 * Defines the shape of the quality indicators.
 */
export interface QualityIndicators {
  dataQualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  analysisDepthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  reliabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Defines the shape of the component scores.
 */
export interface ComponentScores {
  skills: {
    score: number;
    confidence: number;
    evidenceStrength: number;
  };
  experience: {
    score: number;
    confidence: number;
    evidenceStrength: number;
  };
  culturalFit: {
    score: number;
    confidence: number;
    evidenceStrength: number;
  };
}

/**
 * Re-export ResumeDTO type for use in confidence services.
 */
export type { ResumeDTO };
