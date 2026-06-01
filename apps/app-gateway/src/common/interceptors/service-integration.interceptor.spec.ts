import { ServiceIntegrationInterceptor } from './service-integration.interceptor';

describe('ServiceIntegrationInterceptor', () => {
  let interceptor: ServiceIntegrationInterceptor;

  beforeEach(() => {
    interceptor = new ServiceIntegrationInterceptor({} as any);
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor.intercept({} as any, {} as any)).toBeDefined();
    });
  });
});
