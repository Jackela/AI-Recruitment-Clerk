import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, FilterQuery } from 'mongoose';
import type { ReportDocument } from '../schemas/report.schema';
import { Report } from '../schemas/report.schema';
import { DatabasePerformanceMonitor } from '@ai-recruitment-clerk/infrastructure-shared';
import { ReportAnalyticsRepository } from './report-analytics.repository';
import type {
  ReportCreateData,
  ReportUpdateData,
  ReportQuery,
  ReportListOptions,
  PaginatedReports,
  ReportAnalytics,
  JobAnalytics,
  TimeSeriesAnalytics,
  HealthCheckResult,
  PerformanceMetricsReport,
} from './report.types';
import { ALLOWED_SORT_FIELDS, ALLOWED_SORT_FIELDS_SET } from './report.types';

// Re-export types for backward compatibility
export type {
  DateGrouping,
  PerformanceMetrics,
  ReportCreateData,
  ReportUpdateData,
  ReportQuery,
  ReportListOptions,
  PaginatedReports,
  ReportAnalytics,
} from './report.types';
export { ALLOWED_SORT_FIELDS, ALLOWED_SORT_FIELDS_SET } from './report.types';

/**
 * Manages persistence for report.
 */
@Injectable()
export class ReportRepository {
  private readonly logger = new Logger(ReportRepository.name);
  private readonly performanceMonitor = new DatabasePerformanceMonitor();
  private readonly analyticsRepository: ReportAnalyticsRepository;

  /**
   * Initializes a new instance of the Report Repository.
   * @param reportModel - The report model.
   */
  constructor(
    @InjectModel(Report.name, 'report-generator')
    private readonly reportModel: Model<ReportDocument>,
  ) {
    this.analyticsRepository = new ReportAnalyticsRepository(reportModel);
  }

  /**
   * 🚀 MONITORED REPORT CREATION
   * Tracks creation performance and validates data integrity
   */
  public async createReport(reportData: ReportCreateData): Promise<ReportDocument> {
    return this.performanceMonitor.executeWithMonitoring(
      async () => {
        this.logger.debug(
          `Creating report for jobId: ${reportData.jobId}, resumeId: ${reportData.resumeId}`,
        );

        const report = new this.reportModel({
          ...reportData,
          status: 'completed',
          generatedAt: new Date(),
        });

        const savedReport = await report.save();

        this.logger.debug(
          `Successfully created report with ID: ${savedReport._id}`,
        );
        return savedReport;
      },
      'createReport',
      200, // Expected performance: 200ms
    );
  }

  /**
   * Updates resume record.
   * @param resumeId - The resume id.
   * @param updateData - The update data.
   * @returns A promise that resolves to ReportDocument | null.
   */
  public async updateResumeRecord(
    resumeId: string,
    updateData: ReportUpdateData,
  ): Promise<ReportDocument | null> {
    try {
      this.logger.debug(`Updating report for resumeId: ${resumeId}`);

      const updatedReport = await this.reportModel
        .findOneAndUpdate(
          { resumeId },
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .exec();

      if (updatedReport) {
        this.logger.debug(
          `Successfully updated report for resumeId: ${resumeId}`,
        );
      } else {
        this.logger.warn(`No report found for resumeId: ${resumeId}`);
      }

      return updatedReport;
    } catch (error) {
      this.logger.error('Failed to update resume record', {
        error: error.message,
        resumeId,
        updateData,
      });
      throw new Error(`Failed to update resume record: ${error.message}`);
    }
  }

  /**
   * 🚀 MONITORED REPORT UPDATE
   * Tracks update performance and validates modifications
   */
  public async updateReport(
    reportId: string,
    updateData: Partial<ReportCreateData>,
  ): Promise<ReportDocument | null> {
    return this.performanceMonitor.executeWithMonitoring(
      async () => {
        this.logger.debug(`Updating report with ID: ${reportId}`);

        const updatedReport = await this.reportModel
          .findByIdAndUpdate(
            reportId,
            { $set: updateData },
            { new: true, runValidators: true },
          )
          .lean()
          .exec();

        if (updatedReport) {
          this.logger.debug(`Successfully updated report: ${reportId}`);
        } else {
          this.logger.warn(`No report found with ID: ${reportId}`);
        }

        return updatedReport as unknown as ReportDocument | null;
      },
      'updateReport',
      150, // Expected performance: 150ms
    );
  }

  /**
   * Performs the find report operation.
   * @param query - The query.
   * @returns A promise that resolves to ReportDocument | null.
   */
  public async findReport(query: ReportQuery): Promise<ReportDocument | null> {
    try {
      this.logger.debug('Finding single report', { query });

      const filter = this.buildQueryFilter(query);
      const report = await this.reportModel.findOne(filter).exec();

      return report;
    } catch (error) {
      this.logger.error('Failed to find report', {
        error: error.message,
        query,
      });
      throw new Error(`Failed to find report: ${error.message}`);
    }
  }

  /**
   * 🚀 OPTIMIZED REPORT LOOKUP BY ID
   * Leverages MongoDB's built-in _id index for optimal performance
   */
  public async findReportById(reportId: string): Promise<ReportDocument | null> {
    return this.performanceMonitor.executeWithMonitoring(
      async () => {
        this.logger.debug(`Finding report by ID: ${reportId}`);

        const result = await this.reportModel.findById(reportId).lean().exec();
        return result as unknown as ReportDocument | null;
      },
      'findReportById',
      50, // Expected performance: 50ms with _id index
    );
  }

  /**
   * 🚀 OPTIMIZED PAGINATED REPORT SEARCH
   * Leverages composite indexes based on query patterns
   */
  public async findReports(
    query: ReportQuery = {},
    options: ReportListOptions = {},
  ): Promise<PaginatedReports> {
    return this.performanceMonitor.executeWithMonitoring(
      async () => {
        const {
          page = 1,
          limit = 20,
          sortBy = 'generatedAt',
          sortOrder = 'desc',
          includeFailedReports = false,
        } = options;

        this.logger.debug('Finding reports with pagination', {
          query,
          options,
        });

        // Validate sortBy against allowed fields to prevent property injection
        if (!ALLOWED_SORT_FIELDS_SET.has(sortBy)) {
          throw new BadRequestException(
            `Invalid sort field: "${sortBy}". Allowed fields: ${ALLOWED_SORT_FIELDS.join(', ')}`,
          );
        }

        const filter = this.buildQueryFilter(query);

        // Exclude failed reports unless explicitly requested
        if (!includeFailedReports && !query.status) {
          filter.status = { $ne: 'failed' };
        }

        const skip = (page - 1) * limit;
        let sortOption: Record<string, 1 | -1>;

        // Optimize sort to use composite indexes
        if (sortBy === 'generatedAt') {
          // Leverages time_score_status_analytics index
          sortOption = {
            generatedAt: sortOrder === 'asc' ? 1 : -1,
            'scoreBreakdown.overallFit': -1,
          };
        } else if (
          sortBy === 'overallFit' ||
          sortBy === 'scoreBreakdown.overallFit'
        ) {
          // Leverages score_status_ranking index
          sortOption = {
            'scoreBreakdown.overallFit': sortOrder === 'asc' ? 1 : -1,
            status: 1,
          };
        } else {
          sortOption = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        }

        // Use parallel execution for better performance
        const [reports, totalCount] = await Promise.all([
          this.reportModel
            .find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .select({
              _id: 1,
              jobId: 1,
              resumeId: 1,
              status: 1,
              'scoreBreakdown.overallFit': 1,
              'recommendation.decision': 1,
              generatedAt: 1,
              processingTimeMs: 1,
              analysisConfidence: 1,
            })
            .lean()
            .exec(),
          this.reportModel.countDocuments(filter).exec(),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return {
          reports,
          totalCount,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        };
      },
      'findReports',
      300, // Expected performance: 300ms
    );
  }

  /**
   * Performs the find reports by job id operation.
   * @param jobId - The job id.
   * @param options - The options.
   * @returns A promise that resolves to PaginatedReports.
   */
  public async findReportsByJobId(
    jobId: string,
    options: ReportListOptions = {},
  ): Promise<PaginatedReports> {
    return this.findReports({ jobId }, options);
  }

  /**
   * Performs the find reports by resume id operation.
   * @param resumeId - The resume id.
   * @param options - The options.
   * @returns A promise that resolves to PaginatedReports.
   */
  public async findReportsByResumeId(
    resumeId: string,
    options: ReportListOptions = {},
  ): Promise<PaginatedReports> {
    return this.findReports({ resumeId }, options);
  }

  /**
   * Removes report.
   * @param reportId - The report id.
   * @returns A promise that resolves to boolean value.
   */
  public async deleteReport(reportId: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting report with ID: ${reportId}`);

      const result = await this.reportModel.findByIdAndDelete(reportId).exec();

      if (result) {
        this.logger.debug(`Successfully deleted report: ${reportId}`);
        return true;
      } else {
        this.logger.warn(`No report found to delete with ID: ${reportId}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to delete report', {
        error: error.message,
        reportId,
      });
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * 🚀 OPTIMIZED ANALYTICS QUERY
   * Delegates to ReportAnalyticsRepository
   */
  public async getReportAnalytics(
    filters: ReportQuery = {},
  ): Promise<ReportAnalytics> {
    return this.analyticsRepository.getReportAnalytics(filters, (q) => this.buildQueryFilter(q));
  }

  /**
   * 🚀 OPTIMIZED JOB PERFORMANCE ANALYTICS
   * Delegates to ReportAnalyticsRepository
   */
  public async getJobAnalytics(jobId: string): Promise<JobAnalytics> {
    return this.analyticsRepository.getJobAnalytics(jobId);
  }

  /**
   * 🚀 OPTIMIZED TIME-SERIES ANALYTICS
   * Delegates to ReportAnalyticsRepository
   */
  public async getTimeSeriesAnalytics(
    dateRange: { from: Date; to: Date },
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<TimeSeriesAnalytics[]> {
    return this.analyticsRepository.getTimeSeriesAnalytics(dateRange, granularity);
  }

  /**
   * Health check with performance monitoring
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    try {
      return this.performanceMonitor.executeWithMonitoring(
        async () => {
          const count = await this.reportModel.countDocuments().exec();
          const performanceStats = this.performanceMonitor.getRealTimeStats();
          return {
            status: 'healthy',
            count,
            performance: performanceStats
              ? {
                  averageResponseTime: performanceStats.averageQueryTime || 0,
                  totalOperations: performanceStats.connectionCount || 0,
                  successRate: 100, // Assume 100% if no errors
                  errorRate: 0,
                  lastOperationTime: new Date(),
                  healthStatus: 'healthy' as const,
                }
              : null,
          };
        },
        'healthCheck',
        100,
      );
    } catch (error) {
      this.logger.error('Report repository health check failed', {
        error: error.message,
      });
      return {
        status: 'unhealthy',
        count: -1,
        performance: null,
      };
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics(): PerformanceMetricsReport {
    return this.performanceMonitor.getPerformanceReport();
  }

  /**
   * Build query filter from ReportQuery
   */
  public buildQueryFilter(query: ReportQuery): FilterQuery<ReportDocument> {
    const filter: FilterQuery<ReportDocument> = {};

    if (query.jobId) {
      filter.jobId = query.jobId;
    }

    if (query.resumeId) {
      filter.resumeId = query.resumeId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.generatedBy) {
      filter.generatedBy = query.generatedBy;
    }

    if (query.requestedBy) {
      filter.requestedBy = query.requestedBy;
    }

    if (query.recommendation) {
      filter['recommendation.decision'] = query.recommendation;
    }

    if (query.dateFrom || query.dateTo) {
      filter.generatedAt = {};
      if (query.dateFrom) {
        filter.generatedAt.$gte = query.dateFrom;
      }
      if (query.dateTo) {
        filter.generatedAt.$lte = query.dateTo;
      }
    }

    if (query.minScore !== undefined || query.maxScore !== undefined) {
      filter['scoreBreakdown.overallFit'] = {};
      if (query.minScore !== undefined) {
        filter['scoreBreakdown.overallFit'].$gte = query.minScore;
      }
      if (query.maxScore !== undefined) {
        filter['scoreBreakdown.overallFit'].$lte = query.maxScore;
      }
    }

    return filter;
  }
}
