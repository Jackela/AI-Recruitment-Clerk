import {
  JobService,
  JobRepository,
  JobFilter,
  PaginatedJobs,
  PaginationOptions,
} from './job.service';
import { Job, JobStatus, JobType, CreateJobData } from '../entities/job.entity';

// Mock repository implementation
class MockJobRepository implements JobRepository {
  private jobs: Map<string, Job> = new Map();

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null;
  }

  async findByOrganization(
    organizationId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedJobs> {
    const allJobs = Array.from(this.jobs.values()).filter(
      (job) => job.organizationId === organizationId,
    );
    return this.paginateResults(allJobs, options);
  }

  async findByStatus(
    status: JobStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedJobs> {
    const allJobs = Array.from(this.jobs.values()).filter(
      (job) => job.status === status,
    );
    return this.paginateResults(allJobs, options);
  }

  async findByFilters(
    filters: JobFilter,
    options?: PaginationOptions,
  ): Promise<PaginatedJobs> {
    let allJobs = Array.from(this.jobs.values());

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      allJobs = allJobs.filter((job) => statuses.includes(job.status));
    }

    if (filters.organizationId) {
      allJobs = allJobs.filter(
        (job) => job.organizationId === filters.organizationId,
      );
    }

    if (filters.department) {
      allJobs = allJobs.filter((job) => job.department === filters.department);
    }

    if (filters.type) {
      allJobs = allJobs.filter((job) => job.type === filters.type);
    }

    if (filters.locationType) {
      allJobs = allJobs.filter(
        (job) => job.location.type === filters.locationType,
      );
    }

    if (filters.postedBy) {
      allJobs = allJobs.filter((job) => job.postedBy === filters.postedBy);
    }

    if (filters.isActive !== undefined) {
      allJobs = allJobs.filter((job) => job.isActive === filters.isActive);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      allJobs = allJobs.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.description.toLowerCase().includes(term),
      );
    }

    return this.paginateResults(allJobs, options);
  }

  async save(job: Job): Promise<Job> {
    this.jobs.set(job.id, job);
    return job;
  }

  async update(job: Job): Promise<Job> {
    this.jobs.set(job.id, job);
    return job;
  }

  async delete(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async count(filters?: JobFilter): Promise<number> {
    if (!filters) return this.jobs.size;

    let count = 0;
    for (const job of this.jobs.values()) {
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        if (!statuses.includes(job.status)) continue;
      }
      if (
        filters.organizationId &&
        job.organizationId !== filters.organizationId
      )
        continue;
      if (filters.isActive !== undefined && job.isActive !== filters.isActive)
        continue;
      count++;
    }
    return count;
  }

  private paginateResults(
    jobs: Job[],
    options?: PaginationOptions,
  ): PaginatedJobs {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const total = jobs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      jobs: jobs.slice(startIndex, endIndex),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  clear(): void {
    this.jobs.clear();
  }
}

describe('JobService', () => {
  let service: JobService;
  let repository: MockJobRepository;

  const validJobData: CreateJobData = {
    title: 'Senior Software Engineer',
    description:
      'We are looking for a senior software engineer with 5+ years of experience in building scalable web applications.',
    department: 'Engineering',
    location: {
      type: 'hybrid',
      city: 'San Francisco',
      country: 'USA',
    },
    type: JobType.FULL_TIME,
    requirements: {
      skills: ['JavaScript', 'TypeScript', 'React'],
      experienceYears: 5,
    },
    postedBy: 'user-123',
    organizationId: 'org-456',
  };

  beforeEach(() => {
    repository = new MockJobRepository();
    service = new JobService(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('createJob', () => {
    it('should create job', async () => {
      const result = await service.createJob(validJobData);

      expect(result.success).toBe(true);
      expect(result.job).toBeDefined();
      expect(result.job!.title).toBe(validJobData.title);
      expect(result.job!.status).toBe(JobStatus.DRAFT);
    });

    it('should reject job with invalid data', async () => {
      const result = await service.createJob({
        ...validJobData,
        title: '',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job title is required');
      expect(result.job).toBeUndefined();
    });

    it('should reject job with missing required fields', async () => {
      const result = await service.createJob({
        ...validJobData,
        requirements: {
          skills: [],
          experienceYears: 0,
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'At least one required skill is required',
      );
    });

    it('should save job to repository', async () => {
      const result = await service.createJob(validJobData);

      expect(result.success).toBe(true);
      const savedJob = await repository.findById(result.job!.id);
      expect(savedJob).toBeDefined();
      expect(savedJob!.title).toBe(validJobData.title);
    });
  });

  describe('updateJob', () => {
    it('should update job', async () => {
      const createResult = await service.createJob(validJobData);
      const jobId = createResult.job!.id;

      const updateResult = await service.updateJob(jobId, {
        title: 'Updated Title',
        description:
          'Updated description that is definitely longer than fifty characters for validation purposes.',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.job!.title).toBe('Updated Title');
    });

    it('should return error for non-existent job', async () => {
      const result = await service.updateJob('non-existent-id', {
        title: 'New Title',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job not found');
    });

    it('should reject update with invalid data', async () => {
      const createResult = await service.createJob(validJobData);
      const jobId = createResult.job!.id;

      const result = await service.updateJob(jobId, {
        title: '',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job title is required');
    });

    it('should not update job if validation fails', async () => {
      const createResult = await service.createJob(validJobData);
      const jobId = createResult.job!.id;
      const originalTitle = createResult.job!.title;

      await service.updateJob(jobId, { title: '' });

      const job = await repository.findById(jobId);
      expect(job!.title).toBe(originalTitle);
    });
  });

  describe('deleteJob', () => {
    it('should delete job', async () => {
      const createResult = await service.createJob(validJobData);
      const jobId = createResult.job!.id;

      const deleteResult = await service.deleteJob(jobId);

      expect(deleteResult.success).toBe(true);
      const job = await repository.findById(jobId);
      expect(job).toBeNull();
    });

    it('should return error for non-existent job', async () => {
      const result = await service.deleteJob('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job not found');
    });

    it('should not delete archived job', async () => {
      const createResult = await service.createJob({
        ...validJobData,
        status: JobStatus.ARCHIVED,
      });
      const jobId = createResult.job!.id;

      const result = await service.deleteJob(jobId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot delete archived job');
    });
  });

  describe('findJobsByStatus', () => {
    it('should find jobs by single status', async () => {
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });
      await service.createJob({ ...validJobData, status: JobStatus.DRAFT });
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });

      const result = await service.findJobsByStatus(JobStatus.ACTIVE);

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.jobs.every((job) => job.status === JobStatus.ACTIVE)).toBe(
        true,
      );
    });

    it('should find jobs by multiple statuses', async () => {
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });
      await service.createJob({ ...validJobData, status: JobStatus.DRAFT });
      await service.createJob({ ...validJobData, status: JobStatus.CLOSED });

      const result = await service.findJobsByStatus([
        JobStatus.ACTIVE,
        JobStatus.DRAFT,
      ]);

      expect(result.jobs).toHaveLength(2);
    });

    it('should return empty result when no jobs match', async () => {
      await service.createJob({ ...validJobData, status: JobStatus.DRAFT });

      const result = await service.findJobsByStatus(JobStatus.CLOSED);

      expect(result.jobs).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findJobsByOrganization', () => {
    it('should find jobs by organization', async () => {
      await service.createJob({ ...validJobData, organizationId: 'org-1' });
      await service.createJob({ ...validJobData, organizationId: 'org-2' });
      await service.createJob({ ...validJobData, organizationId: 'org-1' });

      const result = await service.findJobsByOrganization('org-1');

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('handle pagination', () => {
    it('should handle pagination correctly', async () => {
      // Create 25 jobs
      for (let i = 0; i < 25; i++) {
        await service.createJob({
          ...validJobData,
          title: `Job ${i}`,
        });
      }

      const result = await service.findJobsByStatus(JobStatus.DRAFT, {
        page: 1,
        limit: 10,
      });

      expect(result.jobs).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(false);
    });

    it('should return correct page', async () => {
      for (let i = 0; i < 25; i++) {
        await service.createJob({
          ...validJobData,
          title: `Job ${i}`,
        });
      }

      const result = await service.findJobsByStatus(JobStatus.DRAFT, {
        page: 2,
        limit: 10,
      });

      expect(result.jobs).toHaveLength(10);
      expect(result.page).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });

    it('should handle last page with fewer items', async () => {
      for (let i = 0; i < 25; i++) {
        await service.createJob({
          ...validJobData,
          title: `Job ${i}`,
        });
      }

      const result = await service.findJobsByStatus(JobStatus.DRAFT, {
        page: 3,
        limit: 10,
      });

      expect(result.jobs).toHaveLength(5);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(true);
    });

    it('should use default pagination options', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createJob(validJobData);
      }

      const result = await service.findJobsByStatus(JobStatus.DRAFT);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getJobById', () => {
    it('should get job by ID', async () => {
      const createResult = await service.createJob(validJobData);
      const jobId = createResult.job!.id;

      const job = await service.getJobById(jobId);

      expect(job).toBeDefined();
      expect(job!.id).toBe(jobId);
    });

    it('should return null for non-existent job', async () => {
      const job = await service.getJobById('non-existent-id');

      expect(job).toBeNull();
    });
  });

  describe('activateJob', () => {
    it('should activate draft job', async () => {
      const createResult = await service.createJob(validJobData);
      const jobId = createResult.job!.id;

      const result = await service.activateJob(jobId);

      expect(result.success).toBe(true);
      expect(result.job!.status).toBe(JobStatus.ACTIVE);
    });

    it('should return error for non-existent job', async () => {
      const result = await service.activateJob('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job not found');
    });

    it('should return error for invalid transition', async () => {
      const createResult = await service.createJob({
        ...validJobData,
        status: JobStatus.ARCHIVED,
      });
      const jobId = createResult.job!.id;

      const result = await service.activateJob(jobId);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Cannot transition');
    });
  });

  describe('closeJob', () => {
    it('should close active job', async () => {
      const createResult = await service.createJob({
        ...validJobData,
        status: JobStatus.ACTIVE,
      });
      const jobId = createResult.job!.id;

      const result = await service.closeJob(jobId);

      expect(result.success).toBe(true);
      expect(result.job!.status).toBe(JobStatus.CLOSED);
    });

    it('should return error for non-existent job', async () => {
      const result = await service.closeJob('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job not found');
    });
  });

  describe('archiveJob', () => {
    it('should archive closed job', async () => {
      const createResult = await service.createJob({
        ...validJobData,
        status: JobStatus.CLOSED,
      });
      const jobId = createResult.job!.id;

      const result = await service.archiveJob(jobId);

      expect(result.success).toBe(true);
      expect(result.job!.status).toBe(JobStatus.ARCHIVED);
    });

    it('should return error for invalid transition', async () => {
      const createResult = await service.createJob({
        ...validJobData,
        status: JobStatus.ACTIVE,
      });
      const jobId = createResult.job!.id;

      const result = await service.archiveJob(jobId);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Cannot transition');
    });
  });

  describe('countJobs', () => {
    it('should count all jobs', async () => {
      await service.createJob(validJobData);
      await service.createJob(validJobData);
      await service.createJob(validJobData);

      const count = await service.countJobs();

      expect(count).toBe(3);
    });

    it('should count jobs with filters', async () => {
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });
      await service.createJob({ ...validJobData, status: JobStatus.DRAFT });
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });

      const count = await service.countJobs({ status: JobStatus.ACTIVE });

      expect(count).toBe(2);
    });
  });

  describe('getActiveJobsCount', () => {
    it('should count active jobs', async () => {
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });
      await service.createJob({ ...validJobData, status: JobStatus.DRAFT });
      await service.createJob({ ...validJobData, status: JobStatus.ACTIVE });

      const count = await service.getActiveJobsCount();

      expect(count).toBe(2);
    });

    it('should count active jobs for specific organization', async () => {
      await service.createJob({
        ...validJobData,
        status: JobStatus.ACTIVE,
        organizationId: 'org-1',
      });
      await service.createJob({
        ...validJobData,
        status: JobStatus.ACTIVE,
        organizationId: 'org-2',
      });
      await service.createJob({
        ...validJobData,
        status: JobStatus.ACTIVE,
        organizationId: 'org-1',
      });

      const count = await service.getActiveJobsCount('org-1');

      expect(count).toBe(2);
    });
  });

  describe('searchJobs', () => {
    it('should search jobs with filters', async () => {
      await service.createJob({
        ...validJobData,
        department: 'Engineering',
        location: { type: 'remote' },
      });
      await service.createJob({
        ...validJobData,
        department: 'Sales',
        location: { type: 'onsite' },
      });

      const result = await service.searchJobs({
        department: 'Engineering',
        locationType: 'remote',
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].department).toBe('Engineering');
    });

    it('should search jobs with search term', async () => {
      await service.createJob({
        ...validJobData,
        title: 'Senior JavaScript Developer',
      });
      await service.createJob({
        ...validJobData,
        title: 'Python Engineer',
      });

      const result = await service.searchJobs({ searchTerm: 'javascript' });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toContain('JavaScript');
    });
  });

  describe('static paginate', () => {
    it('should paginate array correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result = JobService.paginate(items, { page: 1, limit: 3 });

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.totalPages).toBe(4);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(false);
    });

    it('should handle last page correctly', () => {
      const items = [1, 2, 3, 4, 5];

      const result = JobService.paginate(items, { page: 2, limit: 3 });

      expect(result.items).toEqual([4, 5]);
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(true);
    });
  });
});
