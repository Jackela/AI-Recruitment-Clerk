import { CacheOptimizationService } from './cache-optimization.service';
import { CacheService } from './cache.service';

describe('CacheOptimizationService', () => {
  let service: CacheOptimizationService;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getMetrics: jest
        .fn()
        .mockReturnValue({ hits: 100, misses: 20, hitRate: 83.3 }),
      wrap: jest.fn(),
      generateKey: jest.fn().mockImplementation((...parts) => parts.join(':')),
    } as any;

    service = new CacheOptimizationService(mockCacheService);
  });

  describe('optimize', () => {
    it('should perform cache optimization', async () => {
      const result = await service.optimize();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('optimized');
    });
  });

  describe('getStats', () => {
    it('should return optimization stats', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalOperations');
    });
  });
});
