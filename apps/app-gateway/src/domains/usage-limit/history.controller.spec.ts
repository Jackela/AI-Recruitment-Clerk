import { HistoryController } from './history.controller';

describe('HistoryController', () => {
  let controller: HistoryController;

  beforeEach(() => {
    controller = new HistoryController({} as any);
  });

  describe('getHistory', () => {
    it('should get usage history', async () => {
      const result = await controller.getHistory('user-123');

      expect(result).toHaveProperty('items');
    });
  });
});
