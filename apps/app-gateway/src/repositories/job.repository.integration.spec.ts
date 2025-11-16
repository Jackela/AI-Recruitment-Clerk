import type { Model } from 'mongoose';
import { JobRepository } from './job.repository';
import { CacheService } from '../cache/cache.service';
import type { JobDocument } from '../schemas/job.schema';

interface QueryMock<T> {
  exec: jest.Mock<Promise<T>, []>;
}

const createQueryMock = <T,>(value: T): QueryMock<T> => ({
  exec: jest.fn().mockResolvedValue(value),
});

const sampleJob = {
  _id: 'job-1',
  title: 'Backend Engineer',
  company: 'Test Corp',
  status: 'active',
} as unknown as JobDocument;

const createJobModelMock = () => {
  const findById = jest.fn(() => createQueryMock(sampleJob));
  const countDocuments = jest.fn(() => createQueryMock(5));

  return {
    findById,
    countDocuments,
  };
};

type CacheServiceSubset = Pick<
  CacheService,
  'generateKey' | 'getJobQueryKey' | 'wrap'
>;

const createCacheServiceMock = (): jest.Mocked<CacheServiceSubset> =>
  ({
    generateKey: jest.fn((...parts: string[]) => parts.join(':')),
    getJobQueryKey: jest
      .fn()
      .mockImplementation((query: Record<string, unknown>) =>
        JSON.stringify(query),
      ),
    wrap: jest.fn(async (_key, compute) => compute()),
  } as unknown as jest.Mocked<CacheServiceSubset>);

describe('JobRepository lightweight smoke tests', () => {
  it('reports healthy status via healthCheck', async () => {
    const jobModel = createJobModelMock();
    const cacheService = createCacheServiceMock();
    const repository = new JobRepository(
      jobModel as unknown as Model<JobDocument>,
      cacheService as unknown as CacheService,
    );

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
    const repository = new JobRepository(
      jobModel as unknown as Model<JobDocument>,
      cacheService as unknown as CacheService,
    );

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
    const repository = new JobRepository(
      jobModel as unknown as Model<JobDocument>,
      cacheService as unknown as CacheService,
    );

    const result = await repository.healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.count).toBe(-1);
  });
});
