import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingController', () => {
  let controller: EmbeddingController;
  let service: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    service = {
      createEmbedding: jest.fn(),
    } as any;
    controller = new EmbeddingController(service);
  });

  describe('createEmbedding', () => {
    it('should create embedding for text', async () => {
      const mockVector = [0.1, 0.2, 0.3];
      service.createEmbedding.mockResolvedValue(mockVector);

      const result = await controller.createEmbedding({ text: 'test text' });

      expect(result).toEqual({ embedding: mockVector });
    });

    it('should handle empty text', async () => {
      service.createEmbedding.mockResolvedValue([0, 0, 0]);

      const result = await controller.createEmbedding({ text: '' });

      expect(result).toHaveProperty('embedding');
    });
  });
});
