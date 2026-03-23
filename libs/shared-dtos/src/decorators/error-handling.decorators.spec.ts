import {
  HandleErrors,
  DefaultErrorHandling,
  ErrorContext,
  RetryWithErrorHandling,
  MonitorPerformance,
} from './error-handling.decorators';

describe('ErrorHandlingDecorators', () => {
  describe('HandleErrors', () => {
    it('should exist and be a function', () => {
      expect(typeof HandleErrors).toBe('function');
    });

    it('should be applicable to methods', () => {
      class TestService {
        @HandleErrors({ logErrors: false })
        async testMethod(): Promise<string> {
          return 'success';
        }
      }

      const service = new TestService();
      expect(typeof service.testMethod).toBe('function');
    });
  });

  describe('DefaultErrorHandling', () => {
    it('should exist and be a function', () => {
      expect(typeof DefaultErrorHandling).toBe('function');
    });
  });

  describe('ErrorContext', () => {
    it('should exist and be a function', () => {
      expect(typeof ErrorContext).toBe('function');
    });
  });

  describe('RetryWithErrorHandling', () => {
    it('should exist and be a function', () => {
      expect(typeof RetryWithErrorHandling).toBe('function');
    });

    it('should be applicable to methods with retry config', () => {
      class TestService {
        @RetryWithErrorHandling({ maxRetries: 2 })
        async retriableMethod(): Promise<string> {
          return 'success after retry';
        }
      }

      const service = new TestService();
      expect(typeof service.retriableMethod).toBe('function');
    });
  });

  describe('MonitorPerformance', () => {
    it('should exist and be a function', () => {
      expect(typeof MonitorPerformance).toBe('function');
    });

    it('should be applicable to methods with config', () => {
      class TestService {
        @MonitorPerformance({ slowThreshold: 1000 })
        async monitoredMethod(): Promise<string> {
          return 'performance monitored';
        }
      }

      const service = new TestService();
      expect(typeof service.monitoredMethod).toBe('function');
    });
  });
});
