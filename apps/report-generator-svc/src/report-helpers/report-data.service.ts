import { Injectable } from '@nestjs/common';
import type {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
} from '../schemas/report.schema';
import type { Types } from 'mongoose';
import type { CandidateData } from '../report-generator/llm.service';

/**
 * Report document shape for internal use
 */
export interface ReportDocument {
  _id: Types.ObjectId | string;
  jobId: string;
  resumeId: string;
  scoreBreakdown: ScoreBreakdown;
  skillsAnalysis: MatchingSkill[];
  recommendation: ReportRecommendation;
  summary: string;
  analysisConfidence: number;
  processingTimeMs: number;
  generatedBy: string;
  llmModel: string;
  requestedBy?: string;
  detailedReportUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Candidate comparison data shape
 */
export interface CandidateComparisonData {
  id: string;
  name: string;
  score: number;
  skills: string[];
  recommendation: string;
  experience?: number;
  education?: number;
  strengths?: string[];
  concerns?: string[];
}

/**
 * Interview candidate data shape
 */
export interface InterviewCandidateData {
  id: string;
  name: string;
  skills: MatchingSkill[];
  experience: number;
  education: number;
  scoreBreakdown?: ScoreBreakdown;
  recommendation?: ReportRecommendation;
}

/**
 * Extracted job requirements shape
 */
export interface ExtractedJobRequirements {
  requiredSkills: string[];
  experienceLevel: string;
  educationLevel: string;
  department?: string;
  location?: string;
  employmentType?: string;
}

/**
 * Handles data aggregation and formatting for report generation.
 * Extracted from ReportGeneratorService to separate data concerns.
 */
@Injectable()
export class ReportDataService {

  /**
   * Formats a report document for candidate comparison
   * @param report - Source report document
   * @returns Formatted candidate comparison data
   */
  public formatCandidateForComparison(
    report: ReportDocument,
  ): CandidateComparisonData {
    return {
      id: report.resumeId,
      name: `Candidate ${report.resumeId}`,
      score: report.scoreBreakdown.overallFit / 100,
      skills: report.skillsAnalysis.map((skill) => skill.skill),
      recommendation: report.recommendation.decision,
    };
  }

  /**
   * Formats a report document for interview guide generation
   * @param report - Source report document
   * @returns Formatted interview candidate data
   */
  public formatCandidateForInterview(
    report: ReportDocument,
  ): InterviewCandidateData {
    return {
      id: report.resumeId,
      name: `Candidate ${report.resumeId}`,
      skills: report.skillsAnalysis,
      experience: report.scoreBreakdown.experienceMatch,
      education: report.scoreBreakdown.educationMatch,
    };
  }

  /**
   * Extracts job requirements from a report document
   * @param report - Source report document
   * @returns Extracted job requirements
   */
  public extractJobRequirements(
    report: ReportDocument,
  ): ExtractedJobRequirements {
    return {
      requiredSkills: report.skillsAnalysis.map((skill) => skill.skill),
      experienceLevel: 'mid-level',
      educationLevel: 'bachelor',
    };
  }

  /**
   * Aggregates score breakdown from multiple report data items
   * @param dataItems - Array of report data items
   * @returns Aggregated score breakdown
   */
  public aggregateScoreBreakdown(
    dataItems: Array<{
      scoreBreakdown?: ScoreBreakdown;
    }>,
  ): ScoreBreakdown {
    if (dataItems.length === 0) {
      return {
        skillsMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        overallFit: 0,
      };
    }

    const itemsWithScores = dataItems.filter(
      (item) => item.scoreBreakdown,
    ) as Array<{ scoreBreakdown: ScoreBreakdown }>;

    if (itemsWithScores.length === 0) {
      return {
        skillsMatch: 75,
        experienceMatch: 80,
        educationMatch: 70,
        overallFit: 75,
      };
    }

    const sum = itemsWithScores.reduce(
      (acc, item) => ({
        skillsMatch: acc.skillsMatch + item.scoreBreakdown.skillsMatch,
        experienceMatch:
          acc.experienceMatch + item.scoreBreakdown.experienceMatch,
        educationMatch:
          acc.educationMatch + item.scoreBreakdown.educationMatch,
        overallFit: acc.overallFit + item.scoreBreakdown.overallFit,
      }),
      {
        skillsMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        overallFit: 0,
      },
    );

    const count = itemsWithScores.length;
    return {
      skillsMatch: Math.round(sum.skillsMatch / count),
      experienceMatch: Math.round(sum.experienceMatch / count),
      educationMatch: Math.round(sum.educationMatch / count),
      overallFit: Math.round(sum.overallFit / count),
    };
  }

  /**
   * Aggregates skills analysis from multiple report data items
   * @param dataItems - Array of report data items
   * @returns Aggregated matching skills
   */
  public aggregateSkillsAnalysis(
    dataItems: Array<{
      skillsAnalysis?: MatchingSkill[];
    }>,
  ): MatchingSkill[] {
    const allSkills = dataItems
      .filter((item) => item.skillsAnalysis)
      .flatMap((item) => item.skillsAnalysis || []);

    // Group by skill name and average match scores
    const skillMap = new Map<string, MatchingSkill[]>();

    for (const skill of allSkills) {
      const existing = skillMap.get(skill.skill) || [];
      existing.push(skill);
      skillMap.set(skill.skill, existing);
    }

    return Array.from(skillMap.entries()).map(([skillName, skills]) => ({
      skill: skillName,
      matchScore: Math.round(
        skills.reduce((sum, s) => sum + s.matchScore, 0) / skills.length,
      ),
      matchType: skills[0].matchType,
      explanation: skills[0].explanation,
    }));
  }

  /**
   * Generates overall recommendation from multiple report data items
   * @param dataItems - Array of report data items
   * @returns Aggregated recommendation
   */
  public generateOverallRecommendation(
    dataItems: Array<{
      recommendation?: ReportRecommendation;
    }>,
  ): ReportRecommendation {
    const itemsWithRecs = dataItems.filter(
      (item) => item.recommendation,
    ) as Array<{ recommendation: ReportRecommendation }>;

    if (itemsWithRecs.length === 0) {
      return {
        decision: 'consider',
        reasoning: 'Insufficient data for recommendation',
        strengths: [],
        concerns: [],
        suggestions: [],
      };
    }

    // Aggregate all strengths and concerns
    const allStrengths = itemsWithRecs.flatMap(
      (item) => item.recommendation.strengths || [],
    );
    const allConcerns = itemsWithRecs.flatMap(
      (item) => item.recommendation.concerns || [],
    );

    // Determine overall decision based on average scores
    const decisions = itemsWithRecs.map(
      (item) => item.recommendation.decision,
    );
    const decisionCounts = decisions.reduce(
      (acc, d) => {
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Most common decision
    const overallDecision = (Object.entries(decisionCounts).sort(
      (a, b) => (b as [string, number])[1] - (a as [string, number])[1],
    )[0]?.[0] ?? 'consider') as 'hire' | 'consider' | 'interview' | 'reject';

    return {
      decision: overallDecision,
      reasoning: `Aggregated analysis from ${itemsWithRecs.length} candidate(s)`,
      strengths: [...new Set(allStrengths)].slice(0, 5), // Top 5 unique
      concerns: [...new Set(allConcerns)].slice(0, 3), // Top 3 unique
      suggestions: ['Consider scheduling interviews for top candidates'],
    };
  }

  /**
   * Calculates average confidence from multiple report data items
   * @param dataItems - Array of report data items
   * @returns Average confidence score
   */
  public calculateAverageConfidence(
    dataItems: Array<{
      confidence?: number;
    }>,
  ): number {
    const itemsWithConfidence = dataItems.filter(
      (item) => typeof item.confidence === 'number',
    );

    if (itemsWithConfidence.length === 0) {
      return 0.85; // Default confidence
    }

    const sum = itemsWithConfidence.reduce(
      (acc, item) => acc + (item.confidence || 0),
      0,
    );

    return sum / itemsWithConfidence.length;
  }

  /**
   * Generates a batch summary from multiple report data items
   * @param dataItems - Array of report data items
   * @returns Generated summary text
   */
  public generateBatchSummary(
    dataItems: Array<{
      resumeId?: string;
    }>,
  ): string {
    const count = dataItems.length;
    // Cast dataItems to the correct type for aggregateSkillsAnalysis
    const itemsForAnalysis = dataItems as Array<{
      skillsAnalysis?: MatchingSkill[];
    }>;
    const strengths = this.aggregateSkillsAnalysis(itemsForAnalysis)
      .filter((s) => s.matchScore > 70)
      .slice(0, 5)
      .map((s) => s.skill);

    return `Batch report summary for ${count} candidate(s). ` +
      `Top common skills: ${strengths.join(', ') || 'None detected'}. ` +
      `Review individual reports for detailed analysis.`;
  }

  /**
   * Formats candidate comparison data for LLM input
   * @param candidate - Candidate comparison data
   * @returns LLM-compatible candidate data
   */
  public formatCandidateForLlm(candidate: CandidateComparisonData): CandidateData {
    return {
      id: candidate.id,
      name: candidate.name,
      score: candidate.score,
      recommendation: this.mapRecommendationDecision(candidate.recommendation),
      skills: candidate.skills,
      matchingSkills: candidate.skills,
      strengths: candidate.strengths || [],
      concerns: candidate.concerns || [],
    };
  }

  /**
   * Maps recommendation decision to LLM format
   * @param decision - Original decision string
   * @returns LLM-compatible recommendation value
   */
  public mapRecommendationDecision(
    decision?: string,
  ): 'hire' | 'strong_hire' | 'consider' | 'pass' {
    switch (decision) {
      case 'hire':
        return 'hire';
      case 'strong_hire':
        return 'strong_hire';
      case 'interview':
        return 'consider';
      case 'consider':
        return 'consider';
      case 'pass':
        return 'pass';
      case 'reject':
        return 'pass';
      default:
        return 'consider';
    }
  }
}
