import { UsageLimitAdminController } from './controllers/usage-limit-admin.controller';

describe('UsageLimitAdminController', () => {
  let controller: UsageLimitAdminController;

  beforeEach(() => {
    controller = new UsageLimitAdminController({} as any);
  });

  describe('getUsageLimits', () => {
    it('should get usage limits', async () => {
      const result = await controller.getUsageLimits();

      expect(result).toHaveProperty('limits');
    });
  });

  describe('updateUsageLimit', () => {
    it('should update limit', async () => {
      const result = await controller.updateUsageLimit('user-123', {
        quota: 100,
      } as any);

      expect(result).toHaveProperty('updated');
    });
  });
});
