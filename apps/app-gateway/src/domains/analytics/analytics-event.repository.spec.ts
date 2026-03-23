import { AnalyticsEventRepository } from './analytics-event.repository';

describe('AnalyticsEventRepository', () => {
  let repository: AnalyticsEventRepository;

  beforeEach(() => {
    repository = new AnalyticsEventRepository({} as any);
  });

  describe('save', () => {
    it('should save event', async () => {
      const result = await repository.save({
        eventType: 'test',
        timestamp: new Date(),
      });

      expect(result).toHaveProperty('id');
    });
  });

  describe('findByUserId', () => {
    it('should find events by user id', async () => {
      const result = await repository.findByUserId('user-123');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
