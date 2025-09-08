import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ReportGeneratorService,
  ReportGenerationRequest,
} from '../report-generator/report-generator.service';
import {
  ReportRepository,
  ReportQuery,
  ReportListOptions,
} from '../report-generator/report.repository';
import { GridFsService } from '../report-generator/gridfs.service';
import { ReportTemplatesService } from '../report-generator/report-templates.service';

export interface ReportGenerationRequestDto {
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

export interface CandidateComparisonRequestDto {
  jobId: string;
  resumeIds: string[];
  requestedBy?: string;
}

export interface InterviewGuideRequestDto {
  jobId: string;
  resumeId: string;
  requestedBy?: string;
}

export interface ReportQueryDto {
  jobId?: string;
  resumeId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  generatedBy?: string;
  requestedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  maxScore?: number;
  recommendation?: 'hire' | 'consider' | 'interview' | 'reject';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeFailedReports?: boolean;
}

// Mock authentication guard for demonstration
// In production, replace with your actual authentication system
class AuthGuard {
  canActivate(): boolean {
    return true; // Always allow for demonstration
  }
}

@Controller('api/reports')
@UseGuards(AuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly reportRepository: ReportRepository,
    private readonly gridFsService: GridFsService,
    private readonly reportTemplatesService: ReportTemplatesService,
  ) {}

  @Post('generate')
  async generateReport(@Body() request: ReportGenerationRequestDto) {
    try {
      this.logger.log(
        `Generating ${request.reportType} report for job ${request.jobId}`,
      );

      // Validate request
      if (
        !request.jobId ||
        !request.resumeIds ||
        request.resumeIds.length === 0
      ) {
        throw new BadRequestException(
          'Job ID and at least one resume ID are required',
        );
      }

      if (!request.outputFormats || request.outputFormats.length === 0) {
        throw new BadRequestException('At least one output format is required');
      }

      const generationRequest: ReportGenerationRequest = {
        jobId: request.jobId,
        resumeIds: request.resumeIds,
        reportType: request.reportType,
        outputFormats: request.outputFormats,
        options: request.options,
      };

      const result =
        await this.reportGeneratorService.generateReport(generationRequest);

      return {
        success: true,
        data: result,
        message: `${request.reportType} report generated successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to generate report', {
        error: error.message,
        request: {
          jobId: request.jobId,
          resumeCount: request.resumeIds?.length,
          reportType: request.reportType,
        },
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Report generation failed: ${error.message}`,
      );
    }
  }

  @Post('compare-candidates')
  async generateCandidateComparison(
    @Body() request: CandidateComparisonRequestDto,
  ) {
    try {
      this.logger.log(
        `Generating candidate comparison for job ${request.jobId} with ${request.resumeIds.length} candidates`,
      );

      if (
        !request.jobId ||
        !request.resumeIds ||
        request.resumeIds.length < 2
      ) {
        throw new BadRequestException(
          'Job ID and at least 2 resume IDs are required for comparison',
        );
      }

      const comparisonReport =
        await this.reportGeneratorService.generateCandidateComparison(
          request.jobId,
          request.resumeIds,
          { requestedBy: request.requestedBy },
        );

      return {
        success: true,
        data: {
          comparisonReport,
          jobId: request.jobId,
          candidateCount: request.resumeIds.length,
        },
        message: 'Candidate comparison report generated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to generate candidate comparison', {
        error: error.message,
        jobId: request.jobId,
        candidateCount: request.resumeIds?.length,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Candidate comparison generation failed: ${error.message}`,
      );
    }
  }

  @Post('interview-guide')
  async generateInterviewGuide(@Body() request: InterviewGuideRequestDto) {
    try {
      this.logger.log(
        `Generating interview guide for job ${request.jobId}, resume ${request.resumeId}`,
      );

      if (!request.jobId || !request.resumeId) {
        throw new BadRequestException('Job ID and resume ID are required');
      }

      const interviewGuide =
        await this.reportGeneratorService.generateInterviewGuide(
          request.jobId,
          request.resumeId,
          { requestedBy: request.requestedBy },
        );

      return {
        success: true,
        data: {
          interviewGuide,
          jobId: request.jobId,
          resumeId: request.resumeId,
        },
        message: 'Interview guide generated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to generate interview guide', {
        error: error.message,
        jobId: request.jobId,
        resumeId: request.resumeId,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Interview guide generation failed: ${error.message}`,
      );
    }
  }

  @Get()
  async getReports(@Query() queryDto: ReportQueryDto) {
    try {
      this.logger.debug('Retrieving reports', { query: queryDto });

      const query: ReportQuery = {
        jobId: queryDto.jobId,
        resumeId: queryDto.resumeId,
        status: queryDto.status,
        generatedBy: queryDto.generatedBy,
        requestedBy: queryDto.requestedBy,
        recommendation: queryDto.recommendation,
        minScore: queryDto.minScore,
        maxScore: queryDto.maxScore,
      };

      if (queryDto.dateFrom) {
        query.dateFrom = new Date(queryDto.dateFrom);
      }

      if (queryDto.dateTo) {
        query.dateTo = new Date(queryDto.dateTo);
      }

      const options: ReportListOptions = {
        page: queryDto.page || 1,
        limit: queryDto.limit || 20,
        sortBy: queryDto.sortBy || 'generatedAt',
        sortOrder: queryDto.sortOrder || 'desc',
        includeFailedReports: queryDto.includeFailedReports || false,
      };

      const result = await this.reportRepository.findReports(query, options);

      return {
        success: true,
        data: result,
        message: 'Reports retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to retrieve reports', {
        error: error.message,
        query: queryDto,
      });

      throw new InternalServerErrorException(
        `Failed to retrieve reports: ${error.message}`,
      );
    }
  }

  @Get(':reportId')
  async getReport(@Param('reportId') reportId: string) {
    try {
      this.logger.debug(`Retrieving report: ${reportId}`);

      const report = await this.reportRepository.findReportById(reportId);

      if (!report) {
        throw new NotFoundException(`Report not found: ${reportId}`);
      }

      return {
        success: true,
        data: report,
        message: 'Report retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to retrieve report', {
        error: error.message,
        reportId,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to retrieve report: ${error.message}`,
      );
    }
  }

  @Get('file/:fileId')
  async downloadReportFile(
    @Param('fileId') fileId: string,
    @Query('format') format: string,
    @Res() response: Response,
  ) {
    try {
      this.logger.debug(`Downloading report file: ${fileId}`);

      // Get file metadata first
      const metadata = await this.gridFsService.getReportMetadata(fileId);

      if (!metadata) {
        throw new NotFoundException(`Report file not found: ${fileId}`);
      }

      // Get file stream
      const fileStream = await this.gridFsService.getReportStream(fileId);

      // Set appropriate headers
      response.set({
        'Content-Type': metadata.mimeType,
        'Content-Disposition': `attachment; filename="${fileId}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      // Stream the file
      fileStream.pipe(response);
    } catch (error) {
      this.logger.error('Failed to download report file', {
        error: error.message,
        fileId,
      });

      if (error instanceof NotFoundException) {
        response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `Report file not found: ${fileId}`,
        });
      } else {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Failed to download report file: ${error.message}`,
        });
      }
    }
  }

  @Delete(':reportId')
  async deleteReport(@Param('reportId') reportId: string) {
    try {
      this.logger.log(`Deleting report: ${reportId}`);

      const deleted = await this.reportRepository.deleteReport(reportId);

      if (!deleted) {
        throw new NotFoundException(`Report not found: ${reportId}`);
      }

      return {
        success: true,
        message: 'Report deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete report', {
        error: error.message,
        reportId,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to delete report: ${error.message}`,
      );
    }
  }

  @Get('job/:jobId')
  async getReportsByJob(
    @Param('jobId') jobId: string,
    @Query() queryDto: Omit<ReportQueryDto, 'jobId'>,
  ) {
    try {
      this.logger.debug(`Retrieving reports for job: ${jobId}`);

      const options: ReportListOptions = {
        page: queryDto.page || 1,
        limit: queryDto.limit || 20,
        sortBy: queryDto.sortBy || 'generatedAt',
        sortOrder: queryDto.sortOrder || 'desc',
        includeFailedReports: queryDto.includeFailedReports || false,
      };

      const result = await this.reportRepository.findReportsByJobId(
        jobId,
        options,
      );

      return {
        success: true,
        data: result,
        message: `Reports for job ${jobId} retrieved successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve reports by job', {
        error: error.message,
        jobId,
      });

      throw new InternalServerErrorException(
        `Failed to retrieve reports for job: ${error.message}`,
      );
    }
  }

  @Get('resume/:resumeId')
  async getReportsByResume(
    @Param('resumeId') resumeId: string,
    @Query() queryDto: Omit<ReportQueryDto, 'resumeId'>,
  ) {
    try {
      this.logger.debug(`Retrieving reports for resume: ${resumeId}`);

      const options: ReportListOptions = {
        page: queryDto.page || 1,
        limit: queryDto.limit || 20,
        sortBy: queryDto.sortBy || 'generatedAt',
        sortOrder: queryDto.sortOrder || 'desc',
        includeFailedReports: queryDto.includeFailedReports || false,
      };

      const result = await this.reportRepository.findReportsByResumeId(
        resumeId,
        options,
      );

      return {
        success: true,
        data: result,
        message: `Reports for resume ${resumeId} retrieved successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve reports by resume', {
        error: error.message,
        resumeId,
      });

      throw new InternalServerErrorException(
        `Failed to retrieve reports for resume: ${error.message}`,
      );
    }
  }

  @Get('analytics/overview')
  async getReportAnalytics(@Query() queryDto: ReportQueryDto) {
    try {
      this.logger.debug('Retrieving report analytics');

      const filters: ReportQuery = {
        jobId: queryDto.jobId,
        status: queryDto.status,
        generatedBy: queryDto.generatedBy,
        requestedBy: queryDto.requestedBy,
      };

      if (queryDto.dateFrom) {
        filters.dateFrom = new Date(queryDto.dateFrom);
      }

      if (queryDto.dateTo) {
        filters.dateTo = new Date(queryDto.dateTo);
      }

      const analytics = await this.reportRepository.getReportAnalytics(filters);

      return {
        success: true,
        data: analytics,
        message: 'Report analytics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to retrieve report analytics', {
        error: error.message,
        query: queryDto,
      });

      throw new InternalServerErrorException(
        `Failed to retrieve report analytics: ${error.message}`,
      );
    }
  }

  @Get('storage/stats')
  async getStorageStats() {
    try {
      this.logger.debug('Retrieving storage statistics');

      const stats = await this.gridFsService.getStorageStats();

      return {
        success: true,
        data: stats,
        message: 'Storage statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to retrieve storage stats', {
        error: error.message,
      });

      throw new InternalServerErrorException(
        `Failed to retrieve storage statistics: ${error.message}`,
      );
    }
  }

  @Get('health')
  async healthCheck() {
    try {
      const health = await this.reportGeneratorService.healthCheck();

      return {
        success: health.status === 'healthy',
        data: health,
        message: `Report generator service is ${health.status}`,
      };
    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });

      throw new InternalServerErrorException(
        `Health check failed: ${error.message}`,
      );
    }
  }
}
