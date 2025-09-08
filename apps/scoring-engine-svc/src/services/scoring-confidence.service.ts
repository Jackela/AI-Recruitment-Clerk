import { Injectable, Logger } from '@nestjs/common';
import { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

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

export interface ProcessingMetrics {
  aiResponseTimes: number[];
  fallbackUsed: boolean[];
  errorRates: number[];
}

export interface DataQualityFactors {
  completeness: number;
  consistency: number;
  recency: number;
  detail: number;
}

export interface AnalysisReliabilityFactors {
  algorithmConfidence: number;
  aiResponseQuality: number;
  evidenceStrength: number;
  crossValidation: number;
}

export interface DataQualityAssessment {
  score: number;
  factors: DataQualityFactors;
  issues: string[];
}

export interface AnalysisReliabilityAssessment {
  score: number;
  factors: AnalysisReliabilityFactors;
  uncertainties: string[];
}

export interface ScoreVarianceAssessment {
  skillsVariance: number;
  experienceVariance: number;
  culturalFitVariance: number;
  overallVariance: number;
  stabilityScore: number;
}

export interface QualityIndicators {
  dataQualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  analysisDepthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  reliabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

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

@Injectable()
export class ScoringConfidenceService {
  private readonly logger = new Logger(ScoringConfidenceService.name);

  /**
   * Generate comprehensive confidence and reliability report
   */
  generateConfidenceReport(
    componentScores: ComponentScores,
    resume: ResumeDTO,
    processingMetrics: ProcessingMetrics,
  ): ScoreReliabilityReport {
    const startTime = Date.now();

    try {
      // Assess data quality
      const dataQuality = this.assessDataQuality(resume);

      // Assess analysis reliability
      const analysisReliability = this.assessAnalysisReliability(
        componentScores,
        processingMetrics,
      );

      // Calculate score variance
      const scoreVariance = this.calculateScoreVariance(componentScores);

      // Determine recommendation certainty
      const recommendationCertainty = this.calculateRecommendationCertainty(
        dataQuality,
        analysisReliability,
        scoreVariance,
      );

      // Combine into confidence metrics
      const confidenceMetrics: ConfidenceMetrics = {
        dataQuality,
        analysisReliability,
        scoreVariance,
        recommendationCertainty,
      };

      // Calculate overall confidence
      const overallConfidence =
        this.calculateOverallConfidence(confidenceMetrics);

      // Generate reliability band
      const reliabilityBand = this.calculateReliabilityBand(
        componentScores,
        confidenceMetrics,
      );

      // Generate quality indicators
      const qualityIndicators =
        this.generateQualityIndicators(confidenceMetrics);

      // Generate recommendations
      const recommendations = this.generateConfidenceRecommendations(
        confidenceMetrics,
        qualityIndicators,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`Confidence analysis completed in ${processingTime}ms`);

      return {
        overallConfidence,
        confidenceMetrics,
        reliabilityBand,
        qualityIndicators,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Error generating confidence report', error);
      return this.fallbackConfidenceReport(componentScores);
    }
  }

  /**
   * Assess data quality factors
   */
  private assessDataQuality(resume: ResumeDTO): DataQualityAssessment {
    // Completeness assessment
    const completeness = this.assessCompleteness(resume);

    // Consistency assessment
    const consistency = this.assessConsistency(resume);

    // Recency assessment
    const recency = this.assessRecency(resume);

    // Detail level assessment
    const detail = this.assessDetailLevel(resume);

    const factors = {
      completeness,
      consistency,
      recency,
      detail,
    };

    // Overall data quality score
    const score = Math.round(
      completeness * 0.3 + consistency * 0.25 + recency * 0.2 + detail * 0.25,
    );

    // Identify data quality issues
    const issues = this.identifyDataQualityIssues(factors, resume);

    return {
      score,
      factors,
      issues,
    };
  }

  private assessCompleteness(resume: ResumeDTO): number {
    let score = 100;

    // Contact info completeness
    if (!resume.contactInfo.name) score -= 15;
    if (!resume.contactInfo.email) score -= 15;
    if (!resume.contactInfo.phone) score -= 10;

    // Work experience completeness
    if (resume.workExperience.length === 0) score -= 30;
    const incompleteExperience = resume.workExperience.filter(
      (exp) => !exp.company || !exp.position || !exp.startDate || !exp.summary,
    ).length;
    score -= (incompleteExperience / resume.workExperience.length) * 20;

    // Education completeness
    if (resume.education.length === 0) score -= 15;
    const incompleteEducation = resume.education.filter(
      (edu) => !edu.school || !edu.degree,
    ).length;
    score -= (incompleteEducation / Math.max(1, resume.education.length)) * 10;

    // Skills completeness
    if (resume.skills.length === 0) score -= 20;
    if (resume.skills.length < 5) score -= 10;

    return Math.max(0, score);
  }

  private assessConsistency(resume: ResumeDTO): number {
    let score = 100;

    // Date consistency in work experience
    const dateInconsistencies = this.checkDateConsistency(
      resume.workExperience,
    );
    score -= dateInconsistencies * 10;

    // Position progression consistency
    const progressionIssues = this.checkProgressionConsistency(
      resume.workExperience,
    );
    score -= progressionIssues * 5;

    // Skills vs experience consistency
    const skillConsistencyScore = this.checkSkillConsistency(resume);
    score = Math.min(score, skillConsistencyScore);

    return Math.max(0, score);
  }

  private assessRecency(resume: ResumeDTO): number {
    if (resume.workExperience.length === 0) return 50;

    // Check most recent experience
    const mostRecent = resume.workExperience.reduce((latest, exp) => {
      const expEndDate =
        exp.endDate === 'present' ? new Date() : new Date(exp.endDate);
      const latestEndDate =
        latest.endDate === 'present' ? new Date() : new Date(latest.endDate);
      return expEndDate > latestEndDate ? exp : latest;
    });

    const endDate =
      mostRecent.endDate === 'present'
        ? new Date()
        : new Date(mostRecent.endDate);
    const monthsSinceLastJob =
      (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Score based on recency
    if (monthsSinceLastJob <= 3) return 100;
    if (monthsSinceLastJob <= 6) return 90;
    if (monthsSinceLastJob <= 12) return 80;
    if (monthsSinceLastJob <= 24) return 60;
    return 40;
  }

  private assessDetailLevel(resume: ResumeDTO): number {
    let score = 0;
    let totalItems = 0;

    // Work experience detail
    for (const exp of resume.workExperience) {
      totalItems++;
      if (exp.summary && exp.summary.length > 50) score += 25;
      else if (exp.summary && exp.summary.length > 20) score += 15;
      else if (exp.summary) score += 5;
    }

    // Education detail
    for (const edu of resume.education) {
      totalItems++;
      if (edu.major) score += 15;
      else score += 5;
    }

    // Skills detail
    if (resume.skills.length > 10) score += 20;
    else if (resume.skills.length > 5) score += 15;
    else if (resume.skills.length > 0) score += 10;
    totalItems++;

    return totalItems > 0 ? Math.min(100, score / totalItems) : 0;
  }

  private identifyDataQualityIssues(
    factors: DataQualityFactors,
    resume: ResumeDTO,
  ): string[] {
    const issues: string[] = [];

    if (factors.completeness < 70) {
      issues.push(
        'Missing critical information (contact, experience, or education)',
      );
    }

    if (factors.consistency < 70) {
      issues.push('Inconsistencies in dates or career progression');
    }

    if (factors.recency < 70) {
      issues.push('Resume may not reflect recent experience');
    }

    if (factors.detail < 50) {
      issues.push('Insufficient detail in job descriptions');
    }

    if (resume.workExperience.length === 0) {
      issues.push('No work experience provided');
    }

    if (resume.skills.length < 3) {
      issues.push('Very few skills listed');
    }

    return issues;
  }

  private checkDateConsistency(
    workExperience: ResumeDTO['workExperience'],
  ): number {
    let inconsistencies = 0;

    for (const exp of workExperience) {
      try {
        const startDate = new Date(exp.startDate);
        const endDate =
          exp.endDate === 'present' ? new Date() : new Date(exp.endDate);

        if (startDate > endDate) inconsistencies++;
        if (startDate > new Date()) inconsistencies++;
      } catch {
        inconsistencies++;
      }
    }

    return inconsistencies;
  }

  private checkProgressionConsistency(
    workExperience: ResumeDTO['workExperience'],
  ): number {
    if (workExperience.length < 2) return 0;

    // Sort by start date
    const sorted = [...workExperience].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    // Check for overlapping positions (might indicate inconsistency)
    let overlaps = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd =
        sorted[i - 1].endDate === 'present'
          ? new Date()
          : new Date(sorted[i - 1].endDate);
      const currentStart = new Date(sorted[i].startDate);

      if (currentStart < prevEnd) overlaps++;
    }

    return overlaps;
  }

  private checkSkillConsistency(resume: ResumeDTO): number {
    // Check if skills mentioned align with work experience descriptions
    const skillsLower = resume.skills.map((s) => s.toLowerCase());
    const experienceText = resume.workExperience
      .map((exp) => exp.summary.toLowerCase())
      .join(' ');

    const alignedSkills = skillsLower.filter(
      (skill) =>
        experienceText.includes(skill) ||
        experienceText.includes(skill.replace(/\./g, '')),
    );

    return resume.skills.length > 0
      ? Math.round((alignedSkills.length / resume.skills.length) * 100)
      : 100;
  }

  /**
   * Assess analysis reliability
   */
  private assessAnalysisReliability(
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

    const factors = {
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

  /**
   * Calculate score variance and stability
   */
  private calculateScoreVariance(
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
   * Calculate recommendation certainty
   */
  private calculateRecommendationCertainty(
    dataQuality: DataQualityAssessment,
    analysisReliability: AnalysisReliabilityAssessment,
    scoreVariance: ScoreVarianceAssessment,
  ) {
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

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
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
   * Calculate reliability band (confidence interval)
   */
  private calculateReliabilityBand(
    componentScores: ComponentScores,
    confidenceMetrics: ConfidenceMetrics,
  ) {
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
   * Generate quality indicator grades
   */
  private generateQualityIndicators(
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

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate confidence-based recommendations
   */
  private generateConfidenceRecommendations(
    confidenceMetrics: ConfidenceMetrics,
    qualityIndicators: QualityIndicators,
  ) {
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
   * Fallback confidence report for error scenarios
   */
  private fallbackConfidenceReport(
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
}
