import { CacheWarmupService } from './cache-warmup.service';

describe('CacheWarmupService', () => {
  const cacheService = {
    getMetrics: jest.fn(),
    resetMetrics: jest.fn(),
    del: jest.fn(),
    generateKey: jest.fn((...parts: string[]) => parts.join(':')),
    getHealthCacheKey: jest.fn(() => 'health-key'),
  };
  const jobRepository = {
    healthCheck: jest.fn(),
    countByStatus: jest.fn(),
    countByCompany: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules warmup on bootstrap', async () => {
    const service = new CacheWarmupService(
      cacheService as any,
      jobRepository as any,
    );
    const warmupSpy = jest
      .spyOn<any, any>(service as any, 'startWarmupProcess')
      .mockResolvedValue(undefined);
    const refreshSpy = jest
      .spyOn<any, any>(service as any, 'startIntelligentRefreshMechanism')
      .mockImplementation(() => undefined);

    await service.onApplicationBootstrap();
    jest.runOnlyPendingTimers();

    expect(warmupSpy).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('runs triggerWarmup and returns success summary', async () => {
    jobRepository.healthCheck.mockResolvedValue(undefined);
    jobRepository.countByStatus.mockResolvedValue(undefined);
    jobRepository.countByCompany.mockResolvedValue(undefined);
    jobRepository.findAll.mockResolvedValue([]);
    const service = new CacheWarmupService(
      cacheService as any,
      jobRepository as any,
    );

    const result = await service.triggerWarmup();

    expect(result.status).toBe('success');
    expect(result.warmedCategories).toBe(3);
  });

  it('performs intelligent refresh when hit rate is low', async () => {
    cacheService.getMetrics.mockReturnValue({
      hitRate: 10,
      errors: 0,
    });
    const service = new CacheWarmupService(
      cacheService as any,
      jobRepository as any,
    );
    const triggerSpy = jest
      .spyOn(service, 'triggerWarmup')
      .mockResolvedValue({ status: 'success', warmedCategories: 0, duration: 0 });

    await service['performIntelligentRefresh']();

    expect(triggerSpy).toHaveBeenCalled();
  });

  it('exposes refresh status', () => {
    const service = new CacheWarmupService(
      cacheService as any,
      jobRepository as any,
    );

    const status = service.getRefreshStatus();

    expect(status.isActive).toBe(true);
    expect(status.lastRefresh).toBeInstanceOf(Date);
    expect(status.nextDeepWarmup).toBeInstanceOf(Date);
  });
});
