import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      service.recordMetric('test_metric', 100);

      const metrics = service.getMetrics();
      expect(metrics.test_metric).toBe(100);
    });

    it('should increment existing metric', () => {
      service.recordMetric('counter', 1);
      service.recordMetric('counter', 1);

      const metrics = service.getMetrics();
      expect(metrics.counter).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should return all recorded metrics', () => {
      service.recordMetric('metric1', 10);
      service.recordMetric('metric2', 20);

      const metrics = service.getMetrics();

      expect(metrics.metric1).toBe(10);
      expect(metrics.metric2).toBe(20);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      service.recordMetric('metric', 100);
      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(Object.keys(metrics).length).toBe(0);
    });
  });
});
