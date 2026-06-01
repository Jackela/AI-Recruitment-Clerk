import { UsageLimitAnalyticsController } from './controllers/usage-limit-analytics.controller';

describe('UsageLimitAnalyticsController', () => {
  let controller: UsageLimitAnalyticsController;

  beforeEach(() => {
    controller = new UsageLimitAnalyticsController({} as any);
  });

  describe('getAnalytics', () => {
    it('should get analytics', async () => {
      const result = await controller.getAnalytics();

      expect(result).toHaveProperty('metrics');
    });
  });

  describe('getUsageTrend', () => {
    it('should get usage trend', async () => {
      const result = await controller.getUsageTrend('user-123');

      expect(result).toHaveProperty('trend');
    });
  });
});
