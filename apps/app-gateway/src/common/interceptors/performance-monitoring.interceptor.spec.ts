import { PerformanceMonitoringInterceptor } from './performance-monitoring.interceptor';

describe('PerformanceMonitoringInterceptor', () => {
  let interceptor: PerformanceMonitoringInterceptor;

  beforeEach(() => {
    interceptor = new PerformanceMonitoringInterceptor({} as any);
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor.intercept({} as any, {} as any)).toBeDefined();
    });
  });
});
