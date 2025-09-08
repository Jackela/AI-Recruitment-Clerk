import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GridFsService, ReportFileMetadata } from './gridfs.service';
import { ReportRepository, ReportCreateData } from './report.repository';
import {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
} from '../schemas/report.schema';
import {
  ReportGeneratorException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';

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

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly gridFsService: GridFsService,
    private readonly reportRepo: ReportRepository,
  ) {}

  async handleMatchScored(event: MatchScoredEvent): Promise<void> {
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

  async generateReport(
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
        reportId: savedReport._id.toString(),
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

  async generateCandidateComparison(
    jobId: string,
    resumeIds: string[],
    options?: { requestedBy?: string },
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating candidate comparison for job ${jobId} with ${resumeIds.length} candidates`,
      );

      // Fetch scoring data for all candidates
      const candidateData = await Promise.all(
        resumeIds.map(async (resumeId) => {
          const report = await this.reportRepo.findReport({ jobId, resumeId });
          return report ? this.formatCandidateForComparison(report) : null;
        }),
      );

      const validCandidates = candidateData.filter(
        (candidate) => candidate !== null,
      );

      if (validCandidates.length < 2) {
        throw new ReportGeneratorException('INSUFFICIENT_CANDIDATES', {
          provided: validCandidates.length,
          required: 2,
          jobId: jobId,
        });
      }

      return await this.llmService.generateCandidateComparison(validCandidates);
    } catch (error) {
      this.logger.error('Failed to generate candidate comparison', {
        error: error.message,
        jobId,
        resumeIds,
      });
      throw error;
    }
  }

  async generateInterviewGuide(
    jobId: string,
    resumeId: string,
    options?: { requestedBy?: string },
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
      const candidateData = this.formatCandidateForInterview(report);
      const jobRequirements = this.extractJobRequirements(report);

      return await this.llmService.generateInterviewGuide(
        candidateData,
        jobRequirements,
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

  async getReportAnalytics(filters = {}) {
    return this.reportRepo.getReportAnalytics(filters);
  }

  async healthCheck(): Promise<{
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

    const allHealthy = llmHealth && gridFsHealth && repoHealth;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: {
        llmService: llmHealth,
        gridFsService: gridFsHealth,
        reportRepository: repoHealth,
      },
    };
  }

  private async buildReportEvent(event: MatchScoredEvent): Promise<any> {
    return {
      jobId: event.jobId,
      resumeIds: [event.resumeId],
      jobData: event.jobData,
      resumesData: event.resumeData ? [event.resumeData] : [],
      scoringResults: [event.scoreDto],
      metadata: event.metadata || {
        generatedAt: new Date(),
        reportType: 'match-analysis',
      },
    };
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
  ): Promise<any[]> {
    // This would typically fetch data from other services
    // For now, return placeholder data structure
    return request.resumeIds.map((resumeId) => ({
      resumeId,
      jobId: request.jobId,
      // Add more data fetching logic here
    }));
  }

  private async generateReportInFormat(
    data: any,
    format: string,
  ): Promise<any> {
    // Placeholder for format-specific generation
    return {
      format,
      fileId: `placeholder-${format}`,
      filename: `report.${format}`,
      downloadUrl: `/api/reports/download/placeholder-${format}`,
    };
  }

  private aggregateScoreBreakdown(data: any[]): ScoreBreakdown {
    // Placeholder aggregation logic
    return {
      skillsMatch: 75,
      experienceMatch: 80,
      educationMatch: 70,
      overallFit: 75,
    };
  }

  private aggregateSkillsAnalysis(data: any[]): MatchingSkill[] {
    // Placeholder skills analysis
    return [];
  }

  private generateOverallRecommendation(data: any[]): ReportRecommendation {
    // Placeholder recommendation logic
    return {
      decision: 'consider',
      reasoning: 'Aggregated analysis shows mixed results',
      strengths: ['Strong technical skills'],
      concerns: ['Limited experience in some areas'],
      suggestions: ['Consider for interview'],
    };
  }

  private async generateBatchSummary(data: any[]): Promise<string> {
    return `Batch report summary for ${data.length} candidates.`;
  }

  private calculateAverageConfidence(data: any[]): number {
    return 0.85; // Placeholder
  }

  private formatCandidateForComparison(report: any): any {
    return {
      id: report.resumeId,
      name: `Candidate ${report.resumeId}`,
      score: report.scoreBreakdown.overallFit / 100,
      skills: report.skillsAnalysis.map((skill: any) => skill.skill),
      recommendation: report.recommendation.decision,
    };
  }

  private formatCandidateForInterview(report: any): any {
    return {
      id: report.resumeId,
      name: `Candidate ${report.resumeId}`,
      skills: report.skillsAnalysis,
      experience: report.scoreBreakdown.experienceMatch,
      education: report.scoreBreakdown.educationMatch,
    };
  }

  private extractJobRequirements(report: any): any {
    return {
      requiredSkills: report.skillsAnalysis.map((skill: any) => skill.skill),
      experienceLevel: 'mid-level',
      educationLevel: 'bachelor',
    };
  }
}
