import { InMemoryStorageService } from './storage/in-memory-storage.service';

describe('InMemoryStorageService', () => {
  let service: InMemoryStorageService;

  beforeEach(() => {
    service = new InMemoryStorageService();
  });

  describe('store', () => {
    it('should store data', async () => {
      const result = await service.store('key', { data: 'test' });

      expect(result).toHaveProperty('key');
    });
  });

  describe('retrieve', () => {
    it('should retrieve stored data', async () => {
      const { key } = await service.store('key', { data: 'test' });

      const result = await service.retrieve(key);

      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for non-existent key', async () => {
      const result = await service.retrieve('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete stored data', async () => {
      const { key } = await service.store('key', { data: 'test' });

      await service.delete(key);
      const result = await service.retrieve(key);

      expect(result).toBeNull();
    });
  });
});
