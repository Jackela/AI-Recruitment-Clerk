import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { Report, ReportDocument, ScoreBreakdown, MatchingSkill, ReportRecommendation } from '../schemas/report.schema';

export interface ReportCreateData {
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
}

export interface ReportUpdateData {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  reportGridFsId?: string;
  detailedReportUrl?: string;
  errorMessage?: string;
  processingTimeMs?: number;
}

export interface ReportQuery {
  jobId?: string;
  resumeId?: string;
  status?: string;
  generatedBy?: string;
  requestedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;
  recommendation?: 'hire' | 'consider' | 'interview' | 'reject';
}

export interface ReportListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeFailedReports?: boolean;
}

export interface PaginatedReports {
  reports: ReportDocument[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ReportAnalytics {
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
}

@Injectable()
export class ReportRepository {
  private readonly logger = new Logger(ReportRepository.name);

  constructor(
    @InjectModel(Report.name, 'report-generator')
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  async createReport(reportData: ReportCreateData): Promise<ReportDocument> {
    try {
      this.logger.debug(`Creating report for jobId: ${reportData.jobId}, resumeId: ${reportData.resumeId}`);
      
      const report = new this.reportModel({
        ...reportData,
        status: 'completed',
        generatedAt: new Date(),
      });

      const savedReport = await report.save();
      
      this.logger.debug(`Successfully created report with ID: ${savedReport._id}`);
      return savedReport;
    } catch (error) {
      this.logger.error('Failed to create report', {
        error: error.message,
        reportData: { jobId: reportData.jobId, resumeId: reportData.resumeId }
      });
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  async updateResumeRecord(resumeId: string, updateData: ReportUpdateData): Promise<ReportDocument | null> {
    try {
      this.logger.debug(`Updating report for resumeId: ${resumeId}`);
      
      const updatedReport = await this.reportModel.findOneAndUpdate(
        { resumeId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).exec();
      
      if (updatedReport) {
        this.logger.debug(`Successfully updated report for resumeId: ${resumeId}`);
      } else {
        this.logger.warn(`No report found for resumeId: ${resumeId}`);
      }
      
      return updatedReport;
    } catch (error) {
      this.logger.error('Failed to update resume record', {
        error: error.message,
        resumeId,
        updateData
      });
      throw new Error(`Failed to update resume record: ${error.message}`);
    }
  }

  async updateReport(reportId: string, updateData: Partial<ReportCreateData>): Promise<ReportDocument | null> {
    try {
      this.logger.debug(`Updating report with ID: ${reportId}`);
      
      const updatedReport = await this.reportModel.findByIdAndUpdate(
        reportId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).exec();
      
      if (updatedReport) {
        this.logger.debug(`Successfully updated report: ${reportId}`);
      } else {
        this.logger.warn(`No report found with ID: ${reportId}`);
      }
      
      return updatedReport;
    } catch (error) {
      this.logger.error('Failed to update report', {
        error: error.message,
        reportId,
        updateData
      });
      throw new Error(`Failed to update report: ${error.message}`);
    }
  }

  async findReport(query: ReportQuery): Promise<ReportDocument | null> {
    try {
      this.logger.debug('Finding single report', { query });
      
      const filter = this.buildQueryFilter(query);
      const report = await this.reportModel.findOne(filter).exec();
      
      return report;
    } catch (error) {
      this.logger.error('Failed to find report', {
        error: error.message,
        query
      });
      throw new Error(`Failed to find report: ${error.message}`);
    }
  }

  async findReportById(reportId: string): Promise<ReportDocument | null> {
    try {
      this.logger.debug(`Finding report by ID: ${reportId}`);
      
      const report = await this.reportModel.findById(reportId).exec();
      
      return report;
    } catch (error) {
      this.logger.error('Failed to find report by ID', {
        error: error.message,
        reportId
      });
      throw new Error(`Failed to find report by ID: ${error.message}`);
    }
  }

  async findReports(query: ReportQuery = {}, options: ReportListOptions = {}): Promise<PaginatedReports> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'generatedAt',
        sortOrder = 'desc',
        includeFailedReports = false
      } = options;
      
      this.logger.debug('Finding reports with pagination', { query, options });
      
      const filter = this.buildQueryFilter(query);
      
      // Exclude failed reports unless explicitly requested
      if (!includeFailedReports && !query.status) {
        filter.status = { $ne: 'failed' };
      }
      
      const skip = (page - 1) * limit;
      const sortOption: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      
      const [reports, totalCount] = await Promise.all([
        this.reportModel
          .find(filter)
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.reportModel.countDocuments(filter).exec()
      ]);
      
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        reports,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      this.logger.error('Failed to find reports', {
        error: error.message,
        query,
        options
      });
      throw new Error(`Failed to find reports: ${error.message}`);
    }
  }

  async findReportsByJobId(jobId: string, options: ReportListOptions = {}): Promise<PaginatedReports> {
    return this.findReports({ jobId }, options);
  }

  async findReportsByResumeId(resumeId: string, options: ReportListOptions = {}): Promise<PaginatedReports> {
    return this.findReports({ resumeId }, options);
  }

  async deleteReport(reportId: string): Promise<boolean> {
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
        reportId
      });
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  async getReportAnalytics(filters: ReportQuery = {}): Promise<ReportAnalytics> {
    try {
      this.logger.debug('Generating report analytics', { filters });
      
      const filter = this.buildQueryFilter(filters);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [aggregationResults] = await this.reportModel.aggregate([
        { $match: filter },
        {
          $facet: {
            totalReports: [{ $count: "count" }],
            statusBreakdown: [
              { $group: { _id: "$status", count: { $sum: 1 } } }
            ],
            recommendationBreakdown: [
              { $group: { _id: "$recommendation.decision", count: { $sum: 1 } } }
            ],
            averageMetrics: [
              {
                $group: {
                  _id: null,
                  avgProcessingTime: { $avg: "$processingTimeMs" },
                  avgConfidence: { $avg: "$analysisConfidence" }
                }
              }
            ],
            todayReports: [
              {
                $match: {
                  generatedAt: { $gte: today, $lt: tomorrow }
                }
              },
              { $count: "count" }
            ],
            topCandidates: [
              { $match: { status: "completed" } },
              { $sort: { "scoreBreakdown.overallFit": -1 } },
              { $limit: 10 },
              {
                $project: {
                  resumeId: 1,
                  overallScore: "$scoreBreakdown.overallFit",
                  recommendation: "$recommendation.decision"
                }
              }
            ]
          }
        }
      ]).exec();
      
      const analytics: ReportAnalytics = {
        totalReports: aggregationResults.totalReports[0]?.count || 0,
        reportsByStatus: {},
        reportsByRecommendation: {},
        averageProcessingTime: aggregationResults.averageMetrics[0]?.avgProcessingTime || 0,
        averageConfidenceScore: aggregationResults.averageMetrics[0]?.avgConfidence || 0,
        reportsGeneratedToday: aggregationResults.todayReports[0]?.count || 0,
        topPerformingCandidates: aggregationResults.topCandidates || []
      };
      
      // Process status breakdown
      aggregationResults.statusBreakdown.forEach(item => {
        analytics.reportsByStatus[item._id] = item.count;
      });
      
      // Process recommendation breakdown
      aggregationResults.recommendationBreakdown.forEach(item => {
        analytics.reportsByRecommendation[item._id] = item.count;
      });
      
      return analytics;
    } catch (error) {
      this.logger.error('Failed to generate report analytics', {
        error: error.message,
        filters
      });
      throw new Error(`Failed to generate report analytics: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.reportModel.findOne().limit(1).exec();
      return true;
    } catch (error) {
      this.logger.error('Report repository health check failed', { error: error.message });
      return false;
    }
  }

  private buildQueryFilter(query: ReportQuery): FilterQuery<ReportDocument> {
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
