import { JobRepository } from './job.repository';
import { CacheService } from '../cache/cache.service';

const createJobModelMock = () => {
  const doc = {
    _id: 'job-1',
    title: 'Backend Engineer',
    company: 'Test Corp',
    status: 'active',
  };

  const findById = jest.fn(() => ({
    exec: jest.fn().mockResolvedValue(doc),
  }));

  const countDocuments = jest.fn(() => ({
    exec: jest.fn().mockResolvedValue(5),
  }));

  return {
    findById,
    countDocuments,
  };
};

const createCacheServiceMock = () =>
  ({
    generateKey: jest.fn((...parts: string[]) => parts.join(':')),
    getJobQueryKey: jest.fn((query: Record<string, unknown>) =>
      JSON.stringify(query),
    ),
    wrap: jest.fn(async (_key: string, compute: () => Promise<any>) =>
      compute(),
    ),
  } as unknown as jest.Mocked<CacheService>);

describe('JobRepository lightweight smoke tests', () => {
  it('reports healthy status via healthCheck', async () => {
    const jobModel = createJobModelMock();
    const cacheService = createCacheServiceMock();
    const repository = new JobRepository(jobModel as any, cacheService);

    const result = await repository.healthCheck();

    expect(result).toEqual({ status: 'healthy', count: 5 });
    expect(cacheService.wrap).toHaveBeenCalledWith(
      'db:jobs:health',
      expect.any(Function),
      { ttl: 60000 },
    );
  });

  it('returns job from cache-wrapped findById', async () => {
    const jobModel = createJobModelMock();
    const cacheService = createCacheServiceMock();
    const repository = new JobRepository(jobModel as any, cacheService);

    const job = await repository.findById('job-1');

    expect(cacheService.wrap).toHaveBeenCalledWith(
      'db:job:id:job-1',
      expect.any(Function),
      { ttl: 300000 },
    );
    expect(job?.title).toBe('Backend Engineer');
  });

  it('handles health check errors gracefully', async () => {
    const jobModel = createJobModelMock();
    jobModel.countDocuments = jest.fn(() => ({
      exec: jest.fn().mockRejectedValue(new Error('db unavailable')),
    }));
    const cacheService = createCacheServiceMock();
    const repository = new JobRepository(jobModel as any, cacheService);

    const result = await repository.healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.count).toBe(-1);
  });
});
