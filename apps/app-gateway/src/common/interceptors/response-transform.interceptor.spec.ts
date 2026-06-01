import { ResponseTransformInterceptor } from './response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor;

  beforeEach(() => {
    interceptor = new ResponseTransformInterceptor();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor.intercept({} as any, {} as any)).toBeDefined();
    });
  });
});
