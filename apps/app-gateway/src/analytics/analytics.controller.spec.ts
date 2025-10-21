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
      expect(result.summary).toEqual({ events: 10, metrics: 5 });
      expect(Array.isArray(result.charts)).toBe(true);
    });

    it('should expose charts array even when empty', () => {
      const result = controller.dashboard();
      expect(result.charts.length).toBe(0);
    });
  });

  describe('event endpoints', () => {
    it('should accept performance metrics', () => {
      const response = controller.perf({});
      expect(response.metricId).toMatch(/^met-/);
    });

    it('should accept business metrics', () => {
      const response = controller.biz({});
      expect(response.metricId).toMatch(/^met-/);
    });
  });
});
