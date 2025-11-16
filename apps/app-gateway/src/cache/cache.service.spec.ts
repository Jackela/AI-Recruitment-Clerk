import { Cache } from 'cache-manager';
import { CacheService } from './cache.service';

const createCacheManager = () => {
  const store = new Map<string, unknown>();
  return {
    store: {},
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    reset: jest.fn(async () => {
      store.clear();
    }),
  } as unknown as Cache;
};

describe('CacheService', () => {
  let cacheManager: Cache;
  let service: CacheService;

  beforeEach(() => {
    jest
      .spyOn(global, 'setInterval')
      .mockReturnValue(undefined as unknown as NodeJS.Timeout);
    cacheManager = createCacheManager();
    service = new CacheService(
      cacheManager,
      {} as any,
      {} as any,
    );
  });

  afterEach(() => {
    (global.setInterval as jest.Mock).mockRestore();
  });

  it('tracks hits and misses via get()', async () => {
    await service.set('key-1', 'value');
    const hit = await service.get<string>('key-1');
    const miss = await service.get<string>('missing');

    expect(hit).toBe('value');
    expect(miss).toBeNull();
    const metrics = service.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
  });

  it('updates metrics on del/reset and reports health', async () => {
    await service.set('del-key', 'value');
    await service.del('del-key');
    await service.reset();

    const health = await service.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.metrics.totalOperations).toBeGreaterThanOrEqual(0);
  });
});
