import { Cache } from 'cache-manager';
import { CacheService, SemanticCacheOptions } from './cache.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from './vector-store.service';

describe('CacheService.wrapSemantic', () => {
  let cacheManager: jest.Mocked<Cache>;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let vectorStoreService: jest.Mocked<VectorStoreService>;
  let cacheService: CacheService;
  const options: SemanticCacheOptions = {
    ttl: 1000,
    similarityThreshold: 0.8,
  };

  beforeEach(() => {
    jest.useFakeTimers();

    cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
      store: {},
    } as unknown as jest.Mocked<Cache>;

    embeddingService = {
      createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    } as unknown as jest.Mocked<EmbeddingService>;

    vectorStoreService = {
      findSimilar: jest.fn().mockResolvedValue([]),
      addVector: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<VectorStoreService>;

    cacheService = new CacheService(
      cacheManager,
      embeddingService,
      vectorStoreService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns cached value when semantic match exists', async () => {
    vectorStoreService.findSimilar.mockResolvedValueOnce([
      { cacheKey: 'semantic:key', similarity: 0.95 },
    ]);
    cacheManager.get.mockResolvedValueOnce({ foo: 'bar' });

    const fallback = jest.fn();
    const result = await cacheService.wrapSemantic(
      'semantic text',
      fallback,
      options,
    );

    expect(result).toMatchObject({ foo: 'bar' });
    expect((result as any).semanticSimilarity).toBeCloseTo(0.95);
    expect(fallback).not.toHaveBeenCalled();
    expect(vectorStoreService.addVector).not.toHaveBeenCalled();
  });

  it('stores fallback result when no match', async () => {
    const fallbackResult = { id: 1 };
    const fallback = jest.fn().mockResolvedValue(fallbackResult);

    const result = await cacheService.wrapSemantic(
      'another text',
      fallback,
      options,
    );

    expect(result).toBe(fallbackResult);
    expect(cacheManager.set).toHaveBeenCalledTimes(1);
    expect(vectorStoreService.addVector).toHaveBeenCalledTimes(1);
  });

  it('skips storage when fallback returns null', async () => {
    const fallback = jest.fn().mockResolvedValue(null);

    const result = await cacheService.wrapSemantic(
      'null-result',
      fallback,
      options,
    );

    expect(result).toBeNull();
    expect(cacheManager.set).not.toHaveBeenCalled();
    expect(vectorStoreService.addVector).not.toHaveBeenCalled();
  });
});
