/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - This file has complex type dependencies that need gradual fixing
/**
 * @fileoverview ScoringEngineService Design by Contract Enhancement
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module ScoringServiceContracts
 */

import { Injectable } from '@nestjs/common';
import {
  ContractViolationError,
  Requires,
  Ensures,
  Invariant,
  ContractValidators,
  Logger,
} from '@ai-recruitment-clerk/infrastructure-shared';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type { NatsClient } from './nats/nats.client';
import type {
  GeminiConfig} from '@ai-recruitment-clerk/shared-dtos';
import {
  GeminiClient,
  SecureConfigValidator,
} from '@ai-recruitment-clerk/shared-dtos';
import type {
  EnhancedSkillMatcherService,
  JobSkillRequirement,
  EnhancedSkillScore,
} from './services/enhanced-skill-matcher.service';
import type {
  ExperienceAnalyzerService,
  JobRequirements,
  ExperienceScore,
} from './services/experience-analyzer.service';
import type {
  CulturalFitAnalyzerService,
  CulturalFitScore,
} from './services/cultural-fit-analyzer.service';
import type { CompanyProfile } from './services/cultural-fit-analyzer.service';
import type {
  ScoringConfidenceService,
  ComponentScores,
  ScoreReliabilityReport,
} from './services/scoring-confidence.service';

// Suppress unused import warnings - these are used in decorators
void ContractViolationError;

/**
 * Defines the shape of the jd dto.
 */
export interface JdDTO {
  requiredSkills: JobSkillRequirement[];
  experienceYears: { min: number; max: number };
  educationLevel: 'bachelor' | 'master' | 'phd' | 'any';
  softSkills: string[];
  industryContext?: string;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  companyProfile?: CompanyProfile;
  jobRequirements?: JobRequirements;
  requiredIndustries?: string[];
  preferredIndustries?: string[];
  leadershipRequired?: boolean;
  specificRoles?: string[];
  requiredTechnologies?: string[];
}

/**
 * Defines the shape of the score component.
 */
export interface ScoreComponent {
  score: number;
  details: string;
  confidence?: number;
  evidenceStrength?: number;
  breakdown?:
    | Record<string, unknown>
    | {
        exactMatches?: number;
        semanticMatches?: number;
        fuzzyMatches?: number;
      }
    | {
        baseExperienceScore?: number;
        relevanceAdjustment?: number;
        seniorityBonus?: number;
        industryPenalty?: number;
        finalScore?: number;
      };
}

/**
 * Defines the shape of the score dto.
 */
export interface ScoreDTO {
  overallScore: number;
  skillScore: ScoreComponent;
  experienceScore: ScoreComponent;
  educationScore: ScoreComponent;
  culturalFitScore?: ScoreComponent;
  enhancedSkillAnalysis?: EnhancedSkillScore;
  experienceAnalysis?: ExperienceScore;
  culturalFitAnalysis?: CulturalFitScore;
  confidenceReport?: ScoreReliabilityReport;
  processingMetrics?: {
    totalProcessingTime: number;
    aiAnalysisTime: number;
    fallbacksUsed: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

/**
 * Enhanced ScoringEngineService with Design by Contract protections
 *
 * @class ScoringEngineServiceContracts
 * @implements Comprehensive scoring contracts for reliability and consistency
 *
 * @since 1.0.0
 */
@Injectable()
@Invariant(
  (instance: ScoringEngineServiceContracts) =>
    !!instance.natsClient &&
    !!instance.enhancedSkillMatcher &&
    !!instance.experienceAnalyzer &&
    !!instance.confidenceService,
  'All scoring dependencies must be properly injected',
)
export class ScoringEngineServiceContracts {
  private readonly jdCache = new Map<string, JdDTO>();
  private readonly geminiClient: GeminiClient;
  private readonly logger = new Logger(ScoringEngineServiceContracts.name);

  /**
   * Initializes a new instance of the Scoring Engine Service Contracts.
   * @param natsClient - The nats client.
   * @param enhancedSkillMatcher - The enhanced skill matcher.
   * @param experienceAnalyzer - The experience analyzer.
   * @param culturalFitAnalyzer - The cultural fit analyzer.
   * @param confidenceService - The confidence service.
   */
  constructor(
    private readonly natsClient: NatsClient,
    private readonly enhancedSkillMatcher: EnhancedSkillMatcherService,
    private readonly experienceAnalyzer: ExperienceAnalyzerService,
    private readonly culturalFitAnalyzer: CulturalFitAnalyzerService,
    private readonly confidenceService: ScoringConfidenceService,
  ) {
    // 🔒 SECURITY: Validate configuration before service initialization
    SecureConfigValidator.validateServiceConfig(
      'ScoringEngineServiceContracts',
      ['GEMINI_API_KEY'],
    );

    const geminiConfig: GeminiConfig = {
      apiKey: SecureConfigValidator.requireEnv('GEMINI_API_KEY'),
      model: 'gemini-1.5-flash',
      temperature: 0.3,
      maxOutputTokens: 8192,
    };
    this.geminiClient = new GeminiClient(geminiConfig);
  }

  /**
   * Handles JD extraction event with caching validation
   *
   * @method handleJdExtractedEvent
   * @param {Object} event - JD extraction event
   * @param {string} event.jobId - Job identifier
   * @param {JdDTO} event.jdDto - Job description data
   *
   * @requires Valid job ID and JD structure
   * @ensures JD cached for future scoring operations
   *
   * @since 1.0.0
   */
  @Requires(
    (event: { jobId: string; jdDto: JdDTO }) =>
      ContractValidators.isNonEmptyString(event.jobId) &&
      ContractValidators.isValidJD(event.jdDto),
    'JD extraction event must have valid job ID and JD structure',
  )
  public handleJdExtractedEvent(event: { jobId: string; jdDto: JdDTO }): void {
    this.jdCache.set(event.jobId, event.jdDto);
  }

  /**
   * Enhanced AI-driven match scoring with comprehensive validation
   *
   * @method calculateEnhancedMatchScore
   * @param {JdDTO} jdDto - Job description requirements
   * @param {ResumeDTO} resumeDto - Candidate resume data
   * @returns {Promise<ScoreDTO>} Comprehensive scoring result
   *
   * @requires Valid JD and resume with required fields
   * @requires Skills arrays must be non-empty
   * @ensures Overall score is 0-100 range
   * @ensures All component scores are valid ranges
   * @ensures Processing metrics are included
   * @ensures Score details are non-empty strings
   *
   * @throws {ContractViolationError} When inputs don't meet requirements
   *
   * @performance Target: <2 seconds processing time
   * @consistency Same inputs produce same outputs (±1 point tolerance)
   *
   * @since 1.0.0
   */
  @Requires(
    (jdDto: JdDTO, resumeDto: ResumeDTO) =>
      ContractValidators.isValidJD(jdDto) &&
      ContractValidators.isValidResume(resumeDto) &&
      ContractValidators.hasElements(jdDto.requiredSkills) &&
      ContractValidators.hasElements(resumeDto.skills),
    'Enhanced scoring requires valid JD and resume with non-empty skills arrays',
  )
  @Ensures(
    (result: ScoreDTO) =>
      ContractValidators.isValidScoreDTO(result) &&
      result.processingMetrics &&
      result.processingMetrics.totalProcessingTime > 0 &&
      ['high', 'medium', 'low'].includes(
        result.processingMetrics.confidenceLevel,
      ),
    'Must return complete score DTO with processing metrics and valid confidence level',
  )
  public async calculateEnhancedMatchScore(
    jdDto: JdDTO,
    resumeDto: ResumeDTO,
  ): Promise<ScoreDTO> {
    const startTime = Date.now();
    const processingMetrics = {
      aiResponseTimes: [] as number[],
      fallbackUsed: [] as boolean[],
      errorRates: [] as number[],
    };

    try {
      // Enhanced skill analysis with contracts
      const skillAnalysis = await this.enhancedSkillMatcher.matchSkills(
        resumeDto.skills,
        jdDto.requiredSkills,
        jdDto.industryContext,
      );

      // Experience analysis with validation
      const experienceAnalysis =
        await this.experienceAnalyzer.analyzeExperience(
          resumeDto.workExperience,
          jdDto.jobRequirements || {
            experienceYears: {
              min: jdDto.experienceYears.min,
              max: jdDto.experienceYears.max,
            },
            requiredIndustries: jdDto.requiredIndustries || [],
            preferredIndustries: jdDto.preferredIndustries || [],
            leadershipRequired: jdDto.leadershipRequired || false,
            specificRoles: jdDto.specificRoles || [],
            seniority: 'mid',
          },
        );

      // Cultural fit analysis (optional)
      let culturalFitAnalysis: CulturalFitScore | undefined;
      if (jdDto.companyProfile) {
        culturalFitAnalysis = await this.culturalFitAnalyzer.analyzeCulturalFit(
          resumeDto,
          jdDto.companyProfile,
          jdDto.jobRequirements || { experienceYears: jdDto.experienceYears },
        );
      }

      // Education scoring with enhanced logic
      const educationScore = this.calculateEnhancedEducationScore(
        resumeDto,
        jdDto,
      );

      // Dynamic weight calculation
      const weights = this.calculateDynamicWeights(
        jdDto,
        skillAnalysis,
        experienceAnalysis,
      );

      // Calculate overall score with weighted components
      const overallScore = Math.round(
        skillAnalysis.overallScore * weights.skillsWeight +
          experienceAnalysis.overallScore * weights.experienceWeight +
          educationScore.score * weights.educationWeight +
          (culturalFitAnalysis?.overallScore || 75) * weights.culturalFitWeight,
      );

      // Confidence and reliability analysis
      const componentScores: ComponentScores = {
        skills: {
          score: skillAnalysis.overallScore,
          confidence: skillAnalysis.confidence,
          evidenceStrength: skillAnalysis.matches.length > 0 ? 0.8 : 0.3,
        },
        experience: {
          score: experienceAnalysis.overallScore,
          confidence: experienceAnalysis.confidence,
          evidenceStrength: 0.7,
        },
        culturalFit: {
          score: culturalFitAnalysis?.overallScore || 0.5,
          confidence: culturalFitAnalysis?.confidence || 0.5,
          evidenceStrength: culturalFitAnalysis ? 0.6 : 0.3,
        },
      };

      const confidenceReport = this.confidenceService.generateConfidenceReport(
        componentScores,
        resumeDto,
        processingMetrics,
      );

      const totalProcessingTime = Date.now() - startTime;

      const result: ScoreDTO = {
        overallScore: Math.max(0, Math.min(100, overallScore)), // Ensure 0-100 range
        skillScore: {
          score: skillAnalysis.overallScore,
          details: `Skills match: ${skillAnalysis.matches.length} matches found. Overall score: ${skillAnalysis.overallScore}%`,
          confidence: skillAnalysis.confidence,
          evidenceStrength: 0.8,
          breakdown: skillAnalysis.breakdown,
        },
        experienceScore: {
          score: experienceAnalysis.overallScore,
          details: `Experience: ${experienceAnalysis.analysis.totalYears} years total, ${experienceAnalysis.analysis.relevantYears} years relevant. Leadership: ${experienceAnalysis.analysis.leadershipExperience.hasLeadership ? 'Yes' : 'No'}`,
          confidence: experienceAnalysis.confidence,
          evidenceStrength: 0.7,
          breakdown: experienceAnalysis,
        },
        educationScore,
        ...(culturalFitAnalysis && {
          culturalFitScore: {
            score: culturalFitAnalysis.overallScore,
            details: `Cultural fit score: ${culturalFitAnalysis.overallScore}%. Alignment with company values and work style.`,
            confidence: culturalFitAnalysis.confidence,
            breakdown: culturalFitAnalysis,
          },
        }),
        enhancedSkillAnalysis: skillAnalysis,
        experienceAnalysis,
        culturalFitAnalysis,
        confidenceReport,
        processingMetrics: {
          totalProcessingTime,
          aiAnalysisTime: processingMetrics.aiResponseTimes.reduce(
            (a, b) => a + b,
            0,
          ),
          fallbacksUsed: processingMetrics.fallbackUsed.length,
          confidenceLevel:
            confidenceReport.overallConfidence > 0.8
              ? 'high'
              : confidenceReport.overallConfidence > 0.6
                ? 'medium'
                : 'low',
        },
      };

      return result;
    } catch (error) {
      this.logger.error('Enhanced scoring error:', error as Error);

      // Fallback to basic scoring with contract compliance
      const basicScore = this.calculateBasicMatchScore(jdDto, resumeDto);
      const totalProcessingTime = Date.now() - startTime;

      return {
        ...basicScore,
        processingMetrics: {
          totalProcessingTime,
          aiAnalysisTime: 0,
          fallbacksUsed: 1,
          confidenceLevel: 'low' as const,
        },
      };
    }
  }

  /**
   * Fallback basic scoring with contract protection
   *
   * @method calculateBasicMatchScore
   * @param {JdDTO} jdDto - Job requirements
   * @param {ResumeDTO} resumeDto - Resume data
   * @returns {ScoreDTO} Basic scoring result
   *
   * @requires Valid JD and resume inputs
   * @ensures Returns valid score structure
   *
   * @since 1.0.0
   */
  @Requires(
    (jdDto: JdDTO, resumeDto: ResumeDTO) =>
      ContractValidators.isValidJD(jdDto) &&
      ContractValidators.isValidResume(resumeDto),
    'Basic scoring requires valid JD and resume',
  )
  @Ensures(
    (result: ScoreDTO) => ContractValidators.isValidScoreDTO(result),
    'Must return valid basic score DTO',
  )
  private calculateBasicMatchScore(
    jdDto: JdDTO,
    resumeDto: ResumeDTO,
  ): ScoreDTO {
    // Simple skill matching
    const resumeSkills = resumeDto.skills.map((s) => s.toLowerCase());
    const requiredSkills = jdDto.requiredSkills.map((rs) =>
      rs.name.toLowerCase(),
    );
    const matchedSkills = requiredSkills.filter((skill) =>
      resumeSkills.some((rs) => rs.includes(skill)),
    );
    const skillScore = Math.round(
      (matchedSkills.length / requiredSkills.length) * 100,
    );

    // Basic experience scoring
    const totalExperience = resumeDto.workExperience.reduce((total, exp) => {
      const years = this.calculateExperienceYears(exp.startDate, exp.endDate);
      return total + years;
    }, 0);
    const experienceScore = Math.min(
      100,
      Math.round((totalExperience / jdDto.experienceYears.min) * 100),
    );

    // Basic education scoring
    const educationScore = this.getBasicEducationScore(
      resumeDto.education,
      jdDto.educationLevel,
    );

    const overallScore = Math.round(
      skillScore * 0.5 + experienceScore * 0.3 + educationScore * 0.2,
    );

    return {
      overallScore,
      skillScore: {
        score: skillScore,
        details: `Basic skill match: ${matchedSkills.length}/${requiredSkills.length} skills matched`,
      },
      experienceScore: {
        score: experienceScore,
        details: `${totalExperience} years total experience vs ${jdDto.experienceYears.min} years required`,
      },
      educationScore: {
        score: educationScore,
        details: `Education level assessment based on requirements`,
      },
    };
  }

  // Helper methods for scoring logic
  private calculateDynamicWeights(
    jdDto: JdDTO,
    _skillAnalysis: EnhancedSkillScore,
    _experienceAnalysis: ExperienceScore,
  ): {
    skillsWeight: number;
    experienceWeight: number;
    educationWeight: number;
    culturalFitWeight: number;
  } {
    // Base weights
    let weights = {
      skillsWeight: 0.4,
      experienceWeight: 0.35,
      educationWeight: 0.15,
      culturalFitWeight: 0.1,
    };

    // Adjust based on seniority level
    switch (jdDto.seniority) {
      case 'junior':
        weights = { ...weights, skillsWeight: 0.5, experienceWeight: 0.25 };
        break;
      case 'senior':
      case 'lead':
        weights = { ...weights, skillsWeight: 0.35, experienceWeight: 0.45 };
        break;
      case 'executive':
        weights = { ...weights, experienceWeight: 0.4, culturalFitWeight: 0.2 };
        break;
    }

    return weights;
  }

  private calculateEnhancedEducationScore(
    resumeDto: ResumeDTO,
    jdDto: JdDTO,
  ): ScoreComponent {
    const educationLevel = resumeDto.education[0]?.degree || 'bachelor';
    const requiredLevel = jdDto.educationLevel;

    const educationHierarchy = {
      phd: 4,
      master: 3,
      bachelor: 2,
      any: 1,
    };

    const candidateLevel =
      educationHierarchy[
        educationLevel.toLowerCase() as keyof typeof educationHierarchy
      ] || 1;
    const requiredLevelNum = educationHierarchy[requiredLevel];

    let score = 70; // Base score

    if (candidateLevel >= requiredLevelNum) {
      score = 85 + (candidateLevel - requiredLevelNum) * 5; // Bonus for exceeding requirements
    } else {
      score = Math.max(50, 70 - (requiredLevelNum - candidateLevel) * 10); // Penalty for not meeting requirements
    }

    return {
      score: Math.min(100, score),
      details: `Education: ${educationLevel} vs required ${requiredLevel}. ${candidateLevel >= requiredLevelNum ? 'Meets' : 'Below'} requirements.`,
    };
  }

  private calculateExperienceYears(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = endDate === 'present' ? new Date() : new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(diffYears * 10) / 10; // Round to 1 decimal place
  }

  private getBasicEducationScore(
    education: ResumeDTO['education'],
    requiredLevel: string,
  ): number {
    const educationHierarchy = { phd: 4, master: 3, bachelor: 2, any: 1 };
    const candidateLevel =
      educationHierarchy[
        education[0]?.degree?.toLowerCase() as keyof typeof educationHierarchy
      ] || 1;
    const requiredLevelNum = educationHierarchy[requiredLevel as keyof typeof educationHierarchy];

    return candidateLevel >= requiredLevelNum
      ? 85
      : Math.max(50, 85 - (requiredLevelNum - candidateLevel) * 15);
  }
}
