import { Injectable, Logger, Optional } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type { JobRequirements } from './experience-analyzer.service';
import { CulturalAlignmentScorer } from './cultural-fit/cultural-alignment.scorer';
import { CulturalFitFallbackHelper } from './cultural-fit/cultural-fit-fallback.helper';
import { CulturalFitIndicatorsAnalyzer } from './cultural-fit/cultural-fit-indicators.analyzer';
import { CulturalRecommendationGenerator } from './cultural-fit/cultural-recommendation.generator';
import { SoftSkillsAssessor } from './cultural-fit/soft-skills.assessor';

export interface CulturalRecommendations {
  strengths: string[];
  concerns: string[];
  developmentAreas: string[];
}

/**
 * Defines the shape of the cultural fit indicators.
 */
export interface CulturalFitIndicators {
  companySize: {
    preference: 'startup' | 'scaleup' | 'enterprise' | 'mixed' | 'unknown';
    confidence: number;
    evidence: string[];
  };
  workStyle: {
    remoteReadiness: number;
    collaborationStyle: 'independent' | 'collaborative' | 'hybrid';
    adaptabilityScore: number;
    evidence: string[];
  };
  communicationSkills: {
    writtenCommunication: number;
    verbalCommunication: number;
    presentationSkills: number;
    evidence: string[];
  };
  leadershipPotential: {
    score: number;
    style:
      | 'directive'
      | 'collaborative'
      | 'servant'
      | 'transformational'
      | 'situational';
    mentorshipEvidence: string[];
    teamBuildingEvidence: string[];
  };
  innovationMindset: {
    score: number;
    creativityIndicators: string[];
    problemSolvingApproach:
      | 'analytical'
      | 'creative'
      | 'systematic'
      | 'intuitive';
  };
  professionalMaturity: {
    score: number;
    reliabilityIndicators: string[];
    accountability: number;
    continuousLearning: number;
  };
}

/**
 * Defines the shape of the soft skills assessment.
 */
export interface SoftSkillsAssessment {
  technicalCommunication: number;
  problemSolving: number;
  adaptability: number;
  teamwork: number;
  leadership: number;
  timeManagement: number;
  criticalThinking: number;
  emotionalIntelligence: number;
  evidence: {
    [skill: string]: string[];
  };
}

/**
 * Defines the shape of the company profile.
 */
export interface CompanyProfile {
  size: 'startup' | 'scaleup' | 'enterprise';
  culture: {
    values: string[];
    workStyle: 'remote' | 'hybrid' | 'on-site';
    decisionMaking: 'hierarchical' | 'collaborative' | 'autonomous';
    innovation: 'high' | 'medium' | 'low';
    growthStage: 'early' | 'growth' | 'mature';
  };
  teamStructure: {
    teamSize: number;
    managementLayers: number;
    collaborationStyle: 'cross-functional' | 'siloed' | 'matrix';
  };
}

/**
 * Defines the shape of the alignment scores.
 */
export interface AlignmentScores {
  companySizeAlignment: number;
  workStyleAlignment: number;
  leadershipAlignment: number;
  innovationAlignment: number;
  communicationAlignment: number;
}

/**
 * Defines the shape of the cultural fit score.
 */
export interface CulturalFitScore {
  overallScore: number;
  indicators: CulturalFitIndicators;
  softSkills: SoftSkillsAssessment;
  alignmentScores: AlignmentScores;
  confidence: number;
  recommendations: CulturalRecommendations;
}

/**
 * Facade for cultural fit and soft-skills analysis.
 */
@Injectable()
export class CulturalFitAnalyzerService {
  private readonly logger = new Logger(CulturalFitAnalyzerService.name);
  private readonly fallbackHelper: CulturalFitFallbackHelper;
  private readonly indicatorsAnalyzer: CulturalFitIndicatorsAnalyzer;
  private readonly softSkillsAssessor: SoftSkillsAssessor;
  private readonly alignmentScorer: CulturalAlignmentScorer;
  private readonly recommendationGenerator: CulturalRecommendationGenerator;

  constructor(
    private readonly geminiClient: GeminiClient,
    @Optional()
    fallbackHelper?: CulturalFitFallbackHelper,
    @Optional()
    indicatorsAnalyzer?: CulturalFitIndicatorsAnalyzer,
    @Optional()
    softSkillsAssessor?: SoftSkillsAssessor,
    @Optional()
    alignmentScorer?: CulturalAlignmentScorer,
    @Optional()
    recommendationGenerator?: CulturalRecommendationGenerator,
  ) {
    this.fallbackHelper = fallbackHelper ?? new CulturalFitFallbackHelper();
    this.indicatorsAnalyzer =
      indicatorsAnalyzer ??
      new CulturalFitIndicatorsAnalyzer(this.geminiClient, this.fallbackHelper);
    this.softSkillsAssessor =
      softSkillsAssessor ??
      new SoftSkillsAssessor(this.geminiClient, this.fallbackHelper);
    this.alignmentScorer = alignmentScorer ?? new CulturalAlignmentScorer();
    this.recommendationGenerator =
      recommendationGenerator ??
      new CulturalRecommendationGenerator(this.geminiClient);
  }

  /**
   * Comprehensive cultural fit and soft skills analysis.
   */
  public async analyzeCulturalFit(
    resume: ResumeDTO,
    companyProfile: CompanyProfile,
    jobRequirements: JobRequirements,
  ): Promise<CulturalFitScore> {
    const startTime = Date.now();

    try {
      if (!resume?.workExperience || resume.workExperience.length === 0) {
        return this.fallbackCulturalFitAnalysis(resume, companyProfile);
      }

      const indicators = await this.analyzeCulturalIndicators(
        resume,
        companyProfile,
      );
      const softSkills = await this.assessSoftSkills(resume, jobRequirements);
      const alignmentScores = this.calculateAlignmentScores(
        indicators,
        companyProfile,
      );
      const recommendations = await this.generateRecommendations(
        indicators,
        softSkills,
        companyProfile,
        alignmentScores,
      );
      const overallScore = this.calculateOverallCulturalFitScore(
        alignmentScores,
        softSkills,
      );
      const confidence = this.calculateCulturalFitConfidence(
        indicators,
        softSkills,
        resume,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`Cultural fit analysis completed in ${processingTime}ms`);

      return {
        overallScore,
        indicators,
        softSkills,
        alignmentScores,
        confidence,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Error in cultural fit analysis', error);
      return this.fallbackCulturalFitAnalysis(resume, companyProfile);
    }
  }

  private async analyzeCulturalIndicators(
    resume: ResumeDTO,
    companyProfile: CompanyProfile,
  ): Promise<CulturalFitIndicators> {
    return this.indicatorsAnalyzer.analyze(resume, companyProfile);
  }

  private async assessSoftSkills(
    resume: ResumeDTO,
    jobRequirements: JobRequirements,
  ): Promise<SoftSkillsAssessment> {
    return this.softSkillsAssessor.assess(resume, jobRequirements);
  }

  private calculateAlignmentScores(
    indicators: CulturalFitIndicators,
    companyProfile: CompanyProfile,
  ): AlignmentScores {
    return {
      companySizeAlignment: this.calculateCompanySizeAlignment(
        indicators.companySize.preference,
        companyProfile.size,
      ),
      workStyleAlignment: this.calculateWorkStyleAlignment(
        indicators.workStyle,
        companyProfile.culture,
      ),
      leadershipAlignment: this.calculateLeadershipAlignment(
        indicators.leadershipPotential,
        companyProfile.teamStructure.managementLayers,
      ),
      innovationAlignment: this.calculateInnovationAlignment(
        indicators.innovationMindset.score,
        companyProfile.culture.innovation,
      ),
      communicationAlignment: this.calculateCommunicationAlignment(
        indicators.communicationSkills,
        companyProfile.teamStructure.collaborationStyle,
      ),
    };
  }

  private calculateCompanySizeAlignment(
    candidatePreference: CulturalFitIndicators['companySize']['preference'],
    companySize: CompanyProfile['size'],
  ): number {
    return this.alignmentScorer.calculateCompanySizeAlignment(
      candidatePreference,
      companySize,
    );
  }

  private calculateWorkStyleAlignment(
    workStyle: CulturalFitIndicators['workStyle'],
    culture: CompanyProfile['culture'],
  ): number {
    return this.alignmentScorer.calculateWorkStyleAlignment(workStyle, culture);
  }

  private calculateLeadershipAlignment(
    leadership: CulturalFitIndicators['leadershipPotential'],
    managementLayers: number,
  ): number {
    return this.alignmentScorer.calculateLeadershipAlignment(
      leadership,
      managementLayers,
    );
  }

  private calculateInnovationAlignment(
    innovationScore: number,
    companyInnovation: CompanyProfile['culture']['innovation'],
  ): number {
    return this.alignmentScorer.calculateInnovationAlignment(
      innovationScore,
      companyInnovation,
    );
  }

  private calculateCommunicationAlignment(
    communication: CulturalFitIndicators['communicationSkills'],
    collaborationStyle: string,
  ): number {
    return this.alignmentScorer.calculateCommunicationAlignment(
      communication,
      collaborationStyle,
    );
  }

  private async generateRecommendations(
    indicators: CulturalFitIndicators,
    softSkills: SoftSkillsAssessment,
    companyProfile: CompanyProfile,
    alignmentScores: AlignmentScores,
  ): Promise<CulturalRecommendations> {
    return this.recommendationGenerator.generate(
      indicators,
      softSkills,
      companyProfile,
      alignmentScores,
    );
  }

  private calculateOverallCulturalFitScore(
    alignmentScores: AlignmentScores,
    softSkills: SoftSkillsAssessment,
  ): number {
    return this.alignmentScorer.calculateOverallScore(
      alignmentScores,
      softSkills,
    );
  }

  private calculateCulturalFitConfidence(
    indicators: CulturalFitIndicators,
    softSkills: SoftSkillsAssessment,
    resume: ResumeDTO,
  ): number {
    return this.alignmentScorer.calculateConfidence(
      indicators,
      softSkills,
      resume,
    );
  }

  private fallbackCulturalFitAnalysis(
    resume: ResumeDTO,
    _companyProfile: CompanyProfile,
  ): CulturalFitScore {
    const indicators = this.fallbackCulturalIndicators(resume);
    const softSkills = this.fallbackSoftSkillsAssessment(resume);

    return {
      overallScore: 60,
      indicators,
      softSkills,
      alignmentScores: {
        companySizeAlignment: 60,
        workStyleAlignment: 60,
        leadershipAlignment: 60,
        innovationAlignment: 60,
        communicationAlignment: 60,
      },
      confidence: 0.6,
      recommendations: {
        strengths: ['Professional background'],
        concerns: ['Limited analysis data'],
        developmentAreas: ['Communication', 'Leadership'],
      },
    };
  }

  private fallbackCulturalIndicators(resume: ResumeDTO): CulturalFitIndicators {
    return this.fallbackHelper.createCulturalIndicators(resume);
  }

  private fallbackSoftSkillsAssessment(
    resume: ResumeDTO,
  ): SoftSkillsAssessment {
    return this.fallbackHelper.createSoftSkillsAssessment(resume);
  }
}
