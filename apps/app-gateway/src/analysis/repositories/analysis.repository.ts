import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, FilterQuery } from 'mongoose';
import type { AnalysisResultDocument } from '../schemas/analysis-result.schema';
import { AnalysisResult } from '../schemas/analysis-result.schema';

export interface AnalysisQuery {
  jobId?: string;
  resumeId?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  recommendation?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AnalysisListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeFailed?: boolean;
}

export interface PaginatedAnalysisResults {
  results: AnalysisResultDocument[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Manages persistence for analysis results.
 */
@Injectable()
export class AnalysisRepository {
  private readonly logger = new Logger(AnalysisRepository.name);

  /**
   * Initializes a new instance of the Analysis Repository.
   * @param analysisResultModel - The analysis result model.
   */
  constructor(
    @InjectModel(AnalysisResult.name)
    private readonly analysisResultModel: Model<AnalysisResultDocument>,
  ) {}

  /**
   * Creates a new analysis result.
   * @param analysisData - The analysis data.
   * @returns A promise that resolves to AnalysisResultDocument.
   */
  public async createAnalysis(
    analysisData: Partial<AnalysisResult>,
  ): Promise<AnalysisResultDocument> {
    this.logger.debug(
      `Creating analysis result for analysisId: ${analysisData.analysisId}`,
    );

    const analysis = new this.analysisResultModel({
      ...analysisData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedAnalysis = await analysis.save();
    this.logger.debug(
      `Successfully created analysis with ID: ${savedAnalysis._id}`,
    );
    return savedAnalysis;
  }

  /**
   * Creates a new version of an existing analysis result.
   * @param analysisId - The analysis ID.
   * @param analysisData - The updated analysis data.
   * @returns A promise that resolves to AnalysisResultDocument.
   */
  public async createVersion(
    analysisId: string,
    analysisData: Partial<AnalysisResult>,
  ): Promise<AnalysisResultDocument> {
    this.logger.debug(`Creating new version for analysis: ${analysisId}`);

    // Get the current latest version
    const currentLatest = await this.analysisResultModel
      .findOne({ analysisId, isLatestVersion: true })
      .exec();

    if (!currentLatest) {
      throw new BadRequestException(`No analysis found with ID: ${analysisId}`);
    }

    // Mark current version as not latest
    await this.analysisResultModel
      .updateOne(
        { _id: currentLatest._id },
        { $set: { isLatestVersion: false } },
      )
      .exec();

    // Create new version
    const newVersion = new this.analysisResultModel({
      ...analysisData,
      analysisId,
      version: currentLatest.version + 1,
      isLatestVersion: true,
      previousVersionId: currentLatest._id.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedVersion = await newVersion.save();
    this.logger.debug(
      `Successfully created version ${savedVersion.version} for analysis: ${analysisId}`,
    );
    return savedVersion;
  }

  /**
   * Finds an analysis result by ID.
   * @param analysisId - The analysis ID.
   * @returns A promise that resolves to AnalysisResultDocument | null.
   */
  public async findById(
    analysisId: string,
  ): Promise<AnalysisResultDocument | null> {
    this.logger.debug(`Finding analysis by ID: ${analysisId}`);
    return this.analysisResultModel.findOne({ analysisId }).exec();
  }

  /**
   * Finds the latest version of an analysis result.
   * @param analysisId - The analysis ID.
   * @returns A promise that resolves to AnalysisResultDocument | null.
   */
  public async findLatestVersion(
    analysisId: string,
  ): Promise<AnalysisResultDocument | null> {
    this.logger.debug(`Finding latest version for analysis: ${analysisId}`);
    return this.analysisResultModel
      .findOne({ analysisId, isLatestVersion: true })
      .exec();
  }

  /**
   * Finds all versions of an analysis result.
   * @param analysisId - The analysis ID.
   * @returns A promise that resolves to AnalysisResultDocument[].
   */
  public async findAllVersions(
    analysisId: string,
  ): Promise<AnalysisResultDocument[]> {
    this.logger.debug(`Finding all versions for analysis: ${analysisId}`);
    return this.analysisResultModel
      .find({ analysisId })
      .sort({ version: -1 })
      .exec();
  }

  /**
   * Finds analysis results with pagination.
   * @param query - The query filters.
   * @param options - The pagination options.
   * @returns A promise that resolves to PaginatedAnalysisResults.
   */
  public async findAnalysisResults(
    query: AnalysisQuery = {},
    options: AnalysisListOptions = {},
  ): Promise<PaginatedAnalysisResults> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeFailed = false,
    } = options;

    this.logger.debug('Finding analysis results with pagination', {
      query,
      options,
    });

    const filter = this.buildQueryFilter(query);

    if (!includeFailed && !query.status) {
      filter.status = { $ne: 'failed' };
    }

    const skip = (page - 1) * limit;
    const sortOption: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [results, totalCount] = await Promise.all([
      this.analysisResultModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.analysisResultModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      results,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Finds analysis results by job ID.
   * @param jobId - The job ID.
   * @param options - The pagination options.
   * @returns A promise that resolves to PaginatedAnalysisResults.
   */
  public async findByJobId(
    jobId: string,
    options: AnalysisListOptions = {},
  ): Promise<PaginatedAnalysisResults> {
    return this.findAnalysisResults({ jobId }, options);
  }

  /**
   * Finds analysis results by resume ID.
   * @param resumeId - The resume ID.
   * @param options - The pagination options.
   * @returns A promise that resolves to PaginatedAnalysisResults.
   */
  public async findByResumeId(
    resumeId: string,
    options: AnalysisListOptions = {},
  ): Promise<PaginatedAnalysisResults> {
    return this.findAnalysisResults({ resumeId }, options);
  }

  /**
   * Finds analysis results for comparison (multiple analysis IDs).
   * @param analysisIds - Array of analysis IDs.
   * @returns A promise that resolves to AnalysisResultDocument[].
   */
  public async findForComparison(
    analysisIds: string[],
  ): Promise<AnalysisResultDocument[]> {
    this.logger.debug(
      `Finding analysis results for comparison: ${analysisIds.join(', ')}`,
    );
    return this.analysisResultModel
      .find({
        analysisId: { $in: analysisIds },
        isLatestVersion: true,
        status: 'completed',
      })
      .sort({ overallScore: -1 })
      .exec();
  }

  /**
   * Finds top analysis results by job ID (for ranking candidates).
   * @param jobId - The job ID.
   * @param limit - The number of results to return.
   * @returns A promise that resolves to AnalysisResultDocument[].
   */
  public async findTopResultsByJobId(
    jobId: string,
    limit = 10,
  ): Promise<AnalysisResultDocument[]> {
    this.logger.debug(
      `Finding top ${limit} analysis results for job: ${jobId}`,
    );
    return this.analysisResultModel
      .find({
        jobId,
        isLatestVersion: true,
        status: 'completed',
      })
      .sort({ overallScore: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Updates an analysis result.
   * @param analysisId - The analysis ID.
   * @param updateData - The update data.
   * @returns A promise that resolves to AnalysisResultDocument | null.
   */
  public async updateAnalysis(
    analysisId: string,
    updateData: Partial<AnalysisResult>,
  ): Promise<AnalysisResultDocument | null> {
    this.logger.debug(`Updating analysis: ${analysisId}`);
    const updated = await this.analysisResultModel
      .findOneAndUpdate(
        { analysisId },
        { $set: { ...updateData, updatedAt: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();

    if (updated) {
      this.logger.debug(`Successfully updated analysis: ${analysisId}`);
    } else {
      this.logger.warn(`No analysis found to update: ${analysisId}`);
    }

    return updated;
  }

  /**
   * Updates analysis status.
   * @param analysisId - The analysis ID.
   * @param status - The new status.
   * @returns A promise that resolves to AnalysisResultDocument | null.
   */
  public async updateStatus(
    analysisId: string,
    status: string,
  ): Promise<AnalysisResultDocument | null> {
    const updateData: Partial<AnalysisResult> = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    return this.updateAnalysis(analysisId, updateData);
  }

  /**
   * Deletes an analysis result.
   * @param analysisId - The analysis ID.
   * @returns A promise that resolves to boolean.
   */
  public async deleteAnalysis(analysisId: string): Promise<boolean> {
    this.logger.debug(`Deleting analysis: ${analysisId}`);
    const result = await this.analysisResultModel
      .deleteOne({ analysisId })
      .exec();
    const deleted = result.deletedCount > 0;

    if (deleted) {
      this.logger.debug(`Successfully deleted analysis: ${analysisId}`);
    } else {
      this.logger.warn(`No analysis found to delete: ${analysisId}`);
    }

    return deleted;
  }

  /**
   * Creates batch analysis results.
   * @param analysesData - Array of analysis data.
   * @returns A promise that resolves to AnalysisResultDocument[].
   */
  public async createBatch(
    analysesData: Partial<AnalysisResult>[],
  ): Promise<AnalysisResultDocument[]> {
    this.logger.debug(
      `Creating ${analysesData.length} analysis results in batch`,
    );

    const analysesWithTimestamps = analysesData.map((data) => ({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const savedAnalyses = await this.analysisResultModel.insertMany(
      analysesWithTimestamps,
    );
    this.logger.debug(
      `Successfully created ${savedAnalyses.length} analysis results in batch`,
    );
    return savedAnalyses;
  }

  /**
   * Finds batch analysis results for a job.
   * @param jobId - The job ID.
   * @param resumeIds - Array of resume IDs.
   * @returns A promise that resolves to AnalysisResultDocument[].
   */
  public async findBatchResults(
    jobId: string,
    resumeIds: string[],
  ): Promise<AnalysisResultDocument[]> {
    this.logger.debug(
      `Finding batch results for job: ${jobId}, resumes: ${resumeIds.length}`,
    );
    return this.analysisResultModel
      .find({
        jobId,
        resumeId: { $in: resumeIds },
        isLatestVersion: true,
      })
      .exec();
  }

  /**
   * Health check method.
   * @returns A promise that resolves to health status.
   */
  public async healthCheck(): Promise<{ status: string; count: number }> {
    try {
      const count = await this.analysisResultModel.countDocuments().exec();
      return { status: 'healthy', count };
    } catch (error) {
      this.logger.error('Analysis repository health check failed', error);
      return { status: 'unhealthy', count: -1 };
    }
  }

  /**
   * Builds query filter from AnalysisQuery.
   * @param query - The query filters.
   * @returns A FilterQuery object.
   */
  public buildQueryFilter(
    query: AnalysisQuery,
  ): FilterQuery<AnalysisResultDocument> {
    const filter: FilterQuery<AnalysisResultDocument> = {};

    if (query.jobId) {
      filter.jobId = query.jobId;
    }

    if (query.resumeId) {
      filter.resumeId = query.resumeId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.recommendation) {
      filter.recommendation = query.recommendation;
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

    if (query.minScore !== undefined || query.maxScore !== undefined) {
      filter.overallScore = {};
      if (query.minScore !== undefined) {
        filter.overallScore.$gte = query.minScore;
      }
      if (query.maxScore !== undefined) {
        filter.overallScore.$lte = query.maxScore;
      }
    }

    return filter;
  }
}
