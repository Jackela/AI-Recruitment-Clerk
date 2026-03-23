import { UsageLimitQuotaController } from './controllers/usage-limit-quota.controller';

describe('UsageLimitQuotaController', () => {
  let controller: UsageLimitQuotaController;

  beforeEach(() => {
    controller = new UsageLimitQuotaController({} as any);
  });

  describe('getQuota', () => {
    it('should get quota', async () => {
      const result = await controller.getQuota('user-123');

      expect(result).toHaveProperty('quota');
    });
  });

  describe('setQuota', () => {
    it('should set quota', async () => {
      const result = await controller.setQuota('user-123', {
        quota: 100,
      } as any);

      expect(result).toHaveProperty('quota');
    });
  });
});
