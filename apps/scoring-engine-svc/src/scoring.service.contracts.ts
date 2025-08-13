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
  ContractValidators 
} from '../../../libs/shared-dtos/src/contracts/dbc.decorators';
import { ResumeDTO } from '../../../libs/shared-dtos/src/models/resume.dto';
import { NatsClient } from './nats/nats.client';
import { GeminiClient, GeminiConfig } from '../../../libs/shared-dtos/src/gemini/gemini.client';
import { EnhancedSkillMatcherService, JobSkillRequirement, EnhancedSkillScore } from './services/enhanced-skill-matcher.service';
import { ExperienceAnalyzerService, JobRequirements, ExperienceScore } from './services/experience-analyzer.service';
import { CulturalFitAnalyzerService, CulturalFitScore } from './services/cultural-fit-analyzer.service';
import { CompanyProfile } from './services/cultural-fit-analyzer.service';
import { ScoringConfidenceService, ComponentScores, ScoreReliabilityReport } from './services/scoring-confidence.service';

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

export interface ScoreComponent {
  score: number;
  details: string;
  confidence?: number;
  evidenceStrength?: number;
  breakdown?: any;
}

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
  'All scoring dependencies must be properly injected'
)
export class ScoringEngineServiceContracts {
  private readonly jdCache = new Map<string, JdDTO>();
  private readonly geminiClient: GeminiClient;

  constructor(
    private readonly natsClient: NatsClient,
    private readonly enhancedSkillMatcher: EnhancedSkillMatcherService,
    private readonly experienceAnalyzer: ExperienceAnalyzerService,
    private readonly culturalFitAnalyzer: CulturalFitAnalyzerService,
    private readonly confidenceService: ScoringConfidenceService
  ) {
    const geminiConfig: GeminiConfig = {
      apiKey: process.env.GEMINI_API_KEY || 'your_gemini_api_key_here',
      model: 'gemini-1.5-flash',
      temperature: 0.3,
      maxOutputTokens: 8192
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
    'JD extraction event must have valid job ID and JD structure'
  )
  handleJdExtractedEvent(event: { jobId: string; jdDto: JdDTO }): void {
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
    'Enhanced scoring requires valid JD and resume with non-empty skills arrays'
  )
  @Ensures(
    (result: ScoreDTO) => 
      ContractValidators.isValidScoreDTO(result) &&
      result.processingMetrics &&
      result.processingMetrics.totalProcessingTime > 0 &&
      ['high', 'medium', 'low'].includes(result.processingMetrics.confidenceLevel),
    'Must return complete score DTO with processing metrics and valid confidence level'
  )
  async calculateEnhancedMatchScore(jdDto: JdDTO, resumeDto: ResumeDTO): Promise<ScoreDTO> {
    const startTime = Date.now();
    const processingMetrics = {
      aiResponseTimes: [] as number[],
      fallbackUsed: [] as boolean[],
      errorRates: [] as number[]
    };
    
    try {
      // Enhanced skill analysis with contracts
      const skillAnalysis = await this.enhancedSkillMatcher.matchSkills(
        resumeDto.skills, 
        jdDto.requiredSkills, 
        jdDto.industryContext
      );

      // Experience analysis with validation
      const experienceAnalysis = await this.experienceAnalyzer.analyzeExperience(
        resumeDto.workExperience,
        jdDto.jobRequirements || {
          experienceYears: { 
            min: jdDto.experienceYears.min, 
            max: jdDto.experienceYears.max 
          },
          requiredIndustries: jdDto.requiredIndustries || [],
          preferredIndustries: jdDto.preferredIndustries || [],
          leadershipRequired: jdDto.leadershipRequired || false,
          specificRoles: jdDto.specificRoles || [],
          seniority: 'mid'
        }
      );

      // Cultural fit analysis (optional)
      let culturalFitAnalysis: CulturalFitScore | undefined;
      if (jdDto.companyProfile) {
        culturalFitAnalysis = await this.culturalFitAnalyzer.analyzeCulturalFit(
          resumeDto,
          jdDto.companyProfile,
          jdDto.jobRequirements || { experienceYears: jdDto.experienceYears }
        );
      }

      // Education scoring with enhanced logic
      const educationScore = this.calculateEnhancedEducationScore(resumeDto, jdDto);

      // Dynamic weight calculation
      const weights = this.calculateDynamicWeights(jdDto, skillAnalysis, experienceAnalysis);

      // Calculate overall score with weighted components
      const overallScore = Math.round(
        skillAnalysis.overallScore * weights.skillsWeight +
        experienceAnalysis.overallScore * weights.experienceWeight +
        educationScore.score * weights.educationWeight +
        (culturalFitAnalysis?.overallScore || 75) * weights.culturalFitWeight
      );

      // Confidence and reliability analysis
      const componentScores: ComponentScores = {
        skills: {
          score: skillAnalysis.overallScore,
          confidence: skillAnalysis.confidence,
          evidenceStrength: skillAnalysis.matches.length > 0 ? 0.8 : 0.3
        },
        experience: {
          score: experienceAnalysis.overallScore,
          confidence: experienceAnalysis.confidence,
          evidenceStrength: 0.7
        },
        culturalFit: {
          score: culturalFitAnalysis?.overallScore || 0.5,
          confidence: culturalFitAnalysis?.confidence || 0.5,
          evidenceStrength: culturalFitAnalysis ? 0.6 : 0.3
        }
      };

      const confidenceReport = this.confidenceService.generateConfidenceReport(
        componentScores,
        resumeDto,
        processingMetrics
      );

      const totalProcessingTime = Date.now() - startTime;

      const result: ScoreDTO = {
        overallScore: Math.max(0, Math.min(100, overallScore)), // Ensure 0-100 range
        skillScore: {
          score: skillAnalysis.overallScore,
          details: `Skills match: ${skillAnalysis.matches.length} matches found. Overall score: ${skillAnalysis.overallScore}%`,
          confidence: skillAnalysis.confidence,
          evidenceStrength: 0.8,
          breakdown: skillAnalysis.breakdown
        },
        experienceScore: {
          score: experienceAnalysis.overallScore,
          details: `Experience: ${experienceAnalysis.analysis.totalYears} years total, ${experienceAnalysis.analysis.relevantYears} years relevant. Leadership: ${experienceAnalysis.analysis.leadershipExperience.hasLeadership ? 'Yes' : 'No'}`,
          confidence: experienceAnalysis.confidence,
          evidenceStrength: 0.7,
          breakdown: experienceAnalysis
        },
        educationScore,
        ...(culturalFitAnalysis && {
          culturalFitScore: {
            score: culturalFitAnalysis.overallScore,
            details: `Cultural fit score: ${culturalFitAnalysis.overallScore}%. Alignment with company values and work style.`,
            confidence: culturalFitAnalysis.confidence,
            breakdown: culturalFitAnalysis
          }
        }),
        enhancedSkillAnalysis: skillAnalysis,
        experienceAnalysis,
        culturalFitAnalysis,
        confidenceReport,
        processingMetrics: {
          totalProcessingTime,
          aiAnalysisTime: processingMetrics.aiResponseTimes.reduce((a, b) => a + b, 0),
          fallbacksUsed: processingMetrics.fallbackUsed.length,
          confidenceLevel: confidenceReport.overallConfidence > 0.8 ? 'high' : 
                          confidenceReport.overallConfidence > 0.6 ? 'medium' : 'low'
        }
      };

      return result;

    } catch (error) {
      console.error('Enhanced scoring error:', error);
      
      // Fallback to basic scoring with contract compliance
      const basicScore = this.calculateBasicMatchScore(jdDto, resumeDto);
      const totalProcessingTime = Date.now() - startTime;
      
      return {
        ...basicScore,
        processingMetrics: {
          totalProcessingTime,
          aiAnalysisTime: 0,
          fallbacksUsed: 1,
          confidenceLevel: 'low' as const
        }
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
      ContractValidators.isValidJD(jdDto) && ContractValidators.isValidResume(resumeDto),
    'Basic scoring requires valid JD and resume'
  )
  @Ensures(
    (result: ScoreDTO) => ContractValidators.isValidScoreDTO(result),
    'Must return valid basic score DTO'
  )
  private calculateBasicMatchScore(jdDto: JdDTO, resumeDto: ResumeDTO): ScoreDTO {
    // Simple skill matching
    const resumeSkills = resumeDto.skills.map(s => s.toLowerCase());
    const requiredSkills = jdDto.requiredSkills.map(rs => rs.name.toLowerCase());
    const matchedSkills = requiredSkills.filter(skill => 
      resumeSkills.some(rs => rs.includes(skill))
    );
    const skillScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);

    // Basic experience scoring
    const totalExperience = resumeDto.workExperience.reduce((total, exp) => {
      const years = this.calculateExperienceYears(exp.startDate, exp.endDate);
      return total + years;
    }, 0);
    const experienceScore = Math.min(100, Math.round((totalExperience / jdDto.experienceYears.min) * 100));

    // Basic education scoring
    const educationScore = this.getBasicEducationScore(resumeDto.education, jdDto.educationLevel);

    const overallScore = Math.round((skillScore * 0.5) + (experienceScore * 0.3) + (educationScore * 0.2));

    return {
      overallScore,
      skillScore: {
        score: skillScore,
        details: `Basic skill match: ${matchedSkills.length}/${requiredSkills.length} skills matched`
      },
      experienceScore: {
        score: experienceScore,
        details: `${totalExperience} years total experience vs ${jdDto.experienceYears.min} years required`
      },
      educationScore: {
        score: educationScore,
        details: `Education level assessment based on requirements`
      }
    };
  }

  // Helper methods for scoring logic
  private calculateDynamicWeights(
    jdDto: JdDTO, 
    skillAnalysis: EnhancedSkillScore, 
    experienceAnalysis: ExperienceScore
  ) {
    // Base weights
    let weights = {
      skillsWeight: 0.4,
      experienceWeight: 0.35,
      educationWeight: 0.15,
      culturalFitWeight: 0.1
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

  private calculateEnhancedEducationScore(resumeDto: ResumeDTO, jdDto: JdDTO): ScoreComponent {
    const educationLevel = resumeDto.education[0]?.degree || 'bachelor';
    const requiredLevel = jdDto.educationLevel;

    const educationHierarchy = {
      'phd': 4,
      'master': 3,
      'bachelor': 2,
      'any': 1
    };

    const candidateLevel = educationHierarchy[educationLevel.toLowerCase() as keyof typeof educationHierarchy] || 1;
    const requiredLevelNum = educationHierarchy[requiredLevel];

    let score = 70; // Base score
    
    if (candidateLevel >= requiredLevelNum) {
      score = 85 + (candidateLevel - requiredLevelNum) * 5; // Bonus for exceeding requirements
    } else {
      score = Math.max(50, 70 - (requiredLevelNum - candidateLevel) * 10); // Penalty for not meeting requirements
    }

    return {
      score: Math.min(100, score),
      details: `Education: ${educationLevel} vs required ${requiredLevel}. ${candidateLevel >= requiredLevelNum ? 'Meets' : 'Below'} requirements.`
    };
  }

  private calculateDataCompleteness(resumeDto: ResumeDTO): number {
    let completeness = 0;
    const maxFields = 6;

    if (resumeDto.contactInfo?.name) completeness += 1;
    if (resumeDto.skills?.length > 0) completeness += 1;
    if (resumeDto.workExperience?.length > 0) completeness += 1;
    if (resumeDto.education) completeness += 1;
    if (resumeDto.contactInfo?.email) completeness += 1;
    if (resumeDto.summary) completeness += 1;

    return completeness / maxFields;
  }

  private calculateExperienceYears(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = endDate === 'present' ? new Date() : new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(diffYears * 10) / 10; // Round to 1 decimal place
  }

  private getBasicEducationScore(education: any, requiredLevel: string): number {
    const educationHierarchy = { 'phd': 4, 'master': 3, 'bachelor': 2, 'any': 1 };
    const candidateLevel = educationHierarchy[education?.degree?.toLowerCase() as keyof typeof educationHierarchy] || 1;
    const requiredLevelNum = educationHierarchy[requiredLevel];
    
    return candidateLevel >= requiredLevelNum ? 85 : Math.max(50, 85 - (requiredLevelNum - candidateLevel) * 15);
  }
}