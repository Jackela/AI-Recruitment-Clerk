import { EmbeddingService } from './embedding.service';
import { EMBEDDING_PROVIDER } from './interfaces/embedding-provider.interface';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockProvider: jest.Mocked<{ createEmbedding: jest.Mock }>;

  beforeEach(() => {
    mockProvider = {
      createEmbedding: jest.fn(),
    };
    service = new EmbeddingService(mockProvider);
  });

  describe('createEmbedding', () => {
    it('should delegate to the configured provider', async () => {
      const mockVector = [0.1, 0.2, 0.3];
      mockProvider.createEmbedding.mockResolvedValue(mockVector);

      const result = await service.createEmbedding('test text');

      expect(result).toEqual(mockVector);
      expect(mockProvider.createEmbedding).toHaveBeenCalledWith('test text');
    });

    it('should handle provider errors', async () => {
      mockProvider.createEmbedding.mockRejectedValue(
        new Error('Provider error'),
      );

      await expect(service.createEmbedding('test')).rejects.toThrow(
        'Provider error',
      );
    });
  });
});
