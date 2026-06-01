import { QuotasController } from './quotas.controller';

describe('QuotasController', () => {
  let controller: QuotasController;

  beforeEach(() => {
    controller = new QuotasController({} as any);
  });

  describe('getQuota', () => {
    it('should get quota', async () => {
      const result = await controller.getQuota('user-123');

      expect(result).toHaveProperty('quota');
    });
  });
});
