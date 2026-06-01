import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, FilterQuery } from 'mongoose';
import type {
  ReportTemplateDocument,
  GeneratedReportDocument,
} from '../schemas/report.schema';
import { ReportTemplate, GeneratedReport } from '../schemas/report.schema';

export interface ReportQuery {
  templateId?: string;
  jobId?: string;
  resumeId?: string;
  analysisId?: string;
  type?: string;
  status?: string;
  generatedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ReportListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedReports {
  reports: GeneratedReportDocument[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ShareReportData {
  sharedBy: string;
  sharedWith: string;
  permission: 'view' | 'edit' | 'admin';
  expiresAt: Date;
}

export interface ScheduleData {
  scheduleId: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  nextRunAt: Date;
  parameters: Record<string, unknown>;
}

/**
 * Manages persistence for reports.
 */
@Injectable()
export class ReportRepository {
  private readonly logger = new Logger(ReportRepository.name);

  /**
   * Initializes a new instance of the Report Repository.
   * @param reportTemplateModel - The report template model.
   * @param generatedReportModel - The generated report model.
   */
  constructor(
    @InjectModel(ReportTemplate.name)
    private readonly reportTemplateModel: Model<ReportTemplateDocument>,
    @InjectModel(GeneratedReport.name)
    private readonly generatedReportModel: Model<GeneratedReportDocument>,
  ) {}

  // ==================== Template Operations ====================

  /**
   * Creates a new report template.
   * @param templateData - The template data.
   * @returns A promise that resolves to ReportTemplateDocument.
   */
  public async createTemplate(
    templateData: Partial<ReportTemplate>,
  ): Promise<ReportTemplateDocument> {
    this.logger.debug(`Creating report template: ${templateData.name}`);

    const template = new this.reportTemplateModel({
      ...templateData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedTemplate = await template.save();
    this.logger.debug(
      `Successfully created template: ${savedTemplate.templateId}`,
    );
    return savedTemplate;
  }

  /**
   * Finds a template by ID.
   * @param templateId - The template ID.
   * @returns A promise that resolves to ReportTemplateDocument | null.
   */
  public async findTemplateById(
    templateId: string,
  ): Promise<ReportTemplateDocument | null> {
    this.logger.debug(`Finding template by ID: ${templateId}`);
    return this.reportTemplateModel.findOne({ templateId }).exec();
  }

  /**
   * Finds all active templates.
   * @param type - Optional template type filter.
   * @returns A promise that resolves to ReportTemplateDocument[].
   */
  public async findActiveTemplates(
    type?: string,
  ): Promise<ReportTemplateDocument[]> {
    this.logger.debug(
      `Finding active templates${type ? ` of type: ${type}` : ''}`,
    );
    const filter: FilterQuery<ReportTemplateDocument> = { isActive: true };
    if (type) {
      filter.type = type;
    }
    return this.reportTemplateModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * Updates a template.
   * @param templateId - The template ID.
   * @param updateData - The update data.
   * @returns A promise that resolves to ReportTemplateDocument | null.
   */
  public async updateTemplate(
    templateId: string,
    updateData: Partial<ReportTemplate>,
  ): Promise<ReportTemplateDocument | null> {
    this.logger.debug(`Updating template: ${templateId}`);
    return this.reportTemplateModel
      .findOneAndUpdate(
        { templateId },
        { $set: { ...updateData, updatedAt: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
  }

  /**
   * Deletes a template.
   * @param templateId - The template ID.
   * @returns A promise that resolves to boolean.
   */
  public async deleteTemplate(templateId: string): Promise<boolean> {
    this.logger.debug(`Deleting template: ${templateId}`);
    const result = await this.reportTemplateModel
      .deleteOne({ templateId })
      .exec();
    return result.deletedCount > 0;
  }

  // ==================== Generated Report Operations ====================

  /**
   * Creates a new generated report.
   * @param reportData - The report data.
   * @returns A promise that resolves to GeneratedReportDocument.
   */
  public async createReport(
    reportData: Partial<GeneratedReport>,
  ): Promise<GeneratedReportDocument> {
    this.logger.debug(`Creating generated report: ${reportData.name}`);

    const report = new this.generatedReportModel({
      ...reportData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedReport = await report.save();
    this.logger.debug(`Successfully created report: ${savedReport.reportId}`);
    return savedReport;
  }

  /**
   * Finds a report by ID.
   * @param reportId - The report ID.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async findReportById(
    reportId: string,
  ): Promise<GeneratedReportDocument | null> {
    this.logger.debug(`Finding report by ID: ${reportId}`);
    return this.generatedReportModel.findOne({ reportId }).exec();
  }

  /**
   * Finds reports with pagination.
   * @param query - The query filters.
   * @param options - The pagination options.
   * @returns A promise that resolves to PaginatedReports.
   */
  public async findReports(
    query: ReportQuery = {},
    options: ReportListOptions = {},
  ): Promise<PaginatedReports> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    this.logger.debug('Finding reports with pagination', { query, options });

    const filter = this.buildQueryFilter(query);
    const skip = (page - 1) * limit;
    const sortOption: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [reports, totalCount] = await Promise.all([
      this.generatedReportModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.generatedReportModel.countDocuments(filter).exec(),
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
  }

  /**
   * Finds reports by job ID.
   * @param jobId - The job ID.
   * @param options - The pagination options.
   * @returns A promise that resolves to PaginatedReports.
   */
  public async findReportsByJobId(
    jobId: string,
    options: ReportListOptions = {},
  ): Promise<PaginatedReports> {
    return this.findReports({ jobId }, options);
  }

  /**
   * Finds reports by resume ID.
   * @param resumeId - The resume ID.
   * @param options - The pagination options.
   * @returns A promise that resolves to PaginatedReports.
   */
  public async findReportsByResumeId(
    resumeId: string,
    options: ReportListOptions = {},
  ): Promise<PaginatedReports> {
    return this.findReports({ resumeId }, options);
  }

  /**
   * Updates a report.
   * @param reportId - The report ID.
   * @param updateData - The update data.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async updateReport(
    reportId: string,
    updateData: Partial<GeneratedReport>,
  ): Promise<GeneratedReportDocument | null> {
    this.logger.debug(`Updating report: ${reportId}`);
    return this.generatedReportModel
      .findOneAndUpdate(
        { reportId },
        { $set: { ...updateData, updatedAt: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
  }

  /**
   * Updates report status.
   * @param reportId - The report ID.
   * @param status - The new status.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async updateReportStatus(
    reportId: string,
    status: string,
  ): Promise<GeneratedReportDocument | null> {
    const updateData: Partial<GeneratedReport> = { status };
    if (status === 'generated') {
      updateData.generatedAt = new Date();
    }
    return this.updateReport(reportId, updateData);
  }

  /**
   * Deletes a report.
   * @param reportId - The report ID.
   * @returns A promise that resolves to boolean.
   */
  public async deleteReport(reportId: string): Promise<boolean> {
    this.logger.debug(`Deleting report: ${reportId}`);
    const result = await this.generatedReportModel
      .deleteOne({ reportId })
      .exec();
    return result.deletedCount > 0;
  }

  // ==================== Report Sharing ====================

  /**
   * Shares a report with a user.
   * @param reportId - The report ID.
   * @param shareData - The share data.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async shareReport(
    reportId: string,
    shareData: ShareReportData,
  ): Promise<GeneratedReportDocument | null> {
    this.logger.debug(
      `Sharing report ${reportId} with ${shareData.sharedWith}`,
    );

    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return this.generatedReportModel
      .findOneAndUpdate(
        { reportId },
        {
          $push: {
            shares: {
              shareId,
              ...shareData,
              sharedAt: new Date(),
            },
          },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Revokes a share.
   * @param reportId - The report ID.
   * @param shareId - The share ID.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async revokeShare(
    reportId: string,
    shareId: string,
  ): Promise<GeneratedReportDocument | null> {
    this.logger.debug(`Revoking share ${shareId} for report ${reportId}`);
    return this.generatedReportModel
      .findOneAndUpdate(
        { reportId },
        {
          $pull: { shares: { shareId } },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Finds reports shared with a user.
   * @param userId - The user ID.
   * @returns A promise that resolves to GeneratedReportDocument[].
   */
  public async findSharedReports(
    userId: string,
  ): Promise<GeneratedReportDocument[]> {
    this.logger.debug(`Finding reports shared with user: ${userId}`);
    return this.generatedReportModel
      .find({
        'shares.sharedWith': userId,
        'shares.expiresAt': { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Checks if a user has access to a report.
   * @param reportId - The report ID.
   * @param userId - The user ID.
   * @returns A promise that resolves to boolean.
   */
  public async checkAccess(reportId: string, userId: string): Promise<boolean> {
    const report = await this.generatedReportModel.findOne({
      reportId,
      $or: [
        { generatedBy: userId },
        {
          'shares.sharedWith': userId,
          'shares.expiresAt': { $gt: new Date() },
        },
      ],
    });
    return !!report;
  }

  // ==================== Report Scheduling ====================

  /**
   * Schedules a report.
   * @param reportId - The report ID.
   * @param scheduleData - The schedule data.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async scheduleReport(
    reportId: string,
    scheduleData: ScheduleData,
  ): Promise<GeneratedReportDocument | null> {
    this.logger.debug(
      `Scheduling report ${reportId} with frequency: ${scheduleData.frequency}`,
    );
    return this.generatedReportModel
      .findOneAndUpdate(
        { reportId },
        {
          $set: {
            schedule: scheduleData,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Cancels a scheduled report.
   * @param reportId - The report ID.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async cancelSchedule(
    reportId: string,
  ): Promise<GeneratedReportDocument | null> {
    this.logger.debug(`Cancelling schedule for report: ${reportId}`);
    return this.generatedReportModel
      .findOneAndUpdate(
        { reportId },
        {
          $set: { schedule: undefined, updatedAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Finds reports due for scheduled execution.
   * @returns A promise that resolves to GeneratedReportDocument[].
   */
  public async findDueScheduledReports(): Promise<GeneratedReportDocument[]> {
    this.logger.debug('Finding due scheduled reports');
    return this.generatedReportModel
      .find({
        'schedule.isActive': true,
        'schedule.nextRunAt': { $lte: new Date() },
      })
      .exec();
  }

  /**
   * Updates last run time for a scheduled report.
   * @param reportId - The report ID.
   * @returns A promise that resolves to GeneratedReportDocument | null.
   */
  public async updateLastRun(
    reportId: string,
  ): Promise<GeneratedReportDocument | null> {
    const now = new Date();
    return this.generatedReportModel
      .findOneAndUpdate(
        { reportId, 'schedule.isActive': true },
        {
          $set: {
            'schedule.lastRunAt': now,
            'schedule.nextRunAt': this.calculateNextRun(now),
            updatedAt: now,
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Health check method.
   * @returns A promise that resolves to health status.
   */
  public async healthCheck(): Promise<{ status: string; count: number }> {
    try {
      const count = await this.generatedReportModel.countDocuments().exec();
      return { status: 'healthy', count };
    } catch (error) {
      this.logger.error('Report repository health check failed', error);
      return { status: 'unhealthy', count: -1 };
    }
  }

  /**
   * Builds query filter from ReportQuery.
   * @param query - The query filters.
   * @returns A FilterQuery object.
   */
  public buildQueryFilter(
    query: ReportQuery,
  ): FilterQuery<GeneratedReportDocument> {
    const filter: FilterQuery<GeneratedReportDocument> = {};

    if (query.templateId) {
      filter.templateId = query.templateId;
    }

    if (query.jobId) {
      filter.jobId = query.jobId;
    }

    if (query.resumeId) {
      filter.resumeId = query.resumeId;
    }

    if (query.analysisId) {
      filter.analysisId = query.analysisId;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.generatedBy) {
      filter.generatedBy = query.generatedBy;
    }

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) {
        filter.createdAt.$gte = query.dateFrom;
      }
      if (query.dateTo) {
        filter.createdAt.$lte = query.dateTo;
      }
    }

    return filter;
  }

  private calculateNextRun(lastRun: Date): Date {
    const nextRun = new Date(lastRun);
    nextRun.setDate(nextRun.getDate() + 1); // Default: next day
    return nextRun;
  }
}
