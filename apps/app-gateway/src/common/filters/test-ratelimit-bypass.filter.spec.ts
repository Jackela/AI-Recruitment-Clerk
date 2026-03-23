import type { ArgumentsHost, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TestRateLimitBypassFilter } from './test-ratelimit-bypass.filter';

describe('TestRateLimitBypassFilter', () => {
  let filter: TestRateLimitBypassFilter;

  beforeEach(() => {
    filter = new TestRateLimitBypassFilter();
  });

  const createMockHost = (
    exception: HttpException,
    url: string = '/api/test',
  ): ArgumentsHost => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const request = { url };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  };

  describe('catch', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should bypass rate limit in test environment', () => {
      process.env.NODE_ENV = 'test';
      const exception = new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      const host = createMockHost(exception, '/api/test');

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse();
      expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { bypassedRateLimit: true },
      });
    });

    it('should not bypass rate limit for /system/status endpoint', () => {
      process.env.NODE_ENV = 'test';
      const exception = new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      const host = createMockHost(exception, '/system/status');

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse();
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    });

    it('should pass through non-429 errors in test environment', () => {
      process.env.NODE_ENV = 'test';
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost(exception, '/api/test');

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse();
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('should pass through 429 errors in non-test environments', () => {
      process.env.NODE_ENV = 'development';
      const exception = new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      const host = createMockHost(exception, '/api/test');

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse();
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    });

    it('should handle exceptions without getStatus method', () => {
      process.env.NODE_ENV = 'test';
      const exception = new HttpException(
        'Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const host = createMockHost(exception, '/api/test');

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse();
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle exceptions with object response', () => {
      process.env.NODE_ENV = 'production';
      const exception = new HttpException(
        { message: 'Custom error', statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost(exception, '/api/test');

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse();
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });
});
