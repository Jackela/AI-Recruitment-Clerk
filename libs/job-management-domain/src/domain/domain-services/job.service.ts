/**
 * Job Management Domain - Job Service
 * Domain service for job-related business logic
 */

import { Job, JobStatus, CreateJobData } from '../entities/job.entity';

export interface JobFilter {
  status?: JobStatus | JobStatus[];
  organizationId?: string;
  department?: string;
  type?: string;
  locationType?: string;
  postedBy?: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedJobs {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface JobRepository {
  findById(id: string): Promise<Job | null>;
  findByOrganization(
    organizationId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedJobs>;
  findByStatus(
    status: JobStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedJobs>;
  findByFilters(
    filters: JobFilter,
    options?: PaginationOptions,
  ): Promise<PaginatedJobs>;
  save(job: Job): Promise<Job>;
  update(job: Job): Promise<Job>;
  delete(id: string): Promise<boolean>;
  count(filters?: JobFilter): Promise<number>;
}

export class JobService {
  constructor(private readonly repository: JobRepository) {}

  /**
   * Create a new job
   */
  async createJob(
    data: CreateJobData,
  ): Promise<{ success: boolean; job?: Job; errors?: string[] }> {
    // Validate job data
    const validation = Job.validateCreate(data);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Create job entity
    const job = new Job(data);

    // Save to repository
    const savedJob = await this.repository.save(job);

    return {
      success: true,
      job: savedJob,
    };
  }

  /**
   * Update an existing job
   */
  async updateJob(
    jobId: string,
    data: Partial<CreateJobData>,
  ): Promise<{ success: boolean; job?: Job; errors?: string[] }> {
    // Find the job
    const job = await this.repository.findById(jobId);
    if (!job) {
      return {
        success: false,
        errors: ['Job not found'],
      };
    }

    // Update the job
    const result = job.update(data);
    if (!result.success) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    // Save updated job
    const updatedJob = await this.repository.update(job);

    return {
      success: true,
      job: updatedJob,
    };
  }

  /**
   * Delete a job
   */
  async deleteJob(
    jobId: string,
  ): Promise<{ success: boolean; errors?: string[] }> {
    // Find the job
    const job = await this.repository.findById(jobId);
    if (!job) {
      return {
        success: false,
        errors: ['Job not found'],
      };
    }

    // Check if job can be deleted (not archived)
    if (job.status === JobStatus.ARCHIVED) {
      return {
        success: false,
        errors: ['Cannot delete archived job'],
      };
    }

    // Delete from repository
    const deleted = await this.repository.delete(jobId);

    if (!deleted) {
      return {
        success: false,
        errors: ['Failed to delete job'],
      };
    }

    return {
      success: true,
    };
  }

  /**
   * Get a job by ID
   */
  async getJobById(jobId: string): Promise<Job | null> {
    return this.repository.findById(jobId);
  }

  /**
   * Find jobs by status
   */
  async findJobsByStatus(
    status: JobStatus | JobStatus[],
    options: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<PaginatedJobs> {
    const filters: JobFilter = {
      status,
    };
    return this.repository.findByFilters(filters, options);
  }

  /**
   * Find jobs by organization
   */
  async findJobsByOrganization(
    organizationId: string,
    options: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<PaginatedJobs> {
    const filters: JobFilter = {
      organizationId,
    };
    return this.repository.findByFilters(filters, options);
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(
    filters: JobFilter,
    options: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<PaginatedJobs> {
    return this.repository.findByFilters(filters, options);
  }

  /**
   * Activate a job
   */
  async activateJob(
    jobId: string,
  ): Promise<{ success: boolean; job?: Job; errors?: string[] }> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      return {
        success: false,
        errors: ['Job not found'],
      };
    }

    const result = job.activate();
    if (!result.success) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    const updatedJob = await this.repository.update(job);
    return {
      success: true,
      job: updatedJob,
    };
  }

  /**
   * Close a job
   */
  async closeJob(
    jobId: string,
  ): Promise<{ success: boolean; job?: Job; errors?: string[] }> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      return {
        success: false,
        errors: ['Job not found'],
      };
    }

    const result = job.close();
    if (!result.success) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    const updatedJob = await this.repository.update(job);
    return {
      success: true,
      job: updatedJob,
    };
  }

  /**
   * Archive a job
   */
  async archiveJob(
    jobId: string,
  ): Promise<{ success: boolean; job?: Job; errors?: string[] }> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      return {
        success: false,
        errors: ['Job not found'],
      };
    }

    const result = job.transitionTo(JobStatus.ARCHIVED);
    if (!result.success) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    const updatedJob = await this.repository.update(job);
    return {
      success: true,
      job: updatedJob,
    };
  }

  /**
   * Count jobs by filters
   */
  async countJobs(filters?: JobFilter): Promise<number> {
    return this.repository.count(filters);
  }

  /**
   * Get active jobs count
   */
  async getActiveJobsCount(organizationId?: string): Promise<number> {
    const filters: JobFilter = {
      status: JobStatus.ACTIVE,
      isActive: true,
    };
    if (organizationId) {
      filters.organizationId = organizationId;
    }
    return this.repository.count(filters);
  }

  /**
   * Handle pagination
   */
  static paginate<T>(
    items: T[],
    options: PaginationOptions,
  ): {
    items: T[];
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } {
    const { page, limit } = options;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
