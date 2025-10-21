import { Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobRepository } from '../repositories/job.repository';
import { NatsClientService } from '@ai-recruitment-clerk/shared-nats-client';
import { CacheService } from '../cache/cache.service';
import { CacheWarmupService } from '../cache/cache-warmup.service';

type ControllerDeps = {
  appService: jest.Mocked<AppService>;
  jobRepository: jest.Mocked<JobRepository>;
  natsClient: { isConnected: boolean };
  cacheService: jest.Mocked<CacheService>;
  cacheWarmupService: jest.Mocked<CacheWarmupService>;
};

const createDeps = (): ControllerDeps => {
  const cacheMetrics = {
    hits: 5,
    misses: 1,
    sets: 3,
    dels: 0,
    errors: 0,
    hitRate: 83.3,
    totalOperations: 9,
  };

  return {
    appService: {
      getData: jest.fn().mockReturnValue({ message: 'Hello API' }),
    } as unknown as jest.Mocked<AppService>,
    jobRepository: {
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        count: 42,
      }),
    } as unknown as jest.Mocked<JobRepository>,
    natsClient: { isConnected: true },
    cacheService: {
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
      getMetrics: jest.fn().mockReturnValue(cacheMetrics),
      getHealthCacheKey: jest.fn().mockReturnValue('health-cache-key'),
      wrap: jest.fn(async (_key: string, compute: () => Promise<any>) =>
        compute(),
      ),
    } as unknown as jest.Mocked<CacheService>,
    cacheWarmupService: {
      getRefreshStatus: jest.fn().mockReturnValue({
        status: 'idle',
        lastRun: new Date('2024-01-01T00:00:00Z'),
      }),
      triggerWarmup: jest.fn().mockResolvedValue({
        status: 'started',
        warmedCategories: 3,
        duration: 500,
      }),
    } as unknown as jest.Mocked<CacheWarmupService>,
  };
};

const createController = () => {
  const deps = createDeps();
  const controller = new AppController(
    deps.appService,
    deps.jobRepository,
    deps.natsClient as unknown as NatsClientService,
    deps.cacheService,
    deps.cacheWarmupService,
  );
  return { controller, deps };
};

describe('AppController (mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns welcome payload with ISO timestamp', () => {
    const { controller } = createController();

    const result = controller.getWelcome();

    expect(result).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Welcome'),
        documentation: '/api/docs',
        status: 'ok',
      }),
    );
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('delegates to AppService for status endpoint', () => {
    const { controller, deps } = createController();

    const result = controller.getData();

    expect(deps.appService.getData).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: 'Hello API' });
  });

  describe('health endpoint', () => {
    it('reports ok when dependencies are healthy', async () => {
      const { controller, deps } = createController();

      const result = await controller.getHealth();

      expect(result.status).toBe('ok');
      expect(deps.cacheService.wrap).toHaveBeenCalledWith(
        'health-cache-key',
        expect.any(Function),
        { ttl: 30000 },
      );
      expect(result.database.status).toBe('healthy');
    });

    it('degrades when repository throws and cache wrap rejects', async () => {
      const { controller, deps } = createController();
      deps.jobRepository.healthCheck.mockRejectedValue(
        new Error('db unavailable'),
      );
      deps.cacheService.wrap.mockImplementation(async (_key, compute) => {
        throw new Error('cache offline');
      });

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.features.cache).toContain('cache offline');
      loggerSpy.mockRestore();
    });
  });

  describe('cache metrics', () => {
    it('returns cache health info when available', async () => {
      const { controller, deps } = createController();

      const result = await controller.getCacheMetrics();

      expect(result.cache).toEqual({ status: 'healthy' });
      expect(deps.cacheService.healthCheck).toHaveBeenCalled();
    });

    it('returns fallback metrics on error', async () => {
      const { controller, deps } = createController();
      const error = new Error('redis down');
      deps.cacheService.healthCheck.mockRejectedValue(error);

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const result = await controller.getCacheMetrics();

      expect(result.cache).toEqual(
        expect.objectContaining({
          status: 'error',
          error: 'redis down',
          metrics: deps.cacheService.getMetrics(),
        }),
      );
      loggerSpy.mockRestore();
    });
  });

  describe('cache warmup', () => {
    it('exposes warmup status from service', async () => {
      const { controller, deps } = createController();

      const result = await controller.getCacheWarmupStatus();

      expect(deps.cacheWarmupService.getRefreshStatus).toHaveBeenCalled();
      expect((result.warmupStatus as any).status).toBe('idle');
    });

    it('handles warmup trigger success and failure', async () => {
      const { controller, deps } = createController();

      const success = await controller.triggerCacheWarmup();
      expect(success.warmupResult?.status).toBe('started');

      deps.cacheWarmupService.triggerWarmup.mockRejectedValue(
        new Error('boom'),
      );
      const failure = await controller.triggerCacheWarmup();
      expect(failure.error).toBe('boom');
    });
  });
});
