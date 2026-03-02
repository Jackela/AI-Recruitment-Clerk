import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import type { LlmService } from './llm.service';
import type { GridFsService } from './gridfs.service';
import type { ReportFileMetadata } from './gridfs.service';
import type { ReportRepository } from './report.repository';
import type { ReportCreateData } from './report.repository';
import type {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
  ReportDocument as SchemaReportDocument,
} from '../schemas/report.schema';
import {
  ReportGeneratorException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';
import { Types } from 'mongoose';
import type {
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
import type { ReportGeneratorNatsService } from '../services/report-generator-nats.service';
import type { ReportTemplatesService } from './report-templates.service';

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
  format: 'markdown' | 'html' | 'pdf' | 'json' | 'excel';
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
  outputFormats: ('markdown' | 'html' | 'pdf' | 'json' | 'excel')[];
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
 * Response from scoring engine service for score data requests.
 */
export interface ScoringDataResponse {
  success: boolean;
  data?: ScoringData;
  error?: string;
}

/**
 * Response from resume parser service for resume data requests.
 */
export interface ResumeDataResponse {
  success: boolean;
  data?: ResumeData;
  error?: string;
}

/**
 * Response from JD extractor service for job data requests.
 */
export interface JobDataResponse {
  success: boolean;
  data?: JobData;
  error?: string;
}

/**
 * Service unavailable error details.
 */
export interface ServiceUnavailableError {
  serviceName: string;
  operation: string;
  error: string;
  resumeId?: string;
  jobId?: string;
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
   * @param reportTemplatesService - The report templates service.
   * @param natsService - The NATS service for inter-service communication (optional for backward compatibility).
   */
  constructor(
    private readonly llmService: LlmService,
    private readonly gridFsService: GridFsService,
    private readonly reportRepo: ReportRepository,
    private readonly reportDataService: ReportDataService,
    private readonly llmReportMapperService: LlmReportMapperService,
    private readonly reportTemplatesService: ReportTemplatesService,
    @Optional() @Inject(forwardRef(() => 'ReportGeneratorNatsService'))
    private readonly natsService?: ReportGeneratorNatsService,
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

  /**
   * Gathers report data from multiple sources for batch and comparison reports.
   *
   * This method fetches:
   * - Scoring data from scoring-engine-svc via NATS
   * - Resume data from resume-parser-svc via NATS
   * - Job data from jd-extractor-svc via NATS
   *
   * It first attempts to retrieve existing data from the local database,
   * then falls back to requesting data from remote services via NATS.
   *
   * @param request - The report generation request containing jobId and resumeIds
   * @returns A promise resolving to an array of report data items
   * @throws ReportGeneratorException if critical data cannot be retrieved
   */
  private async gatherReportData(
    request: ReportGenerationRequest,
  ): Promise<ReportDataItem[]> {
    const { jobId, resumeIds, reportType } = request;
    const correlationContext = ErrorCorrelationManager.getContext();

    this.logger.log(
      `Gathering report data for job ${jobId}, ${resumeIds.length} resumes, type: ${reportType}`,
    );

    const reportDataItems: ReportDataItem[] = [];
    const errors: ServiceUnavailableError[] = [];

    // Process each resume to gather complete data
    await Promise.all(
      resumeIds.map(async (resumeId): Promise<void> => {
        try {
          // Step 1: Try to fetch existing report data from local database
          const existingReport = await this.reportRepo.findReport({ jobId, resumeId });

          if (existingReport) {
            this.logger.debug(
              `Found existing report data for job ${jobId}, resume ${resumeId}`,
            );

            reportDataItems.push({
              resumeId,
              jobId,
              scoreBreakdown: existingReport.scoreBreakdown,
              skillsAnalysis: existingReport.skillsAnalysis,
              recommendation: existingReport.recommendation,
              confidence: existingReport.analysisConfidence,
              metadata: {
                processingTimeMs: existingReport.processingTimeMs,
                generatedAt: existingReport.generatedAt,
              },
            });
            return;
          }

          // Step 2: Fetch scoring data from scoring-engine-svc via NATS
          const scoringData = await this.fetchScoringData(jobId, resumeId);

          // Step 3: Fetch resume data from resume-parser-svc via NATS (parallel)
          const resumeData = await this.fetchResumeData(resumeId);

          // Step 4: Fetch job data from jd-extractor-svc via NATS (parallel, only once per job)
          const jobData = await this.fetchJobData(jobId);

          // Build report data item from fetched data
          const reportDataItem = this.buildReportDataItem(
            resumeId,
            jobId,
            scoringData,
            resumeData,
            jobData,
          );

          reportDataItems.push(reportDataItem);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to gather data for resume ${resumeId}: ${errorMessage}`,
          );
          errors.push({
            serviceName: 'gatherReportData',
            operation: 'fetchData',
            error: errorMessage,
            resumeId,
            jobId,
          });
        }
      }),
    );

    // Log summary of data gathering
    this.logger.log(
      `Gathered data for ${reportDataItems.length}/${resumeIds.length} resumes`,
    );

    // If we have no data at all, throw an error
    if (reportDataItems.length === 0) {
      throw new ReportGeneratorException('DATA_GATHERING_FAILED', {
        jobId,
        resumeIds,
        errors,
        message: 'Failed to gather any report data',
        correlationId: correlationContext?.traceId,
      });
    }

    // If we have partial data, log a warning but continue
    if (errors.length > 0) {
      this.logger.warn(
        `Partial data gathered: ${reportDataItems.length} successful, ${errors.length} failed`,
        { errors },
      );
    }

    return reportDataItems;
  }

  /**
   * Fetches scoring data from scoring-engine-svc via NATS.
   *
   * @param jobId - The job ID
   * @param resumeId - The resume ID
   * @returns A promise resolving to ScoringData or undefined if not available
   */
  private async fetchScoringData(
    jobId: string,
    resumeId: string,
  ): Promise<ScoringData | undefined> {
    if (!this.natsService) {
      this.logger.debug(
        'NATS service not available, skipping scoring data fetch',
        { jobId, resumeId },
      );
      return undefined;
    }

    try {
      this.logger.debug(
        `Requesting scoring data for job ${jobId}, resume ${resumeId}`,
      );

      // Publish a request event for scoring data
      // Note: This uses the event-driven pattern - the scoring engine publishes
      // analysis.match.scored events which we may have already received
      const result = await this.natsService.requestScoringData(jobId, resumeId);

      if (!result.success) {
        this.logger.warn(
          `Failed to request scoring data: ${result.error}`,
          { jobId, resumeId },
        );
        return undefined;
      }

      // For now, return undefined - in production, this would use request/reply
      // or subscribe to a response subject. The scoring data is typically
      // already available from the analysis.match.scored event.
      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error fetching scoring data: ${errorMessage}`,
        { jobId, resumeId },
      );
      throw new ReportGeneratorException('SCORING_SERVICE_UNAVAILABLE', {
        jobId,
        resumeId,
        error: errorMessage,
        service: 'scoring-engine-svc',
      });
    }
  }

  /**
   * Fetches resume data from resume-parser-svc via NATS.
   *
   * @param resumeId - The resume ID
   * @returns A promise resolving to ResumeData or undefined if not available
   */
  private async fetchResumeData(resumeId: string): Promise<ResumeData | undefined> {
    if (!this.natsService) {
      this.logger.debug(
        'NATS service not available, skipping resume data fetch',
        { resumeId },
      );
      return undefined;
    }

    try {
      this.logger.debug(`Requesting resume data for resume ${resumeId}`);

      const result = await this.natsService.requestResumeData(resumeId);

      if (!result.success) {
        this.logger.warn(
          `Failed to request resume data: ${result.error}`,
          { resumeId },
        );
        return undefined;
      }

      // For now, return undefined - in production, this would use request/reply
      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error fetching resume data: ${errorMessage}`,
        { resumeId },
      );
      // Resume data is not critical for all report types, so we don't throw
      return undefined;
    }
  }

  /**
   * Fetches job data from jd-extractor-svc via NATS.
   *
   * @param jobId - The job ID
   * @returns A promise resolving to JobData or undefined if not available
   */
  private async fetchJobData(jobId: string): Promise<JobData | undefined> {
    if (!this.natsService) {
      this.logger.debug(
        'NATS service not available, skipping job data fetch',
        { jobId },
      );
      return undefined;
    }

    try {
      this.logger.debug(`Requesting job data for job ${jobId}`);

      const result = await this.natsService.requestJobData(jobId);

      if (!result.success) {
        this.logger.warn(
          `Failed to request job data: ${result.error}`,
          { jobId },
        );
        return undefined;
      }

      // For now, return undefined - in production, this would use request/reply
      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error fetching job data: ${errorMessage}`,
        { jobId },
      );
      // Job data is not critical for all report types, so we don't throw
      return undefined;
    }
  }

  /**
   * Builds a ReportDataItem from fetched data sources.
   *
   * @param resumeId - The resume ID
   * @param jobId - The job ID
   * @param scoringData - The scoring data (optional)
   * @param _resumeData - The resume data (optional, reserved for future use)
   * @param _jobData - The job data (optional, reserved for future use)
   * @returns A ReportDataItem with available data
   */
  private buildReportDataItem(
    resumeId: string,
    jobId: string,
    scoringData?: ScoringData,
    _resumeData?: ResumeData,
    _jobData?: JobData,
  ): ReportDataItem {
    const item: ReportDataItem = {
      resumeId,
      jobId,
    };

    // Populate from scoring data if available
    if (scoringData) {
      item.scoreBreakdown = {
        skillsMatch: scoringData.breakdown.skillsMatch,
        experienceMatch: scoringData.breakdown.experienceMatch,
        educationMatch: scoringData.breakdown.educationMatch,
        overallFit: scoringData.breakdown.overallFit,
      };

      item.skillsAnalysis = scoringData.matchingSkills.map((skill) => ({
        skill: skill.skill,
        matchScore: skill.matchScore,
        matchType: skill.matchType,
        explanation: skill.explanation,
      }));

      item.recommendation = {
        decision: scoringData.recommendations.decision,
        reasoning: scoringData.recommendations.reasoning,
        strengths: scoringData.recommendations.strengths,
        concerns: scoringData.recommendations.concerns,
        suggestions: scoringData.recommendations.suggestions,
      };

      item.confidence = scoringData.analysisConfidence;

      item.metadata = {
        processingTimeMs: scoringData.processingTimeMs,
        generatedAt: scoringData.scoredAt,
      };
    }

    // Note: _resumeData and _jobData are reserved for future enrichment
    // These can be used to add candidate details and job requirements
    // to the report data item for more comprehensive reports

    return item;
  }

  /**
   * Generates a report in a specific format using ReportTemplatesService.
   * Supports markdown, html, pdf, json, and excel formats.
   * @param data - The report data items to include in the report.
   * @param format - The output format.
   * @returns A promise resolving to GeneratedReportFile with fileId and download URL.
   * @throws ReportGeneratorException with specific error codes for different failure scenarios.
   */
  private async generateReportInFormat(
    data: ReportDataItem[],
    format: GeneratedReportFile['format'],
  ): Promise<GeneratedReportFile> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      if (!data || data.length === 0) {
        throw new ReportGeneratorException('EMPTY_REPORT_DATA', {
          format,
          correlationId: correlationContext?.traceId,
        });
      }

      // Use the first data item as the primary report document
      const primaryData = data[0];

      this.logger.debug(`Generating ${format} report`, {
        jobId: primaryData.jobId,
        resumeId: primaryData.resumeId,
        format,
        dataCount: data.length,
        correlationId: correlationContext?.traceId,
      });

      // Convert ReportDataItem to a SchemaReportDocument-like structure
      // The ReportTemplatesService expects the schema's ReportDocument type
      const reportDocument = {
        _id: new Types.ObjectId(),
        jobId: primaryData.jobId,
        resumeId: primaryData.resumeId,
        scoreBreakdown: primaryData.scoreBreakdown ?? {
          skillsMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          overallFit: 0,
        },
        skillsAnalysis: primaryData.skillsAnalysis ?? [],
        recommendation: primaryData.recommendation ?? {
          decision: 'consider',
          reasoning: 'No recommendation available',
          strengths: [],
          concerns: [],
          suggestions: [],
        },
        summary: this.generateSummaryFromData(data),
        analysisConfidence: primaryData.confidence ?? 0,
        processingTimeMs: primaryData.metadata?.processingTimeMs ?? 0,
        status: 'completed' as const,
        generatedBy: 'report-generator-service',
        llmModel: 'gemini-1.5-flash',
        generatedAt: primaryData.metadata?.generatedAt ?? new Date(),
      } as unknown as SchemaReportDocument;

      // Determine template type based on data count
      const templateType =
        data.length > 1 ? 'comparison' : 'individual';

      let fileId: string;
      let filename: string;

      // For PDF and Excel, use the specialized buffer methods
      if (format === 'pdf') {
        try {
          const pdfResult = await this.reportTemplatesService.generatePdfReportBuffer(
            reportDocument,
            templateType,
            {
              candidateName: `Candidate ${primaryData.resumeId}`,
              jobTitle: `Position ${primaryData.jobId}`,
            },
          );
          fileId = await this.gridFsService.saveReportBuffer(
            pdfResult.content,
            pdfResult.filename,
            pdfResult.metadata,
          );
          filename = pdfResult.filename;
        } catch (error) {
          // If it's already a ReportGeneratorException, re-throw with additional context
          if (error instanceof ReportGeneratorException) {
            this.logger.error('PDF template rendering failed', {
              errorCode: error.code,
              errorContext: error.context,
              jobId: primaryData.jobId,
              resumeId: primaryData.resumeId,
              correlationId: correlationContext?.traceId,
            });
            throw error;
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Failed to generate PDF report', {
            error: errorMessage,
            jobId: primaryData.jobId,
            resumeId: primaryData.resumeId,
            correlationId: correlationContext?.traceId,
          });

          throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
            error: errorMessage,
            format: 'pdf',
            jobId: primaryData.jobId,
            resumeId: primaryData.resumeId,
            correlationId: correlationContext?.traceId,
            originalError: error,
          });
        }
      } else if (format === 'excel') {
        try {
          const excelResult = await this.reportTemplatesService.generateExcelReportBuffer(
            reportDocument,
            templateType,
            {
              candidateName: `Candidate ${primaryData.resumeId}`,
              jobTitle: `Position ${primaryData.jobId}`,
            },
          );
          fileId = await this.gridFsService.saveReportBuffer(
            excelResult.content,
            excelResult.filename,
            excelResult.metadata,
          );
          filename = excelResult.filename;
        } catch (error) {
          // If it's already a ReportGeneratorException, re-throw with additional context
          if (error instanceof ReportGeneratorException) {
            this.logger.error('Excel template rendering failed', {
              errorCode: error.code,
              errorContext: error.context,
              jobId: primaryData.jobId,
              resumeId: primaryData.resumeId,
              correlationId: correlationContext?.traceId,
            });
            throw error;
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Failed to generate Excel report', {
            error: errorMessage,
            jobId: primaryData.jobId,
            resumeId: primaryData.resumeId,
            correlationId: correlationContext?.traceId,
          });

          throw new ReportGeneratorException('EXCEL_GENERATION_FAILED', {
            error: errorMessage,
            format: 'excel',
            jobId: primaryData.jobId,
            resumeId: primaryData.resumeId,
            correlationId: correlationContext?.traceId,
            originalError: error,
          });
        }
      } else {
        // For text-based formats (markdown, html, json)
        try {
          const generatedFile =
            await this.reportTemplatesService.generateReportInFormat(
              reportDocument,
              format,
              templateType,
              {
                candidateName: `Candidate ${primaryData.resumeId}`,
                jobTitle: `Position ${primaryData.jobId}`,
              },
            );

          fileId = await this.gridFsService.saveReport(
            generatedFile.content,
            generatedFile.filename,
            generatedFile.metadata,
          );
          filename = generatedFile.filename;
        } catch (error) {
          // If it's already a ReportGeneratorException, re-throw with additional context
          if (error instanceof ReportGeneratorException) {
            this.logger.error('Template rendering failed', {
              errorCode: error.code,
              errorContext: error.context,
              format,
              jobId: primaryData.jobId,
              resumeId: primaryData.resumeId,
              correlationId: correlationContext?.traceId,
            });
            throw error;
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to generate ${format} report`, {
            error: errorMessage,
            format,
            jobId: primaryData.jobId,
            resumeId: primaryData.resumeId,
            correlationId: correlationContext?.traceId,
          });

          throw new ReportGeneratorException('TEMPLATE_RENDER_FAILED', {
            error: errorMessage,
            format,
            jobId: primaryData.jobId,
            resumeId: primaryData.resumeId,
            correlationId: correlationContext?.traceId,
            originalError: error,
          });
        }
      }

      this.logger.debug(
        `Generated ${format} report: ${filename}, fileId: ${fileId}`,
        {
          jobId: primaryData.jobId,
          resumeId: primaryData.resumeId,
          correlationId: correlationContext?.traceId,
        },
      );

      return {
        format,
        fileId,
        filename,
        downloadUrl: `/api/reports/file/${fileId}`,
      };
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error generating ${format} report`, {
        error: errorMessage,
        format,
        dataCount: data?.length ?? 0,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('REPORT_GENERATION_FAILED', {
        format,
        error: errorMessage,
        dataCount: data?.length ?? 0,
        correlationId: correlationContext?.traceId,
        originalError: error,
      });
    }
  }

  /**
   * Generates a summary from report data items.
   * @param data - The report data items.
   * @returns A summary string.
   */
  private generateSummaryFromData(data: ReportDataItem[]): string {
    if (data.length === 0) {
      return 'No report data available.';
    }

    if (data.length === 1) {
      const item = data[0];
      const score = item.scoreBreakdown?.overallFit ?? 0;
      const decision = item.recommendation?.decision ?? 'unknown';
      return `Candidate analysis complete. Overall match score: ${score}%. Recommendation: ${decision}.`;
    }

    // For multiple candidates, provide a batch summary
    const avgScore =
      data.reduce((sum, item) => sum + (item.scoreBreakdown?.overallFit ?? 0), 0) /
      data.length;
    const topCandidate = data.reduce((top, item) => {
      const topScore = top.scoreBreakdown?.overallFit ?? 0;
      const itemScore = item.scoreBreakdown?.overallFit ?? 0;
      return itemScore > topScore ? item : top;
    }, data[0]);

    return `Analysis of ${data.length} candidates complete. Average match score: ${Math.round(avgScore)}%. Top candidate (resume ${topCandidate.resumeId}) scored ${topCandidate.scoreBreakdown?.overallFit ?? 0}%.`;
  }
}
