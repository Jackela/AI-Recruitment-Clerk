import { Injectable } from '@nestjs/common';
import type {
  ComponentScores,
  ConfidenceMetrics,
  DataQualityAssessment,
  AnalysisReliabilityAssessment,
  ScoreVarianceAssessment,
  QualityIndicators,
  ScoreReliabilityReport,
} from './confidence.types';

/**
 * ConfidenceReportService - Handles confidence report generation.
 *
 * Generates score variance calculations, recommendation certainty,
 * quality indicators, and final confidence reports.
 *
 * @since v1.0.0
 */
@Injectable()
export class ConfidenceReportService {
  /**
   * Calculate score variance and stability.
   *
   * @param componentScores - Individual scoring components
   * @returns Score variance assessment
   */
  public calculateScoreVariance(
    componentScores: ComponentScores,
  ): ScoreVarianceAssessment {
    // For a more comprehensive analysis, we would need multiple scoring runs
    // For now, we estimate variance based on confidence levels

    const skillsVariance = (100 - componentScores.skills.confidence) / 10;
    const experienceVariance =
      (100 - componentScores.experience.confidence) / 10;
    const culturalFitVariance =
      (100 - componentScores.culturalFit.confidence) / 10;

    const overallVariance = Math.sqrt(
      (Math.pow(skillsVariance, 2) +
        Math.pow(experienceVariance, 2) +
        Math.pow(culturalFitVariance, 2)) /
        3,
    );

    const stabilityScore = Math.max(0, 100 - overallVariance * 10);

    return {
      skillsVariance: Math.round(skillsVariance * 10) / 10,
      experienceVariance: Math.round(experienceVariance * 10) / 10,
      culturalFitVariance: Math.round(culturalFitVariance * 10) / 10,
      overallVariance: Math.round(overallVariance * 10) / 10,
      stabilityScore: Math.round(stabilityScore),
    };
  }

  /**
   * Calculate recommendation certainty.
   *
   * @param dataQuality - Data quality assessment
   * @param analysisReliability - Analysis reliability assessment
   * @param scoreVariance - Score variance assessment
   * @returns Recommendation certainty metrics
   */
  public calculateRecommendationCertainty(
    dataQuality: DataQualityAssessment,
    analysisReliability: AnalysisReliabilityAssessment,
    scoreVariance: ScoreVarianceAssessment,
  ): ConfidenceMetrics['recommendationCertainty'] {
    const scoringConsistency = scoreVariance.stabilityScore;
    const dataCompleteness = dataQuality.score;
    const algorithmMaturity = analysisReliability.score;

    const overallScore = Math.round(
      scoringConsistency * 0.4 +
        dataCompleteness * 0.35 +
        algorithmMaturity * 0.25,
    );

    let level: 'high' | 'medium' | 'low';
    if (overallScore >= 80) level = 'high';
    else if (overallScore >= 60) level = 'medium';
    else level = 'low';

    const riskFactors = this.identifyRiskFactors(
      dataQuality,
      analysisReliability,
      scoreVariance,
    );

    return {
      level,
      score: overallScore,
      factors: {
        scoringConsistency,
        dataCompleteness,
        algorithmMaturity,
      },
      riskFactors,
    };
  }

  /**
   * Calculate overall confidence score.
   *
   * @param confidenceMetrics - All confidence metrics
   * @returns Overall confidence score (0-100)
   */
  public calculateOverallConfidence(
    confidenceMetrics: ConfidenceMetrics,
  ): number {
    return Math.round(
      confidenceMetrics.dataQuality.score * 0.3 +
        confidenceMetrics.analysisReliability.score * 0.35 +
        confidenceMetrics.scoreVariance.stabilityScore * 0.2 +
        confidenceMetrics.recommendationCertainty.score * 0.15,
    );
  }

  /**
   * Calculate reliability band (confidence interval).
   *
   * @param componentScores - Individual scoring components
   * @param confidenceMetrics - All confidence metrics
   * @returns Reliability band with min/max scores and confidence interval
   */
  public calculateReliabilityBand(
    componentScores: ComponentScores,
    confidenceMetrics: ConfidenceMetrics,
  ): ScoreReliabilityReport['reliabilityBand'] {
    const currentScore = Math.round(
      componentScores.skills.score * 0.5 +
        componentScores.experience.score * 0.3 +
        componentScores.culturalFit.score * 0.2,
    );

    // Calculate confidence interval based on variance
    const variance = confidenceMetrics.scoreVariance.overallVariance;
    const confidenceInterval = variance * 1.96; // 95% confidence interval

    return {
      minScore: Math.max(0, Math.round(currentScore - confidenceInterval)),
      maxScore: Math.min(100, Math.round(currentScore + confidenceInterval)),
      mostLikelyScore: currentScore,
      confidenceInterval: Math.round(confidenceInterval * 2),
    };
  }

  /**
   * Generate quality indicator grades.
   *
   * @param confidenceMetrics - All confidence metrics
   * @returns Quality indicators with letter grades
   */
  public generateQualityIndicators(
    confidenceMetrics: ConfidenceMetrics,
  ): QualityIndicators {
    const dataQualityGrade = this.scoreToGrade(
      confidenceMetrics.dataQuality.score,
    );
    const analysisDepthGrade = this.scoreToGrade(
      confidenceMetrics.analysisReliability.score,
    );
    const reliabilityGrade = this.scoreToGrade(
      confidenceMetrics.scoreVariance.stabilityScore,
    );

    return {
      dataQualityGrade,
      analysisDepthGrade,
      reliabilityGrade,
    };
  }

  /**
   * Generate confidence-based recommendations.
   *
   * @param confidenceMetrics - All confidence metrics
   * @param qualityIndicators - Quality indicators with grades
   * @returns Recommendations with reliability level, action items, and risk mitigation
   */
  public generateConfidenceRecommendations(
    confidenceMetrics: ConfidenceMetrics,
    qualityIndicators: QualityIndicators,
  ): ScoreReliabilityReport['recommendations'] {
    const overallConfidence =
      this.calculateOverallConfidence(confidenceMetrics);

    let scoringReliability: 'high' | 'medium' | 'low';
    if (overallConfidence >= 80) scoringReliability = 'high';
    else if (overallConfidence >= 60) scoringReliability = 'medium';
    else scoringReliability = 'low';

    const actionItems: string[] = [];
    const riskMitigation: string[] = [];

    // Generate action items based on grades
    if (
      qualityIndicators.dataQualityGrade === 'C' ||
      qualityIndicators.dataQualityGrade === 'D'
    ) {
      actionItems.push(
        'Request additional resume information for more accurate scoring',
      );
    }

    if (
      qualityIndicators.analysisDepthGrade === 'C' ||
      qualityIndicators.analysisDepthGrade === 'D'
    ) {
      actionItems.push(
        'Consider manual review to supplement algorithmic analysis',
      );
    }

    if (
      qualityIndicators.reliabilityGrade === 'C' ||
      qualityIndicators.reliabilityGrade === 'D'
    ) {
      actionItems.push(
        'Use scoring results as initial filter only, conduct thorough interviews',
      );
    }

    // Generate risk mitigation strategies
    if (scoringReliability === 'low') {
      riskMitigation.push('Treat scoring results as preliminary only');
      riskMitigation.push('Conduct additional assessment methods');
      riskMitigation.push('Consider multiple reviewer evaluations');
    }

    if (confidenceMetrics.dataQuality.score < 70) {
      riskMitigation.push(
        'Verify critical information during interview process',
      );
    }

    if (confidenceMetrics.scoreVariance.overallVariance > 1.5) {
      riskMitigation.push('Focus on areas with highest confidence scores');
      riskMitigation.push(
        'Use range-based evaluation rather than point scores',
      );
    }

    return {
      scoringReliability,
      actionItems,
      riskMitigation,
    };
  }

  /**
   * Generate fallback confidence report for error scenarios.
   *
   * @param componentScores - Individual scoring components
   * @returns Basic confidence report with conservative estimates
   */
  public fallbackConfidenceReport(
    componentScores: ComponentScores,
  ): ScoreReliabilityReport {
    return {
      overallConfidence: 50,
      confidenceMetrics: {
        dataQuality: {
          score: 60,
          factors: {
            completeness: 60,
            consistency: 60,
            recency: 60,
            detail: 60,
          },
          issues: ['Limited confidence analysis available'],
        },
        analysisReliability: {
          score: 50,
          factors: {
            algorithmConfidence: 50,
            aiResponseQuality: 50,
            evidenceStrength: 50,
            crossValidation: 50,
          },
          uncertainties: ['Analysis confidence could not be determined'],
        },
        scoreVariance: {
          skillsVariance: 1.0,
          experienceVariance: 1.0,
          culturalFitVariance: 1.0,
          overallVariance: 1.0,
          stabilityScore: 50,
        },
        recommendationCertainty: {
          level: 'medium',
          score: 50,
          factors: {
            scoringConsistency: 50,
            dataCompleteness: 50,
            algorithmMaturity: 50,
          },
          riskFactors: ['Confidence analysis failed'],
        },
      },
      reliabilityBand: {
        minScore: Math.max(0, componentScores.skills.score - 15),
        maxScore: Math.min(100, componentScores.skills.score + 15),
        mostLikelyScore: componentScores.skills.score,
        confidenceInterval: 30,
      },
      qualityIndicators: {
        dataQualityGrade: 'C',
        analysisDepthGrade: 'C',
        reliabilityGrade: 'C',
      },
      recommendations: {
        scoringReliability: 'medium',
        actionItems: ['Manual review recommended'],
        riskMitigation: ['Use as preliminary screening only'],
      },
    };
  }

  private identifyRiskFactors(
    dataQuality: DataQualityAssessment,
    analysisReliability: AnalysisReliabilityAssessment,
    scoreVariance: ScoreVarianceAssessment,
  ): string[] {
    const risks: string[] = [];

    if (dataQuality.score < 60) {
      risks.push('Poor data quality may affect scoring accuracy');
    }

    if (analysisReliability.score < 70) {
      risks.push('Analysis reliability concerns');
    }

    if (scoreVariance.stabilityScore < 70) {
      risks.push('High score variability indicates uncertainty');
    }

    if (scoreVariance.overallVariance > 1.5) {
      risks.push('Significant variance between scoring components');
    }

    return risks;
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
