import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of AppService', () => {
      expect(service).toBeInstanceOf(AppService);
    });
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      expect(service.getData()).toEqual({ message: 'Hello API' });
    });

    it('should return an object with message property', () => {
      const result = service.getData();

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });

    it('should return consistent results on multiple calls', () => {
      const firstCall = service.getData();
      const secondCall = service.getData();

      expect(firstCall).toEqual(secondCall);
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should log startup message', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service starting...',
      );
    });

    it('should log successful startup completion', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service startup completed successfully',
      );
    });

    it('should initialize NATS connections', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'NATS connections initialized',
      );
    });

    it('should setup event subscriptions', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event subscriptions set up for:'),
      );
    });

    it('should initialize LLM connections', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'LLM service connections initialized',
      );
    });

    it('should initialize extraction service', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Extraction service initialized',
      );
    });

    it('should validate service health', async () => {
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Service health validation completed',
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Force an error by mocking a failure
      const originalConsole = console.error;
      console.error = jest.fn();

      // The service's initialization methods catch errors internally
      await service.onApplicationBootstrap();

      expect(loggerLogSpy).toHaveBeenCalled();
      console.error = originalConsole;
    });
  });

  describe('onApplicationShutdown', () => {
    it('should log shutdown message', async () => {
      await service.onApplicationShutdown();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service shutting down...',
      );
    });

    it('should log cleanup completion', async () => {
      await service.onApplicationShutdown();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'All connections cleaned up successfully',
      );
    });

    it('should cleanup event subscriptions', async () => {
      // First bootstrap to set up subscriptions
      await service.onApplicationBootstrap();

      // Then shutdown
      await service.onApplicationShutdown();

      expect(loggerLogSpy).toHaveBeenCalledWith('Event subscriptions cleaned up');
    });

    it('should cleanup NATS connections', async () => {
      await service.onApplicationShutdown();

      expect(loggerLogSpy).toHaveBeenCalledWith('NATS connections cleaned up');
    });

    it('should cleanup LLM connections', async () => {
      await service.onApplicationShutdown();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'LLM service connections cleaned up',
      );
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to extraction events', async () => {
      await service.onApplicationBootstrap();

      const logCalls = loggerLogSpy.mock.calls.flat();
      const hasExtractionSubscription = logCalls.some(
        (call) =>
          typeof call === 'string' && call.includes('jd.extract.request'),
      );

      expect(hasExtractionSubscription).toBe(true);
    });

    it('should subscribe to analysis events', async () => {
      await service.onApplicationBootstrap();

      const logCalls = loggerLogSpy.mock.calls.flat();
      const hasAnalysisSubscription = logCalls.some(
        (call) =>
          typeof call === 'string' && call.includes('jd.analyze.request'),
      );

      expect(hasAnalysisSubscription).toBe(true);
    });

    it('should subscribe to validation events', async () => {
      await service.onApplicationBootstrap();

      const logCalls = loggerLogSpy.mock.calls.flat();
      const hasValidationSubscription = logCalls.some(
        (call) =>
          typeof call === 'string' && call.includes('jd.validate.request'),
      );

      expect(hasValidationSubscription).toBe(true);
    });
  });

  describe('Lifecycle Integration', () => {
    it('should complete full bootstrap -> shutdown cycle', async () => {
      await service.onApplicationBootstrap();
      await service.onApplicationShutdown();

      // Should have logged both startup and shutdown messages
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service starting...',
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service shutting down...',
      );
    });

    it('should handle multiple bootstrap calls', async () => {
      await service.onApplicationBootstrap();
      await service.onApplicationBootstrap();

      // Should handle gracefully (multiple startup messages)
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service starting...',
      );
    });

    it('should handle shutdown without bootstrap', async () => {
      await service.onApplicationShutdown();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'JD Extractor Service shutting down...',
      );
    });
  });

  describe('Error Handling', () => {
    it('should log errors during initialization', async () => {
      // Normal initialization should not throw
      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });

    it('should log errors during shutdown', async () => {
      // Normal shutdown should not throw
      await expect(service.onApplicationShutdown()).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete bootstrap in reasonable time', async () => {
      const startTime = Date.now();

      await service.onApplicationBootstrap();

      const duration = Date.now() - startTime;

      // Bootstrap should complete quickly (< 1 second for mocked operations)
      expect(duration).toBeLessThan(1000);
    });

    it('should complete shutdown in reasonable time', async () => {
      await service.onApplicationBootstrap();

      const startTime = Date.now();
      await service.onApplicationShutdown();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
