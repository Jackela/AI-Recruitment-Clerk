import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(() => {
    controller = new AnalyticsController();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('dashboard', () => {
    it('should return summary and charts data', () => {
      const result = controller.dashboard();

      expect(result).toBeDefined();
      expect(result.summary).toEqual({ events: 0, metrics: 0, clientLogs: 0 });
      expect(Array.isArray(result.charts)).toBe(true);
    });

    it('should expose charts array even when empty', () => {
      const result = controller.dashboard();
      expect(result.charts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('event endpoints', () => {
    it('should accept performance metrics', () => {
      const response = controller.perf({ metricName: 'test-metric', value: 100 });
      expect(response.metricId).toMatch(/^met-/);
    });

    it('should accept business metrics', () => {
      const response = controller.biz({ metricName: 'test-biz-metric', value: 50 });
      expect(response.metricId).toMatch(/^met-/);
    });
  });
});
