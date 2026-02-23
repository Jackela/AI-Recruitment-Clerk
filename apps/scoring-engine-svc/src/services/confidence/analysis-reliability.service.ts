import { Injectable } from '@nestjs/common';
import type {
  ComponentScores,
  ProcessingMetrics,
  AnalysisReliabilityAssessment,
  AnalysisReliabilityFactors,
} from './confidence.types';

/**
 * AnalysisReliabilityService - Handles analysis reliability assessment for scoring.
 *
 * Evaluates the reliability of scoring analysis based on algorithm confidence,
 * AI response quality, evidence strength, and cross-validation metrics.
 *
 * @since v1.0.0
 */
@Injectable()
export class AnalysisReliabilityService {
  /**
   * Assess analysis reliability for component scores.
   *
   * @param componentScores - Individual scoring components (skills, experience, cultural fit)
   * @param processingMetrics - AI processing performance and error metrics
   * @returns Analysis reliability assessment with score, factors, and uncertainties
   */
  public assessAnalysisReliability(
    componentScores: ComponentScores,
    processingMetrics: ProcessingMetrics,
  ): AnalysisReliabilityAssessment {
    // Algorithm confidence based on component confidences
    const algorithmConfidence = Math.round(
      (componentScores.skills.confidence * 0.4 +
        componentScores.experience.confidence * 0.35 +
        componentScores.culturalFit.confidence * 0.25) *
        100,
    );

    // AI response quality based on processing metrics
    const aiResponseQuality = this.assessAIResponseQuality(processingMetrics);

    // Evidence strength based on component evidence
    const evidenceStrength = Math.round(
      componentScores.skills.evidenceStrength * 0.4 +
        componentScores.experience.evidenceStrength * 0.35 +
        componentScores.culturalFit.evidenceStrength * 0.25,
    );

    // Cross-validation score (based on consistency between methods)
    const crossValidation = this.calculateCrossValidation(componentScores);

    const factors: AnalysisReliabilityFactors = {
      algorithmConfidence,
      aiResponseQuality,
      evidenceStrength,
      crossValidation,
    };

    const score = Math.round(
      algorithmConfidence * 0.3 +
        aiResponseQuality * 0.25 +
        evidenceStrength * 0.25 +
        crossValidation * 0.2,
    );

    const uncertainties = this.identifyAnalysisUncertainties(
      factors,
      processingMetrics,
    );

    return {
      score,
      factors,
      uncertainties,
    };
  }

  private assessAIResponseQuality(
    processingMetrics: ProcessingMetrics,
  ): number {
    let quality = 90; // Base quality score

    // Penalize for slow response times
    const avgResponseTime =
      processingMetrics.aiResponseTimes.reduce((a, b) => a + b, 0) /
      processingMetrics.aiResponseTimes.length;
    if (avgResponseTime > 5000) quality -= 10;
    if (avgResponseTime > 10000) quality -= 20;

    // Penalize for fallback usage
    const fallbackRate =
      processingMetrics.fallbackUsed.filter((f) => f).length /
      processingMetrics.fallbackUsed.length;
    quality -= fallbackRate * 30;

    // Penalize for high error rates
    const avgErrorRate =
      processingMetrics.errorRates.reduce((a, b) => a + b, 0) /
      processingMetrics.errorRates.length;
    quality -= avgErrorRate * 50;

    return Math.max(0, quality);
  }

  private calculateCrossValidation(componentScores: ComponentScores): number {
    // Check consistency between different scoring components
    const scores = [
      componentScores.skills.score,
      componentScores.experience.score,
      componentScores.culturalFit.score,
    ];

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
      scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher cross-validation score
    const consistency = Math.max(0, 100 - standardDeviation * 2);
    return Math.round(consistency);
  }

  private identifyAnalysisUncertainties(
    factors: AnalysisReliabilityFactors,
    processingMetrics: ProcessingMetrics,
  ): string[] {
    const uncertainties: string[] = [];

    if (factors.algorithmConfidence < 70) {
      uncertainties.push('Low confidence in algorithmic analysis');
    }

    if (factors.aiResponseQuality < 70) {
      uncertainties.push('AI analysis quality concerns');
    }

    if (factors.evidenceStrength < 60) {
      uncertainties.push('Limited evidence for scoring decisions');
    }

    if (factors.crossValidation < 70) {
      uncertainties.push('Inconsistent results between scoring methods');
    }

    const fallbackRate =
      processingMetrics.fallbackUsed.filter((f) => f).length /
      processingMetrics.fallbackUsed.length;
    if (fallbackRate > 0.3) {
      uncertainties.push('High reliance on fallback methods');
    }

    return uncertainties;
  }
}
