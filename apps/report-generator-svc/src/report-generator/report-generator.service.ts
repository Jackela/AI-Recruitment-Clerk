import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GridFsService } from './gridfs.service';
import type { ReportFileMetadata } from './gridfs.service';
import { ReportRepository } from './report.repository';
import type { ReportCreateData } from './report.repository';
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
import {
  ReportDataService,
  LlmReportMapperService,
} from '../report-helpers';
import type {
  CandidateComparisonData,
  ReportDocument,
} from '../report-helpers';
import type {
  ReportEvent as LlmReportEvent,
} from './llm.service';

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
 * Defines the shape of the candidate comparison data.
 * Re-exported from ReportDataService for backward compatibility.
 */
export type { CandidateComparisonData } from '../report-helpers';

/**
 * Defines the shape of the interview candidate data.
 * Re-exported from ReportDataService for backward compatibility.
 */
export type { InterviewCandidateData } from '../report-helpers';

/**
 * Defines the shape of the extracted job requirements.
 * Re-exported from ReportDataService for backward compatibility.
 */
export type { ExtractedJobRequirements } from '../report-helpers';

/**
 * Report document type for internal use.
 * Re-exported from ReportDataService for backward compatibility.
 */
export type { ReportDocument } from '../report-helpers';

/**
 * Re-export types from schemas for helper services
 */
export type { ScoreBreakdown, MatchingSkill, ReportRecommendation } from '../schemas/report.schema';

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
   * @param reportDataService - The report data service.
   * @param llmReportMapperService - The LLM report mapper service.
   */
  constructor(
    private readonly llmService: LlmService,
    private readonly gridFsService: GridFsService,
    private readonly reportRepo: ReportRepository,
    private readonly reportDataService: ReportDataService,
    private readonly llmReportMapperService: LlmReportMapperService,
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
      const filename = this.llmReportMapperService.generateReportFilename(
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
        scoreBreakdown: this.llmReportMapperService.convertToScoreBreakdown(
          event.scoreDto,
        ),
        skillsAnalysis: this.llmReportMapperService.convertToMatchingSkills(
          event.scoreDto.matchingSkills,
        ),
        recommendation: this.llmReportMapperService.convertToReportRecommendation(
          event.scoreDto.recommendations,
        ),
        summary: this.llmReportMapperService.generateExecutiveSummary(event),
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
        scoreBreakdown: this.reportDataService.aggregateScoreBreakdown(
          reportData,
        ),
        skillsAnalysis: this.reportDataService.aggregateSkillsAnalysis(
          reportData,
        ),
        recommendation: this.reportDataService.generateOverallRecommendation(
          reportData,
        ),
        summary: this.reportDataService.generateBatchSummary(reportData),
        analysisConfidence: this.reportDataService.calculateAverageConfidence(
          reportData,
        ),
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
            ? this.reportDataService.formatCandidateForComparison(
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
        this.reportDataService.formatCandidateForLlm(candidate),
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
      const candidateData = this.reportDataService.formatCandidateForInterview(
        report as unknown as ReportDocument,
      );
      const jobRequirements = this.reportDataService.extractJobRequirements(
        report as unknown as ReportDocument,
      );

      const { llmCandidateData, llmJobRequirements } =
        this.llmReportMapperService.formatForInterviewGuide(
          {
            ...candidateData,
            scoreBreakdown: candidateData.scoreBreakdown
              ? { overallFit: candidateData.scoreBreakdown.experienceMatch }
              : undefined,
          },
          jobRequirements,
        );

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

  // Helper methods - delegated to helper services

  private async buildReportEvent(
    event: MatchScoredEvent,
  ): Promise<ReportEvent> {
    return this.llmReportMapperService.buildReportEvent(event);
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
}
