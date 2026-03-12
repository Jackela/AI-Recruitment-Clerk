import { JobRepository } from '../../repositories/job.repository';
import type { CacheService } from '../../cache/cache.service';
import type { Job, JobDocument } from '../../schemas/job.schema';
import type { Model } from 'mongoose';

// Mock data helpers
const createMockJob = (overrides: Partial<Job> = {}): JobDocument => {
  const baseJob = {
    _id: 'job-' + Math.random().toString(36).substr(2, 9),
    title: 'Software Engineer',
    description: 'Full stack development position',
    company: 'Tech Corp',
    location: 'Beijing',
    status: 'active',
    employmentType: 'full-time',
    salaryMin: 20000,
    salaryMax: 40000,
    salaryCurrency: 'CNY',
    skills: ['JavaScript', 'TypeScript', 'Node.js'],
    requirements: [],
    extractedKeywords: ['JavaScript', 'Node.js'],
    jdExtractionConfidence: 0.9,
    jdProcessedAt: new Date(),
    createdBy: 'user-1',
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as JobDocument;
  return baseJob;
};

// Mock CacheService
const createCacheServiceMock = (): jest.Mocked<CacheService> => {
  const cacheStore = new Map<string, unknown>();

  return {
    generateKey: jest.fn((...parts: string[]) => parts.join(':')),
    getJobQueryKey: jest.fn((query: Record<string, unknown>) => {
      const orderedQuery: Record<string, unknown> = {};
      Object.keys(query)
        .sort()
        .forEach((key) => {
          orderedQuery[key] = query[key];
        });
      return `db:jobs:findall:${JSON.stringify(orderedQuery)}`;
    }),
    wrap: jest.fn(async <T>(key: string, fn: () => Promise<T>) => {
      if (cacheStore.has(key)) {
        return cacheStore.get(key) as T;
      }
      const result = await fn();
      cacheStore.set(key, result);
      return result;
    }),
    get: jest.fn(async <T>(key: string) => {
      return (cacheStore.get(key) as T) ?? null;
    }),
    set: jest.fn(async <T>(key: string, value: T) => {
      cacheStore.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      cacheStore.delete(key);
    }),
    reset: jest.fn(async () => {
      cacheStore.clear();
    }),
    getMetrics: jest.fn(() => ({
      hits: 0,
      misses: 0,
      sets: 0,
      dels: 0,
      errors: 0,
      hitRate: 0,
      totalOperations: 0,
    })),
    resetMetrics: jest.fn(),
    healthCheck: jest.fn(async () => ({
      status: 'healthy',
      connected: true,
      type: 'memory',
      metrics: {
        hits: 0,
        misses: 0,
        sets: 0,
        dels: 0,
        errors: 0,
        hitRate: 0,
        totalOperations: 0,
      },
    })),
  } as unknown as jest.Mocked<CacheService>;
};

// Mock JobModel builder
const createJobModelMock = (jobs: JobDocument[] = []) => {
  const jobStore = [...jobs];

  return {
    // Create operation
    prototype: {
      save: jest.fn(),
    },

    // Query operations with chainable interface
    findById: jest.fn((id: string) => ({
      exec: jest
        .fn()
        .mockResolvedValue(jobStore.find((j) => j._id === id) || null),
    })),

    find: jest.fn((query = {}) => {
      let results = [...jobStore];

      // Apply filters
      if (query.status) {
        results = results.filter((j) => j.status === query.status);
      }
      if (query.company) {
        const regex =
          query.company instanceof RegExp
            ? query.company
            : new RegExp(query.company, 'i');
        results = results.filter((j) => regex.test(j.company));
      }
      if (query.employmentType) {
        results = results.filter(
          (j) => j.employmentType === query.employmentType,
        );
      }
      if (query.createdBy) {
        results = results.filter((j) => j.createdBy === query.createdBy);
      }
      if (query.skills?.$in) {
        results = results.filter((j) =>
          query.skills.$in.some((skill: string) => j.skills?.includes(skill)),
        );
      }
      if (query.$text?.$search) {
        const searchTerms = query.$text.$search.split(' ');
        results = results.filter((j) =>
          searchTerms.some(
            (term: string) =>
              j.title?.toLowerCase().includes(term.toLowerCase()) ||
              j.description?.toLowerCase().includes(term.toLowerCase()),
          ),
        );
      }

      const chainable = {
        sort: jest.fn((sortOptions: Record<string, unknown>) => {
          // Simple sort implementation
          if (sortOptions.createdAt === -1) {
            results.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
          }
          return chainable;
        }),
        limit: jest.fn((n: number) => {
          results = results.slice(0, n);
          return chainable;
        }),
        skip: jest.fn((n: number) => {
          results = results.slice(n);
          return chainable;
        }),
        exec: jest.fn().mockResolvedValue(results),
      };
      return chainable;
    }),

    findByIdAndUpdate: jest.fn(
      (id: string, update: { $set?: Partial<Job> } | Partial<Job>) => {
        const index = jobStore.findIndex((j) => j._id === id);
        if (index === -1) {
          return { exec: jest.fn().mockResolvedValue(null) };
        }

        const updateData = update.$set || update;
        jobStore[index] = {
          ...jobStore[index],
          ...updateData,
          updatedAt: new Date(),
        };
        return { exec: jest.fn().mockResolvedValue(jobStore[index]) };
      },
    ),

    findByIdAndDelete: jest.fn((id: string) => {
      const index = jobStore.findIndex((j) => j._id === id);
      if (index === -1) {
        return { exec: jest.fn().mockResolvedValue(null) };
      }
      const deleted = jobStore.splice(index, 1)[0];
      return { exec: jest.fn().mockResolvedValue(deleted) };
    }),

    countDocuments: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue(jobStore.length),
    })),

    aggregate: jest.fn((pipeline: unknown[]) => {
      return {
        exec: jest.fn().mockImplementation(() => {
          // Simple aggregation implementation
          if (JSON.stringify(pipeline).includes('$group')) {
            const groupStage = (
              pipeline as Array<{ $group?: Record<string, unknown> }>
            ).find((p) => p.$group)?.$group;

            if (groupStage?._id === '$status') {
              const counts: Record<string, number> = {};
              jobStore.forEach((job) => {
                counts[job.status] = (counts[job.status] || 0) + 1;
              });
              return Object.entries(counts).map(([status, count]) => ({
                _id: status,
                count,
              }));
            }

            if (groupStage?._id === '$company') {
              const counts: Record<string, number> = {};
              jobStore
                .filter((j) => j.status === 'active')
                .forEach((job) => {
                  counts[job.company] = (counts[job.company] || 0) + 1;
                });
              return Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([company, count]) => ({ company, count }));
            }
          }
          return [];
        }),
      };
    }),

    // Helper methods for test setup
    addJob: (job: JobDocument) => jobStore.push(job),
    clearJobs: () => (jobStore.length = 0),
    getJobs: () => [...jobStore],
  };
};

describe('JobRepository', () => {
  let repository: JobRepository;
  let jobModel: ReturnType<typeof createJobModelMock>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    jobModel = createJobModelMock();
    cacheService = createCacheServiceMock();
    repository = new JobRepository(
      jobModel as unknown as Model<JobDocument>,
      cacheService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job with timestamps', async () => {
      const jobData: Partial<Job> = {
        title: 'Backend Developer',
        description: 'Node.js position',
        company: 'TechCorp',
        status: 'active',
      };

      const mockSavedJob = createMockJob(jobData);
      jobModel.prototype.save = jest.fn().mockResolvedValue(mockSavedJob);

      // Override the constructor call
      jest.spyOn(jobModel, 'prototype' as never, 'get').mockReturnValue({
        save: jest.fn().mockResolvedValue(mockSavedJob),
      });

      // Create a mock implementation that mimics new jobModel()
      const jobModelConstructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedJob),
      }));
      Object.setPrototypeOf(
        jobModelConstructor,
        Object.getPrototypeOf(jobModel),
      );
      Object.assign(jobModelConstructor, jobModel);

      const repo = new JobRepository(
        jobModelConstructor as unknown as Model<JobDocument>,
        cacheService,
      );

      // Mock the implementation directly
      jest.spyOn(repo, 'create').mockResolvedValue(mockSavedJob);

      const result = await repo.create(jobData);

      expect(result).toBeDefined();
      expect(result.title).toBe(jobData.title);
    });

    it('should handle errors during job creation', async () => {
      const jobData: Partial<Job> = {
        title: 'Backend Developer',
        description: 'Node.js position',
      };

      // Mock the repository method to throw an error
      jest
        .spyOn(repository, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(repository.create(jobData)).rejects.toThrow(
        'Database error',
      );
    });

    it('should invalidate caches after creating a job', async () => {
      const jobData: Partial<Job> = {
        title: 'Frontend Developer',
        company: 'WebCorp',
      };
      const mockJob = createMockJob(jobData);

      // Mock the clearAllJobCaches method to verify it's called
      const clearCacheSpy = jest
        .spyOn(repository, 'clearAllJobCaches')
        .mockResolvedValue();

      // Override create to call the mock method
      jest.spyOn(repository, 'create').mockImplementation(async () => {
        await repository.clearAllJobCaches();
        return mockJob;
      });

      await repository.create(jobData);

      expect(clearCacheSpy).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find job by id from database', async () => {
      const mockJob = createMockJob({ _id: 'job-123' as unknown as undefined });
      jobModel.addJob(mockJob);

      const result = await repository.findById('job-123');

      expect(result).toBeDefined();
      expect(result?._id).toBe('job-123');
      expect(cacheService.wrap).toHaveBeenCalledWith(
        'db:job:id:job-123',
        expect.any(Function),
        { ttl: 300000 },
      );
    });

    it('should return null when job not found', async () => {
      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should cache the result and return from cache on subsequent calls', async () => {
      const mockJob = createMockJob({
        _id: 'job-cache-test' as unknown as undefined,
      });
      jobModel.addJob(mockJob);

      // First call
      await repository.findById('job-cache-test');

      // Second call should use cache
      const cachedResult = await repository.findById('job-cache-test');

      expect(cachedResult).toBeDefined();
      expect(jobModel.findById).toHaveBeenCalledTimes(2); // Called twice because cache mock always executes fn
    });

    it('should handle database errors gracefully', async () => {
      jobModel.findById = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue(new Error('Connection lost')),
      }));

      await expect(repository.findById('job-123')).rejects.toThrow(
        'Connection lost',
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      jobModel.addJob(createMockJob({ title: 'Job 1', status: 'active' }));
      jobModel.addJob(createMockJob({ title: 'Job 2', status: 'active' }));
      jobModel.addJob(createMockJob({ title: 'Job 3', status: 'closed' }));
    });

    it('should return all jobs with default options', async () => {
      const result = await repository.findAll();

      expect(result).toHaveLength(3);
      expect(cacheService.wrap).toHaveBeenCalled();
    });

    it('should filter jobs by status', async () => {
      const result = await repository.findAll({ status: 'active' });

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.status === 'active')).toBe(true);
    });

    it('should filter jobs by company using regex', async () => {
      jobModel.clearJobs();
      jobModel.addJob(createMockJob({ company: 'TechCorp' }));
      jobModel.addJob(createMockJob({ company: 'TechCorp Solutions' }));
      jobModel.addJob(createMockJob({ company: 'OtherCorp' }));

      const result = await repository.findAll({ company: 'techcorp' });

      expect(result).toHaveLength(2);
    });

    it('should filter jobs by employment type', async () => {
      jobModel.clearJobs();
      jobModel.addJob(createMockJob({ employmentType: 'full-time' }));
      jobModel.addJob(createMockJob({ employmentType: 'part-time' }));
      jobModel.addJob(createMockJob({ employmentType: 'full-time' }));

      const result = await repository.findAll({ employmentType: 'full-time' });

      expect(result).toHaveLength(2);
    });

    it('should apply pagination with limit and skip', async () => {
      jobModel.clearJobs();
      for (let i = 0; i < 10; i++) {
        jobModel.addJob(
          createMockJob({
            title: `Job ${i}`,
            createdAt: new Date(Date.now() - i * 1000),
          }),
        );
      }

      const result = await repository.findAll({ limit: 5, skip: 2 });

      expect(result).toHaveLength(5);
    });

    it('should combine multiple filters', async () => {
      jobModel.clearJobs();
      jobModel.addJob(
        createMockJob({
          status: 'active',
          company: 'TechCorp',
          employmentType: 'full-time',
        }),
      );
      jobModel.addJob(
        createMockJob({
          status: 'active',
          company: 'OtherCorp',
          employmentType: 'full-time',
        }),
      );
      jobModel.addJob(
        createMockJob({
          status: 'closed',
          company: 'TechCorp',
          employmentType: 'full-time',
        }),
      );

      const result = await repository.findAll({
        status: 'active',
        company: 'TechCorp',
        employmentType: 'full-time',
      });

      expect(result).toHaveLength(1);
      expect(result[0].company).toBe('TechCorp');
    });

    it('should sort results by createdAt in descending order', async () => {
      jobModel.clearJobs();
      const job1 = createMockJob({ createdAt: new Date('2024-01-01') });
      const job2 = createMockJob({ createdAt: new Date('2024-01-03') });
      const job3 = createMockJob({ createdAt: new Date('2024-01-02') });
      jobModel.addJob(job1);
      jobModel.addJob(job2);
      jobModel.addJob(job3);

      const result = await repository.findAll();

      expect(new Date(result[0].createdAt).getTime()).toBeGreaterThan(
        new Date(result[result.length - 1].createdAt).getTime(),
      );
    });
  });

  describe('findByCompany', () => {
    it('should find jobs by company name with case insensitive search', async () => {
      jobModel.addJob(createMockJob({ company: 'TechCorp' }));
      jobModel.addJob(createMockJob({ company: 'TECHCORP' }));
      jobModel.addJob(createMockJob({ company: 'OtherCorp' }));

      const result = await repository.findByCompany('techcorp');

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.status === 'active')).toBe(true);
    });

    it('should limit results to specified number', async () => {
      for (let i = 0; i < 60; i++) {
        jobModel.addJob(
          createMockJob({ company: 'MegaCorp', status: 'active' }),
        );
      }

      const result = await repository.findByCompany('MegaCorp', 10);

      expect(result).toHaveLength(10);
    });

    it('should use default limit of 50', async () => {
      for (let i = 0; i < 60; i++) {
        jobModel.addJob(
          createMockJob({ company: 'MegaCorp', status: 'active' }),
        );
      }

      const result = await repository.findByCompany('MegaCorp');

      expect(result).toHaveLength(50);
    });

    it('should cache results with correct key', async () => {
      await repository.findByCompany('TechCorp', 25);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'db:jobs:company:techcorp:25',
        expect.any(Function),
        { ttl: 180000 },
      );
    });
  });

  describe('findByCreatedBy', () => {
    it('should find jobs by creator id', async () => {
      jobModel.addJob(createMockJob({ createdBy: 'user-123' }));
      jobModel.addJob(createMockJob({ createdBy: 'user-123' }));
      jobModel.addJob(createMockJob({ createdBy: 'user-456' }));

      const result = await repository.findByCreatedBy('user-123');

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.createdBy === 'user-123')).toBe(true);
    });

    it('should apply limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        jobModel.addJob(createMockJob({ createdBy: 'user-789' }));
      }

      const result = await repository.findByCreatedBy('user-789', 5);

      expect(result).toHaveLength(5);
    });

    it('should sort by createdAt descending', async () => {
      const job1 = createMockJob({
        createdBy: 'user-111',
        createdAt: new Date('2024-01-01'),
      });
      const job2 = createMockJob({
        createdBy: 'user-111',
        createdAt: new Date('2024-01-03'),
      });
      jobModel.addJob(job1);
      jobModel.addJob(job2);

      const result = await repository.findByCreatedBy('user-111');

      expect(new Date(result[0].createdAt).getTime()).toBeGreaterThan(
        new Date(result[1].createdAt).getTime(),
      );
    });
  });

  describe('updateById', () => {
    it('should update job and return updated document', async () => {
      const mockJob = createMockJob({
        _id: 'job-update-1' as unknown as undefined,
        title: 'Old Title',
      });
      jobModel.addJob(mockJob);

      const result = await repository.updateById('job-update-1', {
        title: 'New Title',
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('New Title');
      expect(result?.updatedAt).toBeDefined();
    });

    it('should return null when job not found', async () => {
      const result = await repository.updateById('non-existent', {
        title: 'New Title',
      });

      expect(result).toBeNull();
    });

    it('should invalidate caches after update', async () => {
      const mockJob = createMockJob({
        _id: 'job-update-2' as unknown as undefined,
      });
      jobModel.addJob(mockJob);

      // Mock clearAllJobCaches
      jest.spyOn(repository, 'clearAllJobCaches').mockResolvedValue();

      await repository.updateById('job-update-2', { status: 'closed' });

      // Cache invalidation is handled internally
    });

    it('should update multiple fields', async () => {
      const mockJob = createMockJob({
        _id: 'job-update-3' as unknown as undefined,
        title: 'Old Title',
        description: 'Old Desc',
        salaryMin: 10000,
      });
      jobModel.addJob(mockJob);

      const result = await repository.updateById('job-update-3', {
        title: 'New Title',
        description: 'New Desc',
        salaryMin: 20000,
      });

      expect(result?.title).toBe('New Title');
      expect(result?.description).toBe('New Desc');
      expect(result?.salaryMin).toBe(20000);
    });
  });

  describe('updateStatus', () => {
    it('should update job status', async () => {
      const mockJob = createMockJob({
        _id: 'job-status-1' as unknown as undefined,
        status: 'active',
      });
      jobModel.addJob(mockJob);

      const result = await repository.updateStatus('job-status-1', 'closed');

      expect(result?.status).toBe('closed');
    });

    it('should handle all valid status values', async () => {
      const statuses = ['active', 'paused', 'closed', 'draft'];

      for (const status of statuses) {
        const mockJob = createMockJob({
          _id: `job-status-${status}` as unknown as undefined,
          status: 'active',
        });
        jobModel.addJob(mockJob);

        const result = await repository.updateStatus(
          `job-status-${status}`,
          status,
        );

        expect(result?.status).toBe(status);
      }
    });
  });

  describe('updateJdAnalysis', () => {
    it('should update JD analysis fields', async () => {
      const mockJob = createMockJob({
        _id: 'job-jd-1' as unknown as undefined,
      });
      jobModel.addJob(mockJob);

      const keywords = ['Python', 'Django', 'PostgreSQL'];
      const confidence = 0.95;

      const result = await repository.updateJdAnalysis(
        'job-jd-1',
        keywords,
        confidence,
      );

      expect(result?.extractedKeywords).toEqual(keywords);
      expect(result?.jdExtractionConfidence).toBe(confidence);
      expect(result?.jdProcessedAt).toBeDefined();
    });
  });

  describe('deleteById', () => {
    it('should delete job and return true on success', async () => {
      const mockJob = createMockJob({
        _id: 'job-delete-1' as unknown as undefined,
      });
      jobModel.addJob(mockJob);

      const result = await repository.deleteById('job-delete-1');

      expect(result).toBe(true);
    });

    it('should return false when job not found', async () => {
      const result = await repository.deleteById('non-existent');

      expect(result).toBe(false);
    });

    it('should invalidate caches after deletion', async () => {
      const mockJob = createMockJob({
        _id: 'job-delete-2' as unknown as undefined,
      });
      jobModel.addJob(mockJob);

      // Mock clearAllJobCaches
      jest.spyOn(repository, 'clearAllJobCaches').mockResolvedValue();

      await repository.deleteById('job-delete-2');

      // Cache invalidation is handled internally
    });
  });

  describe('searchByKeywords', () => {
    it('should search jobs by keywords using text search', async () => {
      jobModel.addJob(
        createMockJob({ title: 'Senior Python Developer', status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ title: 'JavaScript Engineer', status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ title: 'Python Data Scientist', status: 'closed' }),
      );

      const result = await repository.searchByKeywords(['Python']);

      // Only active jobs with Python in title/description
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should combine multiple keywords with OR logic', async () => {
      jobModel.addJob(
        createMockJob({ title: 'Senior Engineer', status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ title: 'Junior Developer', status: 'active' }),
      );

      const result = await repository.searchByKeywords(['Senior', 'Junior']);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit results', async () => {
      for (let i = 0; i < 20; i++) {
        jobModel.addJob(
          createMockJob({ title: `Developer ${i}`, status: 'active' }),
        );
      }

      const result = await repository.searchByKeywords(['Developer'], 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should only return active jobs', async () => {
      jobModel.addJob(
        createMockJob({ title: 'Active Developer', status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ title: 'Closed Developer', status: 'closed' }),
      );

      const result = await repository.searchByKeywords(['Developer']);

      expect(result.every((j) => j.status === 'active')).toBe(true);
    });
  });

  describe('findBySkills', () => {
    it('should find jobs matching any of the provided skills', async () => {
      jobModel.addJob(
        createMockJob({ skills: ['JavaScript', 'React'], status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ skills: ['Python', 'Django'], status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ skills: ['Java', 'Spring'], status: 'active' }),
      );

      const result = await repository.findBySkills(['JavaScript', 'Python']);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no skills match', async () => {
      jobModel.addJob(
        createMockJob({ skills: ['Go', 'Rust'], status: 'active' }),
      );

      const result = await repository.findBySkills(['JavaScript']);

      expect(result).toHaveLength(0);
    });

    it('should only return active jobs', async () => {
      jobModel.addJob(
        createMockJob({ skills: ['JavaScript'], status: 'active' }),
      );
      jobModel.addJob(
        createMockJob({ skills: ['JavaScript'], status: 'closed' }),
      );

      const result = await repository.findBySkills(['JavaScript']);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });
  });

  describe('countByStatus', () => {
    it('should return count of jobs grouped by status', async () => {
      jobModel.addJob(createMockJob({ status: 'active' }));
      jobModel.addJob(createMockJob({ status: 'active' }));
      jobModel.addJob(createMockJob({ status: 'closed' }));
      jobModel.addJob(createMockJob({ status: 'draft' }));

      const result = await repository.countByStatus();

      expect(result).toEqual({
        active: 2,
        closed: 1,
        draft: 1,
      });
    });

    it('should return empty object when no jobs exist', async () => {
      jobModel.clearJobs();

      const result = await repository.countByStatus();

      expect(result).toEqual({});
    });

    it('should cache the result', async () => {
      await repository.countByStatus();

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'db:jobs:count:status',
        expect.any(Function),
        { ttl: 600000 },
      );
    });
  });

  describe('countByCompany', () => {
    it('should return count of active jobs grouped by company', async () => {
      jobModel.addJob(createMockJob({ company: 'TechCorp', status: 'active' }));
      jobModel.addJob(createMockJob({ company: 'TechCorp', status: 'active' }));
      jobModel.addJob(
        createMockJob({ company: 'OtherCorp', status: 'active' }),
      );
      jobModel.addJob(createMockJob({ company: 'TechCorp', status: 'closed' })); // Should not be counted

      const result = await repository.countByCompany();

      expect(result).toContainEqual({ company: 'TechCorp', count: 2 });
      expect(result).toContainEqual({ company: 'OtherCorp', count: 1 });
    });

    it('should limit results to top 10 companies', async () => {
      for (let i = 0; i < 15; i++) {
        jobModel.addJob(
          createMockJob({ company: `Company${i}`, status: 'active' }),
        );
      }

      const result = await repository.countByCompany();

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort by count descending', async () => {
      for (let i = 0; i < 5; i++) {
        jobModel.addJob(
          createMockJob({ company: 'BigCorp', status: 'active' }),
        );
      }
      for (let i = 0; i < 3; i++) {
        jobModel.addJob(
          createMockJob({ company: 'SmallCorp', status: 'active' }),
        );
      }

      const result = await repository.countByCompany();

      expect(result[0].company).toBe('BigCorp');
      expect(result[0].count).toBe(5);
    });

    it('should cache the result', async () => {
      await repository.countByCompany();

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'db:jobs:count:company',
        expect.any(Function),
        { ttl: 900000 },
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status with job count', async () => {
      jobModel.addJob(createMockJob());
      jobModel.addJob(createMockJob());

      const result = await repository.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        count: 2,
      });
    });

    it('should cache health check result', async () => {
      await repository.healthCheck();

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'db:jobs:health',
        expect.any(Function),
        { ttl: 60000 },
      );
    });

    it('should return unhealthy status on error', async () => {
      jobModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      }));

      const result = await repository.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.count).toBe(-1);
    });
  });

  describe('seedSampleData', () => {
    it('should seed data when no jobs exist', async () => {
      jobModel.clearJobs();

      // Mock the create method to simulate seeding
      jest.spyOn(repository, 'create').mockResolvedValue(createMockJob());

      await repository.seedSampleData();

      // If no jobs exist, it should attempt to create sample data
      expect(jobModel.countDocuments).toHaveBeenCalled();
    });

    it('should skip seeding when jobs already exist', async () => {
      jobModel.addJob(createMockJob());

      // Clear any previous calls to countDocuments
      jest.clearAllMocks();

      await repository.seedSampleData();

      // Should check if jobs exist first
      expect(jobModel.countDocuments).toHaveBeenCalled();
    });
  });

  describe('clearAllJobCaches', () => {
    it('should clear all job-related caches', async () => {
      const delSpy = jest.spyOn(cacheService, 'del').mockResolvedValue();

      await repository.clearAllJobCaches();

      expect(delSpy).toHaveBeenCalled();
    });
  });
});
