import { PerformanceMonitoringInterceptor } from './performance-monitoring.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('PerformanceMonitoringInterceptor', () => {
  let interceptor: PerformanceMonitoringInterceptor;

  beforeEach(() => {
    interceptor = new PerformanceMonitoringInterceptor({} as any);
  });

  describe('intercept', () => {
    it('should be defined', () => {
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            route: { path: '/test' },
          }),
          getResponse: jest.fn().mockReturnValue({}),
        }),
        getHandler: jest.fn().mockReturnValue({ name: 'test' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      } as unknown as ExecutionContext;

      const mockNext = {
        handle: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue({
            subscribe: jest.fn(),
          }),
        }),
      } as unknown as CallHandler;

      expect(interceptor.intercept(mockContext, mockNext)).toBeDefined();
    });
  });
});
