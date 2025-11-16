import { Injectable, Logger } from '@nestjs/common';
import { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import { JobRequirements } from './experience-analyzer.service';

interface CulturalRecommendations {
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
    remoteReadiness: number; // 0-100
    collaborationStyle: 'independent' | 'collaborative' | 'hybrid';
    adaptabilityScore: number; // 0-100
    evidence: string[];
  };
  communicationSkills: {
    writtenCommunication: number; // 0-100
    verbalCommunication: number; // 0-100
    presentationSkills: number; // 0-100
    evidence: string[];
  };
  leadershipPotential: {
    score: number; // 0-100
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
    score: number; // 0-100
    creativityIndicators: string[];
    problemSolvingApproach:
      | 'analytical'
      | 'creative'
      | 'systematic'
      | 'intuitive';
  };
  professionalMaturity: {
    score: number; // 0-100
    reliabilityIndicators: string[];
    accountability: number; // 0-100
    continuousLearning: number; // 0-100
  };
}

/**
 * Defines the shape of the soft skills assessment.
 */
export interface SoftSkillsAssessment {
  technicalCommunication: number; // 0-100
  problemSolving: number; // 0-100
  adaptability: number; // 0-100
  teamwork: number; // 0-100
  leadership: number; // 0-100
  timeManagement: number; // 0-100
  criticalThinking: number; // 0-100
  emotionalIntelligence: number; // 0-100
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
  recommendations: {
    strengths: string[];
    concerns: string[];
    developmentAreas: string[];
  };
}

/**
 * Provides cultural fit analyzer functionality.
 */
@Injectable()
export class CulturalFitAnalyzerService {
  private readonly logger = new Logger(CulturalFitAnalyzerService.name);

  /**
   * Initializes a new instance of the Cultural Fit Analyzer Service.
   * @param geminiClient - The gemini client.
   */
  constructor(private readonly geminiClient: GeminiClient) {}

  /**
   * Comprehensive cultural fit and soft skills analysis
   */
  async analyzeCulturalFit(
    resume: ResumeDTO,
    companyProfile: CompanyProfile,
    jobRequirements: JobRequirements,
  ): Promise<CulturalFitScore> {
    const startTime = Date.now();

    try {
      // Analyze cultural fit indicators
      const indicators = await this.analyzeCulturalIndicators(
        resume,
        companyProfile,
      );

      // Assess soft skills
      const softSkills = await this.assessSoftSkills(resume, jobRequirements);

      // Calculate alignment scores
      const alignmentScores = this.calculateAlignmentScores(
        indicators,
        companyProfile,
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        indicators,
        softSkills,
        companyProfile,
        alignmentScores,
      );

      // Calculate overall score
      const overallScore = this.calculateOverallCulturalFitScore(
        alignmentScores,
        softSkills,
      );

      // Calculate confidence
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

  /**
   * Analyze cultural fit indicators using AI
   */
  private async analyzeCulturalIndicators(
    resume: ResumeDTO,
    companyProfile: CompanyProfile,
  ): Promise<CulturalFitIndicators> {
    const experienceText = resume.workExperience
      .map(
        (exp) =>
          `${exp.position} at ${exp.company} (${exp.startDate} to ${exp.endDate}): ${exp.summary}`,
      )
      .join('\n\n');

    const prompt = `
      Analyze this professional background for cultural fit indicators:
      
      WORK EXPERIENCE:
      ${experienceText}
      
      SKILLS:
      ${resume.skills.join(', ')}
      
      TARGET COMPANY PROFILE:
      - Size: ${companyProfile.size}
      - Culture: ${JSON.stringify(companyProfile.culture)}
      - Team Structure: ${JSON.stringify(companyProfile.teamStructure)}
      
      Analyze the following cultural fit dimensions:

      1. Company Size Preference (based on work history pattern)
      2. Work Style (remote readiness, collaboration, adaptability)
      3. Communication Skills (written, verbal, presentation abilities)
      4. Leadership Potential (style, mentorship, team building)
      5. Innovation Mindset (creativity, problem-solving approach)
      6. Professional Maturity (reliability, accountability, learning)

      Return analysis in JSON format:
      {
        "companySize": {
          "preference": "startup|scaleup|enterprise|mixed|unknown",
          "confidence": number (0-100),
          "evidence": ["array of evidence from experience"]
        },
        "workStyle": {
          "remoteReadiness": number (0-100),
          "collaborationStyle": "independent|collaborative|hybrid",
          "adaptabilityScore": number (0-100),
          "evidence": ["array of evidence"]
        },
        "communicationSkills": {
          "writtenCommunication": number (0-100),
          "verbalCommunication": number (0-100),
          "presentationSkills": number (0-100),
          "evidence": ["array of evidence"]
        },
        "leadershipPotential": {
          "score": number (0-100),
          "style": "directive|collaborative|servant|transformational|situational",
          "mentorshipEvidence": ["array"],
          "teamBuildingEvidence": ["array"]
        },
        "innovationMindset": {
          "score": number (0-100),
          "creativityIndicators": ["array"],
          "problemSolvingApproach": "analytical|creative|systematic|intuitive"
        },
        "professionalMaturity": {
          "score": number (0-100),
          "reliabilityIndicators": ["array"],
          "accountability": number (0-100),
          "continuousLearning": number (0-100)
        }
      }
    `;

    try {
      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "companySize": {
            "preference": "string",
            "confidence": "number",
            "evidence": ["array of strings"]
          },
          "workStyle": {
            "remoteReadiness": "number",
            "collaborationStyle": "string",
            "adaptabilityScore": "number",
            "evidence": ["array of strings"]
          },
          "communicationSkills": {
            "writtenCommunication": "number",
            "verbalCommunication": "number",
            "presentationSkills": "number",
            "evidence": ["array of strings"]
          },
          "leadershipPotential": {
            "score": "number",
            "style": "string",
            "mentorshipEvidence": ["array of strings"],
            "teamBuildingEvidence": ["array of strings"]
          },
          "innovationMindset": {
            "score": "number",
            "creativityIndicators": ["array of strings"],
            "problemSolvingApproach": "string"
          },
          "professionalMaturity": {
            "score": "number",
            "reliabilityIndicators": ["array of strings"],
            "accountability": "number",
            "continuousLearning": "number"
          }
        }`,
      );

      return response.data as CulturalFitIndicators;
    } catch (error) {
      this.logger.warn(
        'AI cultural indicators analysis failed, using fallback',
        error,
      );
      return this.fallbackCulturalIndicators(resume);
    }
  }

  /**
   * Assess soft skills using AI analysis
   */
  private async assessSoftSkills(
    resume: ResumeDTO,
    _jobRequirements: JobRequirements,
  ): Promise<SoftSkillsAssessment> {
    const experienceText = resume.workExperience
      .map((exp) => `${exp.position} at ${exp.company}: ${exp.summary}`)
      .join('\n');

    const prompt = `
      Assess soft skills based on this professional background:
      
      EXPERIENCE:
      ${experienceText}
      
      SKILLS MENTIONED:
      ${resume.skills.join(', ')}
      
      EDUCATION:
      ${resume.education.map((edu) => `${edu.degree} in ${edu.major || 'N/A'} from ${edu.school}`).join(', ')}
      
      Rate the following soft skills (0-100) based on evidence in the background:
      
      1. Technical Communication - ability to explain complex concepts
      2. Problem Solving - analytical and creative problem-solving abilities
      3. Adaptability - flexibility in changing environments
      4. Teamwork - collaboration and team contribution
      5. Leadership - ability to guide and influence others
      6. Time Management - project delivery and organizational skills
      7. Critical Thinking - analytical reasoning and decision-making
      8. Emotional Intelligence - interpersonal skills and self-awareness
      
      Provide evidence for each assessment from the resume content.
      
      Return in JSON format:
      {
        "technicalCommunication": number (0-100),
        "problemSolving": number (0-100),
        "adaptability": number (0-100),
        "teamwork": number (0-100),
        "leadership": number (0-100),
        "timeManagement": number (0-100),
        "criticalThinking": number (0-100),
        "emotionalIntelligence": number (0-100),
        "evidence": {
          "technicalCommunication": ["evidence array"],
          "problemSolving": ["evidence array"],
          "adaptability": ["evidence array"],
          "teamwork": ["evidence array"],
          "leadership": ["evidence array"],
          "timeManagement": ["evidence array"],
          "criticalThinking": ["evidence array"],
          "emotionalIntelligence": ["evidence array"]
        }
      }
    `;

    try {
      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "technicalCommunication": "number between 0-100",
          "problemSolving": "number between 0-100",
          "adaptability": "number between 0-100",
          "teamwork": "number between 0-100",
          "leadership": "number between 0-100",
          "timeManagement": "number between 0-100",
          "criticalThinking": "number between 0-100",
          "emotionalIntelligence": "number between 0-100",
          "evidence": {
            "technicalCommunication": ["array of evidence strings"],
            "problemSolving": ["array of evidence strings"],
            "adaptability": ["array of evidence strings"],
            "teamwork": ["array of evidence strings"],
            "leadership": ["array of evidence strings"],
            "timeManagement": ["array of evidence strings"],
            "criticalThinking": ["array of evidence strings"],
            "emotionalIntelligence": ["array of evidence strings"]
          }
        }`,
      );

      return response.data as SoftSkillsAssessment;
    } catch (error) {
      this.logger.warn(
        'AI soft skills assessment failed, using fallback',
        error,
      );
      return this.fallbackSoftSkillsAssessment(resume);
    }
  }

  /**
   * Calculate alignment scores between candidate and company profile
   */
  private calculateAlignmentScores(
    indicators: CulturalFitIndicators,
    companyProfile: CompanyProfile,
  ) {
    // Company size alignment
    const companySizeAlignment = this.calculateCompanySizeAlignment(
      indicators.companySize.preference,
      companyProfile.size,
    );

    // Work style alignment
    const workStyleAlignment = this.calculateWorkStyleAlignment(
      indicators.workStyle,
      companyProfile.culture,
    );

    // Leadership alignment
    const leadershipAlignment = this.calculateLeadershipAlignment(
      indicators.leadershipPotential,
      companyProfile.teamStructure.managementLayers,
    );

    // Innovation alignment
    const innovationAlignment = this.calculateInnovationAlignment(
      indicators.innovationMindset.score,
      companyProfile.culture.innovation,
    );

    // Communication alignment
    const communicationAlignment = this.calculateCommunicationAlignment(
      indicators.communicationSkills,
      companyProfile.teamStructure.collaborationStyle,
    );

    return {
      companySizeAlignment,
      workStyleAlignment,
      leadershipAlignment,
      innovationAlignment,
      communicationAlignment,
    };
  }

  private calculateCompanySizeAlignment(
    candidatePreference: CulturalFitIndicators['companySize']['preference'],
    companySize: CompanyProfile['size'],
  ): number {
    const alignmentMatrix: Record<
      CulturalFitIndicators['companySize']['preference'],
      Record<CompanyProfile['size'], number>
    > = {
      startup: { startup: 100, scaleup: 70, enterprise: 30 },
      scaleup: { startup: 70, scaleup: 100, enterprise: 80 },
      enterprise: { startup: 40, scaleup: 80, enterprise: 100 },
      mixed: { startup: 85, scaleup: 90, enterprise: 85 },
      unknown: { startup: 60, scaleup: 60, enterprise: 60 },
    };

    return alignmentMatrix[candidatePreference]?.[companySize] || 50;
  }

  private calculateWorkStyleAlignment(
    workStyle: CulturalFitIndicators['workStyle'],
    culture: CompanyProfile['culture'],
  ): number {
    let score = 70; // Base score

    // Remote readiness vs work style
    if (culture.workStyle === 'remote' && workStyle.remoteReadiness > 80)
      score += 20;
    if (culture.workStyle === 'on-site' && workStyle.remoteReadiness < 40)
      score += 10;
    if (culture.workStyle === 'hybrid') score += 10; // Neutral for hybrid

    // Collaboration style alignment
    if (
      culture.decisionMaking === 'collaborative' &&
      workStyle.collaborationStyle === 'collaborative'
    )
      score += 15;
    if (
      culture.decisionMaking === 'autonomous' &&
      workStyle.collaborationStyle === 'independent'
    )
      score += 15;

    return Math.min(100, Math.max(0, score));
  }

  private calculateLeadershipAlignment(
    leadership: CulturalFitIndicators['leadershipPotential'],
    managementLayers: number,
  ): number {
    let score = leadership.score;

    // Adjust based on management structure
    if (managementLayers > 3 && leadership.style === 'directive') score += 10;
    if (managementLayers <= 2 && leadership.style === 'collaborative')
      score += 15;
    if (managementLayers === 1 && leadership.style === 'servant') score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private calculateInnovationAlignment(
    innovationScore: number,
    companyInnovation: CompanyProfile['culture']['innovation'],
  ): number {
    const innovationRequirements: Record<CompanyProfile['culture']['innovation'], number> = {
      high: 80,
      medium: 60,
      low: 40,
    };

    const required = innovationRequirements[companyInnovation] || 60;
    return Math.min(100, (innovationScore / required) * 100);
  }

  private calculateCommunicationAlignment(
    communication: CulturalFitIndicators['communicationSkills'],
    collaborationStyle: string,
  ): number {
    let score =
      (communication.writtenCommunication + communication.verbalCommunication) /
      2;

    // Adjust for collaboration style
    if (
      collaborationStyle === 'cross-functional' &&
      communication.presentationSkills > 70
    )
      score += 10;
    if (
      collaborationStyle === 'matrix' &&
      communication.verbalCommunication > 80
    )
      score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(
    _indicators: CulturalFitIndicators,
    softSkills: SoftSkillsAssessment,
    companyProfile: CompanyProfile,
    alignmentScores: AlignmentScores,
  ) {
    try {
      const prompt = `
        Generate hiring recommendations based on cultural fit analysis:
        
        ALIGNMENT SCORES:
        - Company Size: ${alignmentScores.companySizeAlignment}%
        - Work Style: ${alignmentScores.workStyleAlignment}%
        - Leadership: ${alignmentScores.leadershipAlignment}%
        - Innovation: ${alignmentScores.innovationAlignment}%
        - Communication: ${alignmentScores.communicationAlignment}%
        
        SOFT SKILLS SCORES:
        - Technical Communication: ${softSkills.technicalCommunication}%
        - Problem Solving: ${softSkills.problemSolving}%
        - Adaptability: ${softSkills.adaptability}%
        - Teamwork: ${softSkills.teamwork}%
        - Leadership: ${softSkills.leadership}%
        
        COMPANY PROFILE:
        ${JSON.stringify(companyProfile, null, 2)}
        
        Provide recommendations in JSON format:
        {
          "strengths": ["3-5 key strengths for this role"],
          "concerns": ["2-3 potential concerns or risks"],
          "developmentAreas": ["2-3 areas for professional development"]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "strengths": ["array of strength strings"],
          "concerns": ["array of concern strings"],
          "developmentAreas": ["array of development area strings"]
        }`,
      );

      return response.data as CulturalRecommendations;
    } catch (error) {
      this.logger.warn(
        'Failed to generate recommendations, using fallback',
        error,
      );
      return {
        strengths: ['Strong technical background', 'Professional background'],
        concerns: ['Limited cultural fit data'],
        developmentAreas: ['Communication skills', 'Leadership development'],
      };
    }
  }

  /**
   * Calculate overall cultural fit score
   */
  private calculateOverallCulturalFitScore(
    alignmentScores: AlignmentScores,
    softSkills: SoftSkillsAssessment,
  ): number {
    // Weight the different components
    const alignmentWeight = 0.6;
    const softSkillsWeight = 0.4;

    // Calculate average alignment score
    const avgAlignmentScore =
      (Object.values(alignmentScores) as number[]).reduce(
        (sum: number, score: number) => sum + score,
        0,
      ) / Object.keys(alignmentScores).length;

    // Calculate average soft skills score
    const softSkillValues = [
      softSkills.technicalCommunication,
      softSkills.problemSolving,
      softSkills.adaptability,
      softSkills.teamwork,
      softSkills.leadership,
      softSkills.timeManagement,
      softSkills.criticalThinking,
      softSkills.emotionalIntelligence,
    ];
    const avgSoftSkillsScore =
      softSkillValues.reduce((sum, score) => sum + score, 0) /
      softSkillValues.length;

    // Calculate weighted overall score
    const overallScore =
      avgAlignmentScore * alignmentWeight +
      avgSoftSkillsScore * softSkillsWeight;

    return Math.round(overallScore);
  }

  /**
   * Calculate confidence in cultural fit analysis
   */
  private calculateCulturalFitConfidence(
    indicators: CulturalFitIndicators,
    softSkills: SoftSkillsAssessment,
    resume: ResumeDTO,
  ): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence for limited work experience
    if (resume.workExperience.length < 2) confidence -= 0.15;

    // Reduce confidence for missing job descriptions
    const emptyDescriptions = resume.workExperience.filter(
      (exp) => !exp.summary || exp.summary.trim().length < 20,
    ).length;
    confidence -= (emptyDescriptions / resume.workExperience.length) * 0.2;

    // Increase confidence for strong evidence base
    const totalEvidence = Object.values(softSkills.evidence).flat().length;
    if (totalEvidence > 15) confidence += 0.1;

    // Increase confidence for consistent indicators
    if (indicators.companySize.confidence > 80) confidence += 0.05;

    return Math.max(0.4, Math.min(1.0, Math.round(confidence * 100) / 100));
  }

  /**
   * Fallback cultural fit analysis
   */
  private fallbackCulturalFitAnalysis(
    resume: ResumeDTO,
    _companyProfile: CompanyProfile,
  ): CulturalFitScore {
    const indicators = this.fallbackCulturalIndicators(resume);
    const softSkills = this.fallbackSoftSkillsAssessment(resume);
    const alignmentScores = {
      companySizeAlignment: 60,
      workStyleAlignment: 60,
      leadershipAlignment: 60,
      innovationAlignment: 60,
      communicationAlignment: 60,
    };

    return {
      overallScore: 60,
      indicators,
      softSkills,
      alignmentScores,
      confidence: 0.6,
      recommendations: {
        strengths: ['Professional background'],
        concerns: ['Limited analysis data'],
        developmentAreas: ['Communication', 'Leadership'],
      },
    };
  }

  /**
   * Fallback cultural indicators
   */
  private fallbackCulturalIndicators(_resume: ResumeDTO): CulturalFitIndicators {
    return {
      companySize: {
        preference: 'mixed',
        confidence: 50,
        evidence: ['Limited data for analysis'],
      },
      workStyle: {
        remoteReadiness: 70,
        collaborationStyle: 'hybrid',
        adaptabilityScore: 60,
        evidence: ['General assessment based on modern work trends'],
      },
      communicationSkills: {
        writtenCommunication: 60,
        verbalCommunication: 60,
        presentationSkills: 60,
        evidence: ['Resume presentation quality'],
      },
      leadershipPotential: {
        score: 50,
        style: 'collaborative',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      },
      innovationMindset: {
        score: 60,
        creativityIndicators: [],
        problemSolvingApproach: 'analytical',
      },
      professionalMaturity: {
        score: 70,
        reliabilityIndicators: ['Work history consistency'],
        accountability: 70,
        continuousLearning: 60,
      },
    };
  }

  /**
   * Fallback soft skills assessment
   */
  private fallbackSoftSkillsAssessment(
    _resume: ResumeDTO,
  ): SoftSkillsAssessment {
    return {
      technicalCommunication: 60,
      problemSolving: 60,
      adaptability: 60,
      teamwork: 60,
      leadership: 50,
      timeManagement: 60,
      criticalThinking: 60,
      emotionalIntelligence: 50,
      evidence: {
        technicalCommunication: ['Resume clarity'],
        problemSolving: ['Technical skills listed'],
        adaptability: ['Work experience variety'],
        teamwork: ['Professional background'],
        leadership: ['Job titles'],
        timeManagement: ['Work history'],
        criticalThinking: ['Technical expertise'],
        emotionalIntelligence: ['Professional presentation'],
      },
    };
  }
}
