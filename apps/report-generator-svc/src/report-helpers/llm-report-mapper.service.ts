import { Injectable } from '@nestjs/common';
import type {
  CandidateData as LlmCandidateData,
  ExtractedResumeData as LlmExtractedResumeData,
  JobRequirements as LlmJobRequirements,
  ReportEvent as LlmReportEvent,
  ScoringBreakdown as LlmScoringBreakdown,
} from '../report-generator/llm.service';
import type {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
  ScoringData,
  JobData,
  ResumeData,
  MatchScoredEvent,
} from '../report-generator/report-generator.service';

/**
 * Handles mapping between internal report data types and LLM input/output types.
 * Extracted from ReportGeneratorService to separate data transformation concerns.
 */
@Injectable()
export class LlmReportMapperService {

  /**
   * Builds a report event for LLM processing from a match scored event
   * @param event - The match scored event
   * @returns LLM-compatible report event
   */
  public buildReportEvent(event: MatchScoredEvent): LlmReportEvent {
    return {
      jobId: event.jobId,
      resumeIds: [event.resumeId],
      jobData: this.mapJobDataForLlm(event.jobData),
      resumesData: this.mapResumeDataForLlm(
        event.resumeData,
        event.scoreDto,
      ),
      scoringResults: this.mapScoringResultsForLlm(event.scoreDto),
      metadata: {
        generatedAt: event.metadata?.generatedAt ?? new Date(),
        reportType: event.metadata?.reportType ?? 'match-analysis',
        requestedBy: event.metadata?.requestedBy,
      },
    };
  }

  /**
   * Maps job data to LLM format
   * @param jobData - Internal job data
   * @returns LLM-compatible job data
   */
  public mapJobDataForLlm(jobData?: JobData): LlmReportEvent['jobData'] {
    if (!jobData) {
      return undefined;
    }

    return {
      title: jobData.title,
      description: jobData.description,
      requirements: this.mapJobRequirementsForLlm(jobData.requirements),
    };
  }

  /**
   * Maps job requirements to LLM format
   * @param requirements - Internal job requirements
   * @returns LLM-compatible job requirements
   */
  public mapJobRequirementsForLlm(
    requirements?: JobData['requirements'],
  ): LlmJobRequirements | undefined {
    if (!requirements) {
      return undefined;
    }

    const mapped: LlmJobRequirements = {};

    if (requirements.requiredSkills?.length) {
      mapped.requiredSkills = requirements.requiredSkills.map((skill) => ({
        name: skill.name,
        weight: skill.weight,
      }));
    }

    if (requirements.experienceYears) {
      mapped.experienceYears = {
        min: requirements.experienceYears.min,
        max: requirements.experienceYears.max,
      };
    }

    if (requirements.educationLevel) {
      mapped.educationLevel = requirements.educationLevel;
    }

    if (requirements.location) {
      mapped.locationRequirements = {
        locations: [requirements.location],
      };
    }

    return mapped;
  }

  /**
   * Maps resume data to LLM format
   * @param resumeData - Internal resume data
   * @param scoringData - Optional scoring data for enrichment
   * @returns LLM-compatible resume data array
   */
  public mapResumeDataForLlm(
    resumeData?: ResumeData,
    scoringData?: ScoringData,
  ): LlmReportEvent['resumesData'] {
    if (!resumeData) {
      return undefined;
    }

    const resumeEntry = {
      id: resumeData.resumeId,
      candidateName: resumeData.candidateName,
      extractedData: this.mapExtractedResumeData(resumeData),
    } as {
      id: string;
      candidateName?: string;
      extractedData?: LlmExtractedResumeData;
      score?: number;
      matchingSkills?: string[];
      missingSkills?: string[];
    };

    if (typeof scoringData?.overallScore === 'number') {
      resumeEntry.score = scoringData.overallScore;
    }

    const matchingSkills = scoringData?.matchingSkills?.map(
      (skill) => skill.skill,
    );
    if (matchingSkills?.length) {
      resumeEntry.matchingSkills = matchingSkills;
    }

    const missingSkills = this.deriveMissingSkills(scoringData);
    if (missingSkills?.length) {
      resumeEntry.missingSkills = missingSkills;
    }

    return [resumeEntry];
  }

  /**
   * Maps extracted resume data to LLM format
   * @param resumeData - Internal resume data
   * @returns LLM-compatible extracted resume data
   */
  public mapExtractedResumeData(
    resumeData: ResumeData,
  ): LlmExtractedResumeData {
    const { extractedData } = resumeData;

    return {
      personalInfo: {
        name: resumeData.candidateName,
        email: extractedData.personalInfo.email,
        phone: extractedData.personalInfo.phone,
        location: extractedData.personalInfo.location,
      },
      workExperience: extractedData.workExperience?.map((experience) => ({
        company: experience.company,
        position: experience.position,
        duration: experience.duration,
        description: experience.description,
        skills: experience.skills,
      })),
      education: extractedData.education?.map((education) => ({
        institution: education.school,
        degree: education.degree,
        field: education.field,
        year: this.parseYear(education.year),
      })),
      skills: extractedData.skills?.map((skill) => ({
        name: skill,
        category: 'general',
      })),
      certifications: extractedData.certifications?.map((certification) => ({
        name: certification.name,
        issuer: certification.issuer,
        date: certification.date,
      })),
      projects: extractedData.projects?.map((project) => ({
        name: project.name,
        description: project.description,
        technologies: project.technologies,
      })),
    };
  }

  /**
   * Derives missing skills from scoring data
   * @param scoringData - Scoring data containing matching skills
   * @returns Array of missing skill names
   */
  public deriveMissingSkills(scoringData?: ScoringData): string[] | undefined {
    const missing =
      scoringData?.matchingSkills
        ?.filter((skill) => skill.matchType === 'missing')
        .map((skill) => skill.skill) ?? [];

    return missing.length > 0 ? missing : undefined;
  }

  /**
   * Maps scoring results to LLM format
   * @param scoringData - Internal scoring data
   * @returns LLM-compatible scoring results array
   */
  public mapScoringResultsForLlm(
    scoringData?: ScoringData,
  ): LlmReportEvent['scoringResults'] {
    if (!scoringData) {
      return undefined;
    }

    const scoringResult = {
      resumeId: scoringData.resumeId,
      score: scoringData.overallScore,
      breakdown: this.mapScoringBreakdownForLlm(scoringData),
    } as {
      resumeId: string;
      score: number;
      breakdown?: LlmScoringBreakdown;
      recommendations?: string[];
    };

    const recommendations = this.mapRecommendationsForLlm(scoringData);
    if (recommendations?.length) {
      scoringResult.recommendations = recommendations;
    }

    return [scoringResult];
  }

  /**
   * Maps scoring breakdown to LLM format
   * @param scoringData - Internal scoring data
   * @returns LLM-compatible scoring breakdown
   */
  public mapScoringBreakdownForLlm(scoringData: ScoringData): LlmScoringBreakdown {
    return {
      skillsMatch: scoringData.breakdown.skillsMatch,
      experienceMatch: scoringData.breakdown.experienceMatch,
      educationMatch: scoringData.breakdown.educationMatch,
      certificationMatch: scoringData.educationScore,
      overallScore: scoringData.overallScore,
      weightedFactors: {
        technical: scoringData.skillsScore,
        experience: scoringData.experienceScore,
        cultural: scoringData.culturalFitScore ?? scoringData.experienceScore,
        potential: scoringData.overallScore,
      },
      confidenceScore: scoringData.analysisConfidence,
    };
  }

  /**
   * Maps recommendations to LLM format
   * @param scoringData - Internal scoring data
   * @returns Array of recommendation strings or undefined
   */
  public mapRecommendationsForLlm(scoringData: ScoringData): string[] | undefined {
    const recommendations = scoringData.recommendations;
    if (!recommendations) {
      return undefined;
    }

    const values = [
      recommendations.decision,
      recommendations.reasoning,
      ...recommendations.strengths,
      ...recommendations.concerns,
      ...recommendations.suggestions,
    ].filter((value): value is string => !!value);

    return values.length > 0 ? values : undefined;
  }

  /**
   * Parses a year string to number
   * @param value - Year string
   * @returns Parsed year number
   */
  public parseYear(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }

  /**
   * Converts scoring data to score breakdown format
   * @param scoringData - Internal scoring data
   * @returns Score breakdown
   */
  public convertToScoreBreakdown(scoringData: ScoringData): ScoreBreakdown {
    return {
      skillsMatch: scoringData.breakdown.skillsMatch,
      experienceMatch: scoringData.breakdown.experienceMatch,
      educationMatch: scoringData.breakdown.educationMatch,
      overallFit: scoringData.breakdown.overallFit,
    };
  }

  /**
   * Converts matching skills from scoring data
   * @param skills - Array of matching skills
   * @returns Standardized matching skills
   */
  public convertToMatchingSkills(skills: ScoringData['matchingSkills']): MatchingSkill[] {
    return skills.map((skill) => ({
      skill: skill.skill,
      matchScore: skill.matchScore,
      matchType: skill.matchType,
      explanation: skill.explanation,
    }));
  }

  /**
   * Converts recommendations from scoring data
   * @param recommendations - Recommendations object
   * @returns Standardized report recommendation
   */
  public convertToReportRecommendation(
    recommendations: ScoringData['recommendations'],
  ): ReportRecommendation {
    return {
      decision: recommendations.decision,
      reasoning: recommendations.reasoning,
      strengths: recommendations.strengths,
      concerns: recommendations.concerns,
      suggestions: recommendations.suggestions,
    };
  }

  /**
   * Formats candidate data for LLM interview guide generation
   * @param candidateData - Internal candidate data
   * @param jobRequirements - Internal job requirements
   * @returns LLM-compatible candidate and job data
   */
  public formatForInterviewGuide(
    candidateData: {
      id: string;
      name: string;
      skills: MatchingSkill[];
      scoreBreakdown?: { overallFit: number };
      recommendation?: { decision?: string };
      strengths?: string[];
      concerns?: string[];
    },
    jobRequirements: {
      requiredSkills: string[];
    },
  ): {
    llmCandidateData: LlmCandidateData;
    llmJobRequirements: LlmJobRequirements;
  } {
    const llmCandidateData: LlmCandidateData = {
      id: candidateData.id,
      name: candidateData.name,
      score: candidateData.scoreBreakdown
        ? candidateData.scoreBreakdown.overallFit / 100
        : undefined,
      recommendation: this.mapRecommendationDecision(
        candidateData.recommendation?.decision,
      ),
      skills: candidateData.skills.map((skill) => skill.skill),
      matchingSkills: candidateData.skills.map((skill) => skill.skill),
      missingSkills: [],
      strengths: candidateData.strengths ?? [],
      concerns: candidateData.concerns ?? [],
      experience: [],
      education: [],
    };

    const llmJobRequirements: LlmJobRequirements = {
      requiredSkills: jobRequirements.requiredSkills.map((skill) => ({
        name: skill,
        weight: 1,
      })),
    };

    return { llmCandidateData, llmJobRequirements };
  }

  /**
   * Maps recommendation decision to LLM format
   * @param decision - Original decision string
   * @returns LLM-compatible recommendation
   */
  public mapRecommendationDecision(
    decision?: string,
  ): LlmCandidateData['recommendation'] {
    switch (decision) {
      case 'hire':
        return 'hire';
      case 'interview':
        return 'consider';
      case 'consider':
        return 'consider';
      case 'strong_hire':
        return 'strong_hire';
      case 'pass':
        return 'pass';
      case 'reject':
        return 'pass';
      default:
        return 'consider';
    }
  }

  /**
   * Generates an executive summary from match scored event
   * @param event - The match scored event
   * @returns Generated summary text
   */
  public generateExecutiveSummary(event: MatchScoredEvent): string {
    const score = Math.round(event.scoreDto.overallScore * 100);
    const decision = event.scoreDto.recommendations.decision;

    return (
      `Executive Summary: Candidate scored ${score}% overall match for the position. Recommendation: ${decision.toUpperCase()}. ` +
      `Key strengths include ${event.scoreDto.recommendations.strengths.slice(0, 2).join(' and ')}. ` +
      `${
        event.scoreDto.recommendations.concerns.length > 0
          ? 'Areas of concern: ' +
            event.scoreDto.recommendations.concerns.slice(0, 1).join(', ') +
            '.'
          : 'No significant concerns identified.'
      }`
    );
  }

  /**
   * Generates a report filename
   * @param reportType - Type of report
   * @param jobId - Job ID
   * @param resumeId - Resume ID
   * @param extension - File extension
   * @returns Generated filename
   */
  public generateReportFilename(
    reportType: string,
    jobId: string,
    resumeId: string,
    extension: string,
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${reportType}-${jobId}-${resumeId}-${timestamp}.${extension}`;
  }
}
