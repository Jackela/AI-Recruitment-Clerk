import { SwaggerCacheInterceptor } from './swagger-cache.interceptor';

describe('SwaggerCacheInterceptor', () => {
  let interceptor: SwaggerCacheInterceptor;

  beforeEach(() => {
    interceptor = new SwaggerCacheInterceptor();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });
});
