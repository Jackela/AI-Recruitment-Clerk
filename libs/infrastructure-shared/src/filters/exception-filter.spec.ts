import {
  StandardizedGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  createGlobalExceptionFilter,
} from './exception-filter';
import type {
  ExceptionFilterConfig,
  ExecutionHost,
} from '../common/interfaces';

describe('StandardizedGlobalExceptionFilter', () => {
  describe('constructor', () => {
    it('should create instance without config', () => {
      const filter = new StandardizedGlobalExceptionFilter();
      expect(filter).toBeInstanceOf(StandardizedGlobalExceptionFilter);
    });

    it('should create instance with config', () => {
      const config: ExceptionFilterConfig = {
        enableCorrelation: true,
        enableLogging: true,
      };
      const filter = new StandardizedGlobalExceptionFilter(config);
      expect(filter).toBeInstanceOf(StandardizedGlobalExceptionFilter);
    });
  });

  describe('catch', () => {
    it('should handle Error exceptions', () => {
      const filter = new StandardizedGlobalExceptionFilter();
      const error = new Error('Test error');
      const mockHost = {} as ExecutionHost;

      expect(() => filter.catch(error, mockHost)).not.toThrow();
    });

    it('should handle unknown exceptions', () => {
      const filter = new StandardizedGlobalExceptionFilter();
      const mockHost = {} as ExecutionHost;

      expect(() => filter.catch('string error', mockHost)).not.toThrow();
      expect(() => filter.catch(null, mockHost)).not.toThrow();
      expect(() => filter.catch(undefined, mockHost)).not.toThrow();
    });
  });
});

describe('ExceptionFilterConfigHelper', () => {
  describe('forApiGateway', () => {
    it('should return config with correlation enabled', () => {
      const config = ExceptionFilterConfigHelper.forApiGateway();
      expect(config.enableCorrelation).toBe(true);
    });
  });

  describe('forProcessingService', () => {
    it('should return config with logging enabled', () => {
      const config = ExceptionFilterConfigHelper.forProcessingService();
      expect(config.enableLogging).toBe(true);
    });
  });
});

describe('createGlobalExceptionFilter', () => {
  it('should create filter with service name', () => {
    const filter = createGlobalExceptionFilter('test-service');
    expect(filter).toBeInstanceOf(StandardizedGlobalExceptionFilter);
  });

  it('should create filter with service name and config', () => {
    const config: ExceptionFilterConfig = {
      enableCorrelation: true,
    };
    const filter = createGlobalExceptionFilter('test-service', config);
    expect(filter).toBeInstanceOf(StandardizedGlobalExceptionFilter);
  });
});
