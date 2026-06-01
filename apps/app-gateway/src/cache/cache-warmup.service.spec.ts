import { CacheWarmupService } from './cache-warmup.service';
import type { CacheService } from './cache.service';

describe('CacheWarmupService', () => {
  let service: CacheWarmupService;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      wrap: jest.fn(),
      generateKey: jest.fn().mockImplementation((...parts) => parts.join(':')),
    } as any;

    service = new CacheWarmupService(mockCacheService);
  });

  describe('warmup', () => {
    it('should perform cache warmup', async () => {
      const result = await service.warmup();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('warmed');
    });
  });

  describe('isWarm', () => {
    it('should return warmup status', () => {
      const status = service.isWarm();

      expect(typeof status).toBe('boolean');
    });
  });
});
