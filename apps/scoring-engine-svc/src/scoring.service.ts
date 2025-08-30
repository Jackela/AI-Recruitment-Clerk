import { Injectable } from '@nestjs/common';
import { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import { ScoringEngineNatsService } from './services/scoring-engine-nats.service';
import { 
  SecureConfigValidator,
  ScoringEngineException,
  ScoringEngineErrorCode,
  ErrorCorrelationManager
} from '@ai-recruitment-clerk/infrastructure-shared';
import { GeminiClient, GeminiConfig } from '@ai-recruitment-clerk/ai-services-shared';
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
  // Enhanced fields
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
  breakdown?: Record<string, unknown> | {
    exactMatches?: number;
    semanticMatches?: number;
    fuzzyMatches?: number;
  } | {
    baseExperienceScore?: number;
    relevanceAdjustment?: number;
    seniorityBonus?: number;
    industryPenalty?: number;
    finalScore?: number;
  };
}

export interface ScoreDTO {
  overallScore: number;
  skillScore: ScoreComponent;
  experienceScore: ScoreComponent;
  educationScore: ScoreComponent;
  // Enhanced scoring components
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

@Injectable()
export class ScoringEngineService {
  private readonly jdCache = new Map<string, JdDTO>();
  private readonly geminiClient: GeminiClient;

  constructor(
    private readonly natsService: ScoringEngineNatsService,
    private readonly enhancedSkillMatcher: EnhancedSkillMatcherService,
    private readonly experienceAnalyzer: ExperienceAnalyzerService,
    private readonly culturalFitAnalyzer: CulturalFitAnalyzerService,
    private readonly confidenceService: ScoringConfidenceService
  ) {
    // 🔒 SECURITY: Validate configuration before service initialization
    SecureConfigValidator.validateServiceConfig('ScoringEngineService', ['GEMINI_API_KEY']);
    
    // Initialize Gemini client with validated environment configuration
    const geminiConfig: GeminiConfig = {
      apiKey: SecureConfigValidator.requireEnv('GEMINI_API_KEY'),
      model: 'gemini-1.5-flash',
      temperature: 0.3,
      maxOutputTokens: 8192
    };
    this.geminiClient = new GeminiClient(geminiConfig);
  }

  handleJdExtractedEvent(event: { jobId: string; jdDto: JdDTO }): void {
    this.jdCache.set(event.jobId, event.jdDto);
  }

  async handleResumeParsedEvent(event: {
    jobId: string;
    resumeId: string;
    resumeDto: ResumeDTO;
  }): Promise<void> {
    const startTime = Date.now();
    
    try {
      const jdDto = this.jdCache.get(event.jobId);
      if (!jdDto) {
        const correlationContext = ErrorCorrelationManager.getContext();
        throw new ScoringEngineException(
          ScoringEngineErrorCode.INSUFFICIENT_DATA,
          {
            jobId: event.jobId,
            cacheSize: this.jdCache.size,
            availableJobIds: Array.from(this.jdCache.keys()),
            correlationId: correlationContext?.traceId
          }
        );
      }
      
      const score = await this._calculateEnhancedMatchScore(jdDto, event.resumeDto);
      
      await this.natsService.emit('analysis.match.scored', {
        jobId: event.jobId,
        resumeId: event.resumeId,
        scoreDto: score,
      });
      
      // Publish enhanced performance metrics
      await this.natsService.publishScoringCompleted({
        jobId: event.jobId,
        resumeId: event.resumeId,
        matchScore: score.overallScore,
        processingTimeMs: Date.now() - startTime,
        enhancedMetrics: {
          aiAnalysisTime: score.processingMetrics?.aiAnalysisTime || 0,
          confidenceLevel: score.processingMetrics?.confidenceLevel || 'medium',
          fallbacksUsed: score.processingMetrics?.fallbacksUsed || 0,
          componentsProcessed: [
            'skills',
            'experience', 
            'education',
            ...(score.culturalFitAnalysis ? ['culturalFit'] : [])
          ]
        }
      });
      
    } catch (error) {
      const correlationContext = ErrorCorrelationManager.getContext();
      
      // Convert to ScoringEngineException if not already
      const scoringError = error instanceof ScoringEngineException 
        ? error 
        : new ScoringEngineException(
            ScoringEngineErrorCode.SCORING_ALGORITHM_FAILED,
            {
              originalError: error instanceof Error ? error.message : String(error),
              jobId: event.jobId,
              resumeId: event.resumeId,
              correlationId: correlationContext?.traceId
            }
          );
      
      await this.natsService.publishScoringError(event.jobId, event.resumeId, scoringError);
      
      // Fallback to basic scoring
      const jdDto = this.jdCache.get(event.jobId);
      if (jdDto) {
        const basicScore = this._calculateMatchScore(jdDto, event.resumeDto);
        await this.natsService.emit('analysis.match.scored', {
          jobId: event.jobId,
          resumeId: event.resumeId,
          scoreDto: basicScore,
        });
      } else {
        // If no JD found in cache, throw the error instead of failing silently
        throw new ScoringEngineException(
          ScoringEngineErrorCode.INSUFFICIENT_DATA,
          {
            jobId: event.jobId,
            resumeId: event.resumeId,
            originalError: scoringError.message,
            correlationId: correlationContext?.traceId
          }
        );
      }
    }
  }

  /**
   * Enhanced AI-driven scoring with comprehensive analysis
   */
  protected async _calculateEnhancedMatchScore(jdDto: JdDTO, resumeDto: ResumeDTO): Promise<ScoreDTO> {
    const startTime = Date.now();
    const processingMetrics = {
      aiResponseTimes: [],
      fallbackUsed: [],
      errorRates: []
    };
    
    try {
      // 1. Enhanced Skill Matching with AI
      const skillStartTime = Date.now();
      const enhancedSkillAnalysis = await this.enhancedSkillMatcher.matchSkills(
        resumeDto.skills,
        jdDto.requiredSkills,
        jdDto.industryContext
      );
      processingMetrics.aiResponseTimes.push(Date.now() - skillStartTime);
      processingMetrics.fallbackUsed.push(false);
      processingMetrics.errorRates.push(0);
      
      // 2. Experience Analysis with Dynamic Weighting
      const expStartTime = Date.now();
      const jobRequirements: JobRequirements = {
        experienceYears: jdDto.experienceYears,
        requiredIndustries: jdDto.requiredIndustries,
        preferredIndustries: jdDto.preferredIndustries,
        leadershipRequired: jdDto.leadershipRequired,
        specificRoles: jdDto.specificRoles,
        requiredTechnologies: jdDto.requiredTechnologies,
        seniority: jdDto.seniority || 'mid'
      };
      
      const experienceAnalysis = await this.experienceAnalyzer.analyzeExperience(
        resumeDto.workExperience,
        jobRequirements,
        jdDto.industryContext
      );
      processingMetrics.aiResponseTimes.push(Date.now() - expStartTime);
      processingMetrics.fallbackUsed.push(false);
      processingMetrics.errorRates.push(0);
      
      // 3. Cultural Fit Analysis (if company profile available)
      let culturalFitAnalysis: CulturalFitScore | null = null;
      if (jdDto.companyProfile) {
        const culturalStartTime = Date.now();
        culturalFitAnalysis = await this.culturalFitAnalyzer.analyzeCulturalFit(
          resumeDto,
          jdDto.companyProfile,
          jobRequirements
        );
        processingMetrics.aiResponseTimes.push(Date.now() - culturalStartTime);
        processingMetrics.fallbackUsed.push(false);
        processingMetrics.errorRates.push(0);
      }
      
      // 4. Education Scoring (enhanced)
      const educationScore = this._calculateEnhancedEducationScore(resumeDto, jdDto);
      
      // 5. Generate Component Scores for Confidence Analysis
      const componentScores: ComponentScores = {
        skills: {
          score: enhancedSkillAnalysis.overallScore,
          confidence: enhancedSkillAnalysis.confidence,
          evidenceStrength: enhancedSkillAnalysis.matches.length > 0 ? 80 : 40
        },
        experience: {
          score: experienceAnalysis.overallScore,
          confidence: experienceAnalysis.confidence,
          evidenceStrength: resumeDto.workExperience.length > 0 ? 75 : 30
        },
        culturalFit: {
          score: culturalFitAnalysis?.overallScore || 70,
          confidence: culturalFitAnalysis?.confidence || 0.6,
          evidenceStrength: culturalFitAnalysis ? 70 : 40
        }
      };
      
      // 6. Confidence and Reliability Analysis
      const confidenceReport = this.confidenceService.generateConfidenceReport(
        componentScores,
        resumeDto,
        processingMetrics
      );
      
      // 7. Calculate Final Weighted Score
      const weights = this._calculateDynamicWeights(jdDto, enhancedSkillAnalysis, experienceAnalysis);
      const overallScore = Math.round(
        enhancedSkillAnalysis.overallScore * weights.skills +
        experienceAnalysis.overallScore * weights.experience +
        educationScore.score * weights.education +
        (culturalFitAnalysis?.overallScore || 70) * weights.culturalFit
      );
      
      const totalProcessingTime = Date.now() - startTime;
      const aiAnalysisTime = processingMetrics.aiResponseTimes.reduce((a, b) => a + b, 0);
      
      return {
        overallScore,
        skillScore: {
          score: enhancedSkillAnalysis.overallScore / 100,
          details: `Enhanced AI matching: ${enhancedSkillAnalysis.matches.length} matches found with ${enhancedSkillAnalysis.confidence * 100}% confidence`,
          confidence: enhancedSkillAnalysis.confidence,
          evidenceStrength: componentScores.skills.evidenceStrength,
          breakdown: enhancedSkillAnalysis.breakdown
        },
        experienceScore: {
          score: experienceAnalysis.overallScore / 100,
          details: `Dynamic analysis: ${experienceAnalysis.analysis.totalYears.toFixed(1)} years total, ${experienceAnalysis.analysis.relevantYears.toFixed(1)} relevant`,
          confidence: experienceAnalysis.confidence,
          evidenceStrength: componentScores.experience.evidenceStrength,
          breakdown: experienceAnalysis.breakdown
        },
        educationScore: educationScore,
        culturalFitScore: culturalFitAnalysis ? {
          score: culturalFitAnalysis.overallScore / 100,
          details: `Cultural alignment: ${Object.values(culturalFitAnalysis.alignmentScores).reduce((a, b) => a + b, 0) / Object.keys(culturalFitAnalysis.alignmentScores).length}% avg alignment`,
          confidence: culturalFitAnalysis.confidence,
          evidenceStrength: componentScores.culturalFit.evidenceStrength,
          breakdown: culturalFitAnalysis.alignmentScores
        } : undefined,
        enhancedSkillAnalysis,
        experienceAnalysis,
        culturalFitAnalysis,
        confidenceReport,
        processingMetrics: {
          totalProcessingTime,
          aiAnalysisTime,
          fallbacksUsed: processingMetrics.fallbackUsed.filter(f => f).length,
          confidenceLevel: confidenceReport.recommendations.scoringReliability
        }
      };
      
    } catch (error) {
      const correlationContext = ErrorCorrelationManager.getContext();
      
      // Convert to ScoringEngineException with detailed context
      const scoringError = error instanceof ScoringEngineException 
        ? error 
        : new ScoringEngineException(
            ScoringEngineErrorCode.MODEL_PREDICTION_FAILED,
            {
              originalError: error instanceof Error ? error.message : String(error),
              processingTimeMs: Date.now() - startTime,
              fallbackTriggered: true,
              correlationId: correlationContext?.traceId
            }
          );
      
      processingMetrics.fallbackUsed.push(true);
      processingMetrics.errorRates.push(1);
      
      // Log enhanced error details for debugging
      console.error('[SCORING-ENGINE] Enhanced scoring failed, falling back to basic scoring:', {
        error: scoringError.message,
        correlationId: correlationContext?.traceId,
        processingTime: Date.now() - startTime
      });
      
      // Fallback to basic scoring with error information
      const basicScore = this._calculateMatchScore(jdDto, resumeDto);
      basicScore.processingMetrics = {
        totalProcessingTime: Date.now() - startTime,
        aiAnalysisTime: 0,
        fallbacksUsed: 1,
        confidenceLevel: 'low'
      };
      
      return basicScore;
    }
  }
  
  /**
   * Calculate dynamic weights based on job requirements and analysis results
   */
  private _calculateDynamicWeights(jdDto: JdDTO, skillAnalysis: EnhancedSkillScore, experienceAnalysis: ExperienceScore) {
    // Base weights
    let skillsWeight = 0.5;
    let experienceWeight = 0.3;
    let educationWeight = 0.2;
    let culturalFitWeight = 0.0;
    
    // Adjust based on seniority level
    if (jdDto.seniority === 'senior' || jdDto.seniority === 'lead' || jdDto.seniority === 'executive') {
      experienceWeight += 0.1;
      skillsWeight -= 0.05;
      educationWeight -= 0.05;
    }
    
    // Increase cultural fit weight if company profile is available
    if (jdDto.companyProfile) {
      culturalFitWeight = 0.15;
      skillsWeight -= 0.05;
      experienceWeight -= 0.05;
      educationWeight -= 0.05;
    }
    
    // Adjust based on required skills count
    if (jdDto.requiredSkills.length > 10) {
      skillsWeight += 0.1;
      experienceWeight -= 0.05;
      educationWeight -= 0.05;
    }
    
    // Adjust based on leadership requirements
    if (jdDto.leadershipRequired) {
      experienceWeight += 0.1;
      culturalFitWeight += 0.05;
      skillsWeight -= 0.1;
      educationWeight -= 0.05;
    }
    
    return {
      skills: Math.max(0.2, skillsWeight),
      experience: Math.max(0.2, experienceWeight),
      education: Math.max(0.05, educationWeight),
      culturalFit: Math.max(0.0, culturalFitWeight)
    };
  }
  
  /**
   * Enhanced education scoring with degree relevance
   */
  private _calculateEnhancedEducationScore(resumeDto: ResumeDTO, jdDto: JdDTO): ScoreComponent {
    if (resumeDto.education.length === 0) {
      return {
        score: 0,
        details: 'No education information provided',
        confidence: 0.9,
        evidenceStrength: 0
      };
    }
    
    const degreeMap: Record<string, number> = {
      any: 0,
      bachelor: 1,
      master: 2,
      phd: 3,
    };
    
    const requiredLevel = degreeMap[jdDto.educationLevel] || 0;
    const highestEducation = resumeDto.education.reduce((acc, edu) => {
      const level = degreeMap[edu.degree.toLowerCase()] ?? 0;
      return Math.max(acc, level);
    }, 0);
    
    // Base score
    let score = highestEducation >= requiredLevel ? 1.0 : (highestEducation / Math.max(requiredLevel, 1));
    
    // Bonus for exceeding requirements
    if (highestEducation > requiredLevel && requiredLevel > 0) {
      score = Math.min(1.2, score + 0.1); // Up to 20% bonus
    }
    
    // Bonus for relevant major (if determinable from skills/experience)
    const relevantMajors = this._identifyRelevantMajors(resumeDto, jdDto);
    const hasRelevantMajor = resumeDto.education.some(edu => 
      edu.major && relevantMajors.some(relevant => 
        edu.major.toLowerCase().includes(relevant.toLowerCase())
      )
    );
    
    if (hasRelevantMajor) {
      score = Math.min(1.3, score + 0.1);
    }
    
    const finalScore = Math.max(0, Math.min(1, score));
    
    return {
      score: finalScore,
      details: `Education level: ${this._getEducationLevelName(highestEducation)}, Required: ${this._getEducationLevelName(requiredLevel)}${hasRelevantMajor ? ', Relevant major found' : ''}`,
      confidence: 0.95,
      evidenceStrength: resumeDto.education.length > 0 ? 90 : 0
    };
  }
  
  private _identifyRelevantMajors(resumeDto: ResumeDTO, jdDto: JdDTO): string[] {
    // Simple heuristic based on common tech skills -> major mappings
    const techSkills = resumeDto.skills.filter(skill => 
      ['programming', 'software', 'computer', 'engineering', 'development'].some(tech => 
        skill.toLowerCase().includes(tech)
      )
    );
    
    if (techSkills.length > 0) {
      return ['computer science', 'software engineering', 'information technology', 'engineering'];
    }
    
    return [];
  }
  
  private _getEducationLevelName(level: number): string {
    const levelNames = {
      0: 'Any',
      1: 'Bachelor',
      2: 'Master',
      3: 'PhD'
    };
    return levelNames[level] || 'Unknown';
  }
  
  /**
   * Legacy basic scoring method for fallback
   */
  protected _calculateMatchScore(jdDto: JdDTO, resumeDto: ResumeDTO): ScoreDTO {
    // Handle both old and new JdDTO format
    const skillsArray = Array.isArray(jdDto.requiredSkills) 
      ? jdDto.requiredSkills.map(s => typeof s === 'string' ? s : s.name)
      : [];
    
    const jdSkills = new Set(skillsArray.map((s) => s.toLowerCase()));
    const resumeSkills = new Set(
      resumeDto.skills.map((s) => s.toLowerCase()),
    );
    const matchedSkills = [...jdSkills].filter((s) => resumeSkills.has(s));
    const skillScoreValue =
      jdSkills.size > 0 ? matchedSkills.length / jdSkills.size : 0;

    const totalYears = resumeDto.workExperience.reduce((acc, w) => {
      const start = new Date(w.startDate);
      const end = w.endDate === 'present' ? new Date() : new Date(w.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      return acc + months;
    }, 0) / 12;

    let experienceScoreValue = 0;
    if (totalYears >= jdDto.experienceYears.min) {
      experienceScoreValue = 1;
    } else if (jdDto.experienceYears.min > 0) {
      experienceScoreValue = totalYears / jdDto.experienceYears.min;
    }

    const degreeMap: Record<string, number> = {
      any: 0,
      bachelor: 1,
      master: 2,
      phd: 3,
    };
    const highest = resumeDto.education.reduce((acc, e) => {
      const level = degreeMap[e.degree.toLowerCase()] ?? 0;
      return Math.max(acc, level);
    }, 0);
    const educationScoreValue =
      highest >= degreeMap[jdDto.educationLevel] ? 1 : 0;

    const overallScore = Math.round(
      (skillScoreValue * 0.5 + experienceScoreValue * 0.3 + educationScoreValue * 0.2) *
        100,
    );

    return {
      overallScore,
      skillScore: {
        score: skillScoreValue,
        details: `${matchedSkills.length} of ${jdSkills.size} skills matched (legacy scoring).`,
        confidence: 0.7,
        evidenceStrength: 50
      },
      experienceScore: {
        score: experienceScoreValue,
        details: `${totalYears.toFixed(1)} years experience vs ${jdDto.experienceYears.min} required (legacy scoring).`,
        confidence: 0.8,
        evidenceStrength: 60
      },
      educationScore: {
        score: educationScoreValue,
        details: `Education requirement ${educationScoreValue ? 'met' : 'not met'} (legacy scoring).`,
        confidence: 0.9,
        evidenceStrength: 70
      },
    };
  }
}
