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
    expect((result as { semanticSimilarity: number }).semanticSimilarity).toBeCloseTo(
      0.95,
    );
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

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Boundary Tests - Similarity Thresholds', () => {
    it('should cache result at exactly similarity threshold (0.8)', async () => {
      vectorStoreService.findSimilar.mockResolvedValueOnce([
        { cacheKey: 'exact-threshold', similarity: 0.8 },
      ]);
      cacheManager.get.mockResolvedValueOnce({ exact: 'match' });

      const fallback = jest.fn();
      const result = await cacheService.wrapSemantic('text', fallback, options);

      expect(result).toMatchObject({ exact: 'match' });
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should execute fallback just below threshold (0.79)', async () => {
      vectorStoreService.findSimilar.mockResolvedValueOnce([
        { cacheKey: 'below-threshold', similarity: 0.79 },
      ]);
      const fallback = jest.fn().mockResolvedValue({ fallback: 'result' });

      const result = await cacheService.wrapSemantic('text', fallback, options);

      expect(result).toMatchObject({ fallback: 'result' });
      expect(fallback).toHaveBeenCalled();
    });

    it('should cache result above threshold (0.95)', async () => {
      vectorStoreService.findSimilar.mockResolvedValueOnce([
        { cacheKey: 'high-similarity', similarity: 0.95 },
      ]);
      cacheManager.get.mockResolvedValueOnce({ high: 'match' });

      const fallback = jest.fn();
      const result = await cacheService.wrapSemantic('text', fallback, options);

      expect(result).toMatchObject({ high: 'match' });
      expect(fallback).not.toHaveBeenCalled();
    });
  });

  describe('Negative Tests - Error Handling', () => {
    it('should handle embedding service failure gracefully', async () => {
      embeddingService.createEmbedding.mockRejectedValueOnce(
        new Error('Embedding API unavailable'),
      );
      const fallback = jest.fn().mockResolvedValue({ fallback: 'result' });

      await expect(
        cacheService.wrapSemantic('text', fallback, options),
      ).rejects.toThrow('Embedding API unavailable');
    });

    it('should handle vector store query failure', async () => {
      vectorStoreService.findSimilar.mockRejectedValueOnce(
        new Error('Vector store connection lost'),
      );
      const fallback = jest.fn().mockResolvedValue({ fallback: 'result' });

      await expect(
        cacheService.wrapSemantic('text', fallback, options),
      ).rejects.toThrow('Vector store connection lost');
    });

    it('should handle cache manager failure during get', async () => {
      vectorStoreService.findSimilar.mockResolvedValueOnce([
        { cacheKey: 'test-key', similarity: 0.9 },
      ]);
      cacheManager.get.mockRejectedValueOnce(new Error('Cache read failed'));

      const fallback = jest.fn().mockResolvedValue({ fallback: 'result' });

      await expect(
        cacheService.wrapSemantic('text', fallback, options),
      ).rejects.toThrow('Cache read failed');
    });

    it('should handle cache manager failure during set', async () => {
      const fallback = jest.fn().mockResolvedValue({ data: 'result' });
      cacheManager.set.mockRejectedValueOnce(new Error('Cache write failed'));

      await expect(
        cacheService.wrapSemantic('text', fallback, options),
      ).rejects.toThrow('Cache write failed');
    });
  });

  describe('Negative Tests - Invalid Inputs', () => {
    it('should handle empty search text', async () => {
      const fallback = jest.fn().mockResolvedValue({ empty: 'result' });

      const result = await cacheService.wrapSemantic('', fallback, options);

      expect(result).toBeDefined();
      expect(embeddingService.createEmbedding).toHaveBeenCalledWith('');
    });

    it('should handle extremely long search text (>10000 chars)', async () => {
      const longText = 'a'.repeat(15000);
      const fallback = jest.fn().mockResolvedValue({ long: 'result' });

      const result = await cacheService.wrapSemantic(longText, fallback, options);

      expect(result).toBeDefined();
    });

    it('should handle special characters in search text', async () => {
      const specialText = '<script>alert("XSS")</script>';
      const fallback = jest.fn().mockResolvedValue({ safe: 'result' });

      const result = await cacheService.wrapSemantic(specialText, fallback, options);

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent semantic cache requests', async () => {
      const fallback = jest.fn().mockResolvedValue({ concurrent: 'result' });

      const promises = Array(5)
        .fill(null)
        .map(() => cacheService.wrapSemantic('concurrent-text', fallback, options));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it('should handle multiple similar queries with different thresholds', async () => {
      vectorStoreService.findSimilar.mockResolvedValue([
        { cacheKey: 'similar-1', similarity: 0.85 },
      ]);
      cacheManager.get.mockResolvedValue({ cached: 'value' });

      const options1 = { ttl: 1000, similarityThreshold: 0.8 };
      const options2 = { ttl: 1000, similarityThreshold: 0.9 };
      const fallback = jest.fn().mockResolvedValue({ fallback: 'result' });

      const result1 = await cacheService.wrapSemantic('text', fallback, options1);
      const result2 = await cacheService.wrapSemantic('text', fallback, options2);

      expect(result1).toMatchObject({ cached: 'value' });
      expect(result2).toMatchObject({ fallback: 'result' });
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should attach semantic similarity score to cached results', async () => {
      vectorStoreService.findSimilar.mockResolvedValueOnce([
        { cacheKey: 'specific-key', similarity: 0.92 },
      ]);
      cacheManager.get.mockResolvedValueOnce({ specific: 'data' });

      const fallback = jest.fn();
      const result = await cacheService.wrapSemantic('text', fallback, options);

      expect(result).toMatchObject({
        specific: 'data',
        semanticSimilarity: expect.any(Number),
      });
      const similarity = (result as { semanticSimilarity: number }).semanticSimilarity;
      expect(similarity).toBeCloseTo(0.92, 2);
      expect(similarity).toBeGreaterThanOrEqual(options.similarityThreshold);
    });

    it('should store complete result structure with metadata', async () => {
      const fallbackResult = { id: 123, data: 'test', metadata: { timestamp: Date.now() } };
      const fallback = jest.fn().mockResolvedValue(fallbackResult);

      await cacheService.wrapSemantic('text', fallback, options);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^semantic:/),
        fallbackResult,
        options.ttl,
      );
      expect(vectorStoreService.addVector).toHaveBeenCalledWith(
        expect.stringMatching(/^semantic:/),
        expect.any(Array),
      );
    });
  });
});
