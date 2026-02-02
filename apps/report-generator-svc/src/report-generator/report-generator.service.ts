import { Injectable, Logger } from '@nestjs/common';
import type { LlmService } from './llm.service';
import type {
  CandidateData as LlmCandidateData,
  ExtractedResumeData as LlmExtractedResumeData,
  JobRequirements as LlmJobRequirements,
  ReportEvent as LlmReportEvent,
  ScoringBreakdown as LlmScoringBreakdown,
} from './llm.service';
import type { GridFsService, ReportFileMetadata } from './gridfs.service';
import type { ReportRepository, ReportCreateData } from './report.repository';
import type {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
} from '../schemas/report.schema';
import {
  ReportGeneratorException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';
import { Types } from 'mongoose';

// Enhanced type definitions for report generation
/**
 * Defines the structure passed to the LLM when generating reports.
 */
export type ReportEvent = LlmReportEvent;

/**
 * Defines the shape of the report data item.
 */
export interface ReportDataItem {
  resumeId: string;
  jobId: string;
  scoreBreakdown?: ScoreBreakdown;
  skillsAnalysis?: MatchingSkill[];
  recommendation?: ReportRecommendation;
  confidence?: number;
  metadata?: {
    processingTimeMs?: number;
    generatedAt?: Date;
  };
}

/**
 * Defines the shape of the generated report file.
 */
export interface GeneratedReportFile {
  format: 'markdown' | 'html' | 'pdf' | 'json';
  fileId: string;
  filename: string;
  downloadUrl: string;
}

/**
 * Defines the shape of the report document.
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
 * Defines the shape of the candidate comparison data.
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
 * Defines the shape of the interview candidate data.
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
 * Defines the shape of the extracted job requirements.
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
 * Defines the shape of the job data.
 */
export interface JobData {
  jobId: string;
  title: string;
  description: string;
  requirements: {
    requiredSkills: Array<{ name: string; weight: number }>;
    experienceYears: { min: number; max: number };
    educationLevel: string;
    location?: string;
    department?: string;
    employmentType?: string;
  };
  companyInfo?: {
    name: string;
    industry: string;
    size: string;
  };
}

/**
 * Defines the shape of the resume data.
 */
export interface ResumeData {
  resumeId: string;
  candidateName: string;
  extractedData: {
    personalInfo: {
      email: string;
      phone?: string;
      location?: string;
    };
    workExperience: Array<{
      position: string;
      company: string;
      duration: string;
      description: string;
      skills: string[];
    }>;
    education: Array<{
      degree: string;
      school: string;
      year: string;
      field: string;
    }>;
    skills: string[];
    certifications?: Array<{
      name: string;
      issuer: string;
      date: string;
    }>;
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
    }>;
  };
  parsedAt: Date;
  fileUrl?: string;
}

/**
 * Defines the shape of the scoring data.
 */
export interface ScoringData {
  resumeId: string;
  jobId: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  culturalFitScore?: number;
  breakdown: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    overallFit: number;
  };
  matchingSkills: Array<{
    skill: string;
    matchScore: number;
    matchType: 'exact' | 'partial' | 'related' | 'missing';
    explanation: string;
  }>;
  recommendations: {
    decision: 'hire' | 'consider' | 'interview' | 'reject';
    reasoning: string;
    strengths: string[];
    concerns: string[];
    suggestions: string[];
  };
  analysisConfidence: number;
  processingTimeMs: number;
  scoredAt: Date;
}

/**
 * Defines the shape of the match scored event.
 */
export interface MatchScoredEvent {
  jobId: string;
  resumeId: string;
  scoreDto: ScoringData;
  jobData?: JobData;
  resumeData?: ResumeData;
  metadata?: {
    requestedBy?: string;
    generatedAt?: Date;
    reportType?: string;
  };
}

/**
 * Defines the shape of the report generation request.
 */
export interface ReportGenerationRequest {
  jobId: string;
  resumeIds: string[];
  reportType: 'individual' | 'comparison' | 'batch' | 'executive-summary';
  outputFormats: ('markdown' | 'html' | 'pdf' | 'json')[];
  options?: {
    includeInterviewGuide?: boolean;
    includeSkillsGapAnalysis?: boolean;
    includeCulturalFitAssessment?: boolean;
    customPrompt?: string;
    requestedBy?: string;
  };
}

/**
 * Defines the shape of the generated report.
 */
export interface GeneratedReport {
  reportId: string;
  jobId: string;
  resumeIds: string[];
  reportType: string;
  files: Array<{
    format: string;
    fileId: string;
    filename: string;
    downloadUrl: string;
  }>;
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
    confidence: number;
    generatedBy: string;
  };
  summary: string;
}

/**
 * Provides report generator functionality.
 */
@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  /**
   * Initializes a new instance of the Report Generator Service.
   * @param llmService - The llm service.
   * @param gridFsService - The grid fs service.
   * @param reportRepo - The report repo.
   */
  constructor(
    private readonly llmService: LlmService,
    private readonly gridFsService: GridFsService,
    private readonly reportRepo: ReportRepository,
  ) {}

  /**
   * Handles match scored.
   * @param event - The event.
   * @returns A promise that resolves when the operation completes.
   */
  public async handleMatchScored(event: MatchScoredEvent): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing match scored event for jobId: ${event.jobId}, resumeId: ${event.resumeId}`,
      );

      // Validate event data with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();

      if (!event.scoreDto || !event.jobId || !event.resumeId) {
        throw new ReportGeneratorException('INVALID_EVENT_DATA', {
          provided: {
            scoreDto: !!event.scoreDto,
            jobId: !!event.jobId,
            resumeId: !!event.resumeId,
          },
          correlationId: correlationContext?.traceId,
        });
      }

      // Convert scoring data to report format
      const reportEvent = await this.buildReportEvent(event);

      // Generate comprehensive report using LLM
      const markdownReport =
        await this.llmService.generateReportMarkdown(reportEvent);

      // Generate filename for the report
      const filename = this.generateReportFilename(
        'match-analysis',
        event.jobId,
        event.resumeId,
        'md',
      );

      // Save report to GridFS
      const reportFileMetadata: ReportFileMetadata = {
        reportType: 'markdown',
        jobId: event.jobId,
        resumeId: event.resumeId,
        generatedBy: 'report-generator-service',
        generatedAt: new Date(),
        mimeType: 'text/markdown',
        encoding: 'utf-8',
      };

      const fileId = await this.gridFsService.saveReport(
        markdownReport,
        filename,
        reportFileMetadata,
      );

      // Create structured report record in database
      const reportData: ReportCreateData = {
        jobId: event.jobId,
        resumeId: event.resumeId,
        scoreBreakdown: this.convertToScoreBreakdown(event.scoreDto),
        skillsAnalysis: this.convertToMatchingSkills(
          event.scoreDto.matchingSkills,
        ),
        recommendation: this.convertToReportRecommendation(
          event.scoreDto.recommendations,
        ),
        summary: await this.generateExecutiveSummary(event),
        analysisConfidence: event.scoreDto.analysisConfidence,
        processingTimeMs: Date.now() - startTime,
        generatedBy: 'report-generator-service',
        llmModel: 'gemini-1.5-flash',
        requestedBy: event.metadata?.requestedBy,
        detailedReportUrl: `/api/reports/file/${fileId}`,
      };

      // Save report metadata to database
      const savedReport = await this.reportRepo.createReport(reportData);

      // Update resume record with completion status
      await this.reportRepo.updateResumeRecord(event.resumeId, {
        status: 'completed',
        reportGridFsId: fileId,
        processingTimeMs: Date.now() - startTime,
      });

      this.logger.log(
        `Successfully processed match scored event. Report ID: ${savedReport._id}, File ID: ${fileId}`,
      );
    } catch (error) {
      this.logger.error('Failed to process match scored event', {
        error: error.message,
        jobId: event.jobId,
        resumeId: event.resumeId,
      });

      // Update resume record with error status
      await this.reportRepo.updateResumeRecord(event.resumeId, {
        status: 'failed',
        errorMessage: error.message,
        processingTimeMs: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Generates report.
   * @param request - The request.
   * @returns A promise that resolves to GeneratedReport.
   */
  public async generateReport(
    request: ReportGenerationRequest,
  ): Promise<GeneratedReport> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Generating ${request.reportType} report for job ${request.jobId} with ${request.resumeIds.length} resumes`,
      );

      // Validate request with correlation
      const correlationContext = ErrorCorrelationManager.getContext();

      if (
        !request.jobId ||
        !request.resumeIds ||
        request.resumeIds.length === 0
      ) {
        throw new ReportGeneratorException('INVALID_REPORT_REQUEST', {
          provided: {
            jobId: !!request.jobId,
            resumeIds: request.resumeIds || [],
            resumeCount: request.resumeIds?.length || 0,
          },
          correlationId: correlationContext?.traceId,
        });
      }

      // Collect data for report generation
      const reportData = await this.gatherReportData(request);

      // Generate reports in requested formats
      const generatedFiles = await Promise.all(
        request.outputFormats.map((format) =>
          this.generateReportInFormat(reportData, format),
        ),
      );

      // Create report metadata record
      const reportMetadata: ReportCreateData = {
        jobId: request.jobId,
        resumeId: request.resumeIds[0], // Primary resume for single reports, first for batch
        scoreBreakdown: this.aggregateScoreBreakdown(reportData),
        skillsAnalysis: this.aggregateSkillsAnalysis(reportData),
        recommendation: this.generateOverallRecommendation(reportData),
        summary: await this.generateBatchSummary(reportData),
        analysisConfidence: this.calculateAverageConfidence(reportData),
        processingTimeMs: Date.now() - startTime,
        generatedBy: 'report-generator-service',
        llmModel: 'gemini-1.5-flash',
        requestedBy: request.options?.requestedBy,
      };

      const savedReport = await this.reportRepo.createReport(reportMetadata);

      const result: GeneratedReport = {
        reportId:
          (savedReport._id instanceof Types.ObjectId
            ? savedReport._id.toString()
            : (savedReport._id as string)) || '',
        jobId: request.jobId,
        resumeIds: request.resumeIds,
        reportType: request.reportType,
        files: generatedFiles,
        metadata: {
          generatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          confidence: reportMetadata.analysisConfidence,
          generatedBy: 'report-generator-service',
        },
        summary: reportMetadata.summary,
      };

      this.logger.log(
        `Successfully generated ${request.reportType} report. Report ID: ${result.reportId}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to generate report', {
        error: error.message,
        request: {
          jobId: request.jobId,
          resumeCount: request.resumeIds.length,
          reportType: request.reportType,
        },
      });
      throw error;
    }
  }

  /**
   * Generates candidate comparison.
   * @param jobId - The job id.
   * @param resumeIds - The resume ids.
   * @param options - The options.
   * @returns A promise that resolves to string value.
   */
  public async generateCandidateComparison(
    jobId: string,
    resumeIds: string[],
    _options?: { requestedBy?: string },
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating candidate comparison for job ${jobId} with ${resumeIds.length} candidates`,
      );

      // Fetch scoring data for all candidates
      const candidateData = await Promise.all(
        resumeIds.map(async (resumeId) => {
          const report = await this.reportRepo.findReport({ jobId, resumeId });
          return report
            ? this.formatCandidateForComparison(
                report as unknown as ReportDocument,
              )
            : null;
        }),
      );

      const validCandidates = candidateData.filter(
        (candidate): candidate is CandidateComparisonData => candidate !== null,
      );

      if (validCandidates.length < 2) {
        throw new ReportGeneratorException('INSUFFICIENT_CANDIDATES', {
          provided: validCandidates.length,
          required: 2,
          jobId,
        });
      }

      const llmCandidates = validCandidates.map((candidate) =>
        this.mapCandidateComparisonToLlm(candidate),
      );

      return await this.llmService.generateCandidateComparison(llmCandidates);
    } catch (error) {
      this.logger.error('Failed to generate candidate comparison', {
        error: error.message,
        jobId,
        resumeIds,
      });
      throw error;
    }
  }

  /**
   * Generates interview guide.
   * @param jobId - The job id.
   * @param resumeId - The resume id.
   * @param options - The options.
   * @returns A promise that resolves to string value.
   */
  public async generateInterviewGuide(
    jobId: string,
    resumeId: string,
    _options?: { requestedBy?: string },
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating interview guide for job ${jobId}, resume ${resumeId}`,
      );

      // Fetch candidate and job data
      const report = await this.reportRepo.findReport({ jobId, resumeId });
      if (!report) {
        throw new ReportGeneratorException('REPORT_NOT_FOUND', {
          jobId: jobId,
          resumeId: resumeId,
        });
      }

      // Format data for interview guide generation
      const candidateData = this.formatCandidateForInterview(
        report as unknown as ReportDocument,
      );
      const jobRequirements = this.extractJobRequirements(
        report as unknown as ReportDocument,
      );

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
        strengths: candidateData.recommendation?.strengths ?? [],
        concerns: candidateData.recommendation?.concerns ?? [],
        experience: [],
        education: [],
      };

      const llmJobRequirements: LlmJobRequirements = {
        requiredSkills: jobRequirements.requiredSkills.map((skill) => ({
          name: skill,
          weight: 1,
        })),
      };

      return await this.llmService.generateInterviewGuide(
        llmCandidateData,
        llmJobRequirements,
      );
    } catch (error) {
      this.logger.error('Failed to generate interview guide', {
        error: error.message,
        jobId,
        resumeId,
      });
      throw error;
    }
  }

  /**
   * Retrieves report analytics.
   * @param filters - The filters.
   * @returns The result of the operation.
   */
  public async getReportAnalytics(filters = {}): Promise<{
    totalReports: number;
    reportsByStatus: Record<string, number>;
    reportsByRecommendation: Record<string, number>;
    averageProcessingTime: number;
    averageConfidenceScore: number;
    reportsGeneratedToday: number;
    topPerformingCandidates: {
      resumeId: string;
      overallScore: number;
      recommendation: string;
    }[];
  }> {
    return this.reportRepo.getReportAnalytics(filters);
  }

  /**
   * Performs the health check operation.
   * @returns The Promise<{ status: string; details: { llmService: boolean; gridFsService: boolean; reportRepository: boolean; }; }>.
   */
  public async healthCheck(): Promise<{
    status: string;
    details: {
      llmService: boolean;
      gridFsService: boolean;
      reportRepository: boolean;
    };
  }> {
    const [llmHealth, gridFsHealth, repoHealth] = await Promise.all([
      this.llmService.healthCheck(),
      this.gridFsService.healthCheck(),
      this.reportRepo.healthCheck(),
    ]);

    const allHealthy =
      llmHealth &&
      gridFsHealth &&
      (typeof repoHealth === 'boolean' ? repoHealth : true);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: {
        llmService: llmHealth,
        gridFsService: gridFsHealth,
        reportRepository: typeof repoHealth === 'boolean' ? repoHealth : true,
      },
    };
  }

  private async buildReportEvent(
    event: MatchScoredEvent,
  ): Promise<ReportEvent> {
    return {
      jobId: event.jobId,
      resumeIds: [event.resumeId],
      jobData: this.mapJobDataForLlm(event.jobData),
      resumesData: this.mapResumeDataForLlm(event.resumeData, event.scoreDto),
      scoringResults: this.mapScoringResultsForLlm(event.scoreDto),
      metadata: {
        generatedAt: event.metadata?.generatedAt ?? new Date(),
        reportType: event.metadata?.reportType ?? 'match-analysis',
        requestedBy: event.metadata?.requestedBy,
      },
    };
  }

  private mapJobDataForLlm(jobData?: JobData): ReportEvent['jobData'] {
    if (!jobData) {
      return undefined;
    }

    return {
      title: jobData.title,
      description: jobData.description,
      requirements: this.mapJobRequirementsForLlm(jobData.requirements),
    };
  }

  private mapJobRequirementsForLlm(
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

  private mapResumeDataForLlm(
    resumeData?: ResumeData,
    scoringData?: ScoringData,
  ): ReportEvent['resumesData'] {
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

  private mapExtractedResumeData(
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

  private deriveMissingSkills(scoringData?: ScoringData): string[] | undefined {
    const missing =
      scoringData?.matchingSkills
        ?.filter((skill) => skill.matchType === 'missing')
        .map((skill) => skill.skill) ?? [];

    return missing.length > 0 ? missing : undefined;
  }

  private mapScoringResultsForLlm(
    scoringData?: ScoringData,
  ): ReportEvent['scoringResults'] {
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

  private mapScoringBreakdownForLlm(
    scoringData: ScoringData,
  ): LlmScoringBreakdown {
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

  private mapRecommendationsForLlm(
    scoringData: ScoringData,
  ): string[] | undefined {
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

  private parseYear(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }

  private convertToScoreBreakdown(scoringData: ScoringData): ScoreBreakdown {
    return {
      skillsMatch: scoringData.breakdown.skillsMatch,
      experienceMatch: scoringData.breakdown.experienceMatch,
      educationMatch: scoringData.breakdown.educationMatch,
      overallFit: scoringData.breakdown.overallFit,
    };
  }

  private convertToMatchingSkills(
    skills: ScoringData['matchingSkills'],
  ): MatchingSkill[] {
    return skills.map((skill) => ({
      skill: skill.skill,
      matchScore: skill.matchScore,
      matchType: skill.matchType,
      explanation: skill.explanation,
    }));
  }

  private convertToReportRecommendation(
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

  private async generateExecutiveSummary(
    event: MatchScoredEvent,
  ): Promise<string> {
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

  private generateReportFilename(
    reportType: string,
    jobId: string,
    resumeId: string,
    extension: string,
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${reportType}-${jobId}-${resumeId}-${timestamp}.${extension}`;
  }

  private async gatherReportData(
    request: ReportGenerationRequest,
  ): Promise<ReportDataItem[]> {
    // This would typically fetch data from other services
    // For now, return placeholder data structure
    return request.resumeIds.map((resumeId) => ({
      resumeId,
      jobId: request.jobId,
      // Add more data fetching logic here
    }));
  }

  private async generateReportInFormat(
    _data: ReportDataItem[],
    format: GeneratedReportFile['format'],
  ): Promise<GeneratedReportFile> {
    // Placeholder for format-specific generation
    return {
      format,
      fileId: `placeholder-${format}`,
      filename: `report.${format}`,
      downloadUrl: `/api/reports/download/placeholder-${format}`,
    };
  }

  private aggregateScoreBreakdown(_data: ReportDataItem[]): ScoreBreakdown {
    // Placeholder aggregation logic
    return {
      skillsMatch: 75,
      experienceMatch: 80,
      educationMatch: 70,
      overallFit: 75,
    };
  }

  private aggregateSkillsAnalysis(_data: ReportDataItem[]): MatchingSkill[] {
    // Placeholder skills analysis
    return [];
  }

  private generateOverallRecommendation(
    _data: ReportDataItem[],
  ): ReportRecommendation {
    // Placeholder recommendation logic
    return {
      decision: 'consider',
      reasoning: 'Aggregated analysis shows mixed results',
      strengths: ['Strong technical skills'],
      concerns: ['Limited experience in some areas'],
      suggestions: ['Consider for interview'],
    };
  }

  private async generateBatchSummary(_data: ReportDataItem[]): Promise<string> {
    return `Batch report summary for ${_data.length} candidates.`;
  }

  private calculateAverageConfidence(_data: ReportDataItem[]): number {
    return 0.85; // Placeholder
  }

  private mapCandidateComparisonToLlm(
    candidate: CandidateComparisonData,
  ): LlmCandidateData {
    return {
      id: candidate.id,
      name: candidate.name,
      score: candidate.score,
      recommendation: this.mapRecommendationDecision(candidate.recommendation),
      skills: candidate.skills,
      matchingSkills: candidate.skills,
      strengths: candidate.strengths,
      concerns: candidate.concerns,
    };
  }

  private mapRecommendationDecision(
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

  private formatCandidateForComparison(
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

  private formatCandidateForInterview(
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

  private extractJobRequirements(
    report: ReportDocument,
  ): ExtractedJobRequirements {
    return {
      requiredSkills: report.skillsAnalysis.map((skill) => skill.skill),
      experienceLevel: 'mid-level',
      educationLevel: 'bachelor',
    };
  }
}
