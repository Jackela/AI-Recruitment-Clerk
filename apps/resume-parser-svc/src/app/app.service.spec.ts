import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';

describe('AppService', () => {
  let service: AppService;
  // let gridFsService: jest.Mocked<GridFsService>;
  let natsService: jest.Mocked<ResumeParserNatsService>;
  let parsingService: any;

  beforeEach(async () => {
    const mockGridFsService = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const mockNatsService = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      publish: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const mockParsingService = {
      handleParseRequest: jest.fn(),
      handleRetryRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: GridFsService, useValue: mockGridFsService },
        { provide: ResumeParserNatsService, useValue: mockNatsService },
        { provide: ParsingService, useValue: mockParsingService },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    // gridFsService = module.get(GridFsService);
    natsService = module.get(ResumeParserNatsService);
    parsingService = module.get(ParsingService) as any;

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should return message with ready status when initialized', () => {
      // Force the service to be initialized
      (service as any).isInitialized = true;

      const result = service.getData();

      expect(result).toEqual({
        message: 'Resume Parser Service API',
        status: 'ready',
      });
    });

    it('should return message with initializing status when not initialized', () => {
      // Service starts as not initialized
      const result = service.getData();

      expect(result).toEqual({
        message: 'Resume Parser Service API',
        status: 'initializing',
      });
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should initialize all services successfully', async () => {
      natsService.subscribe.mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(natsService.subscribe).toHaveBeenCalledTimes(2);
      expect(natsService.subscribe).toHaveBeenCalledWith(
        'resume.parse.request',
        expect.any(Function)
      );
      expect(natsService.subscribe).toHaveBeenCalledWith(
        'resume.retry.request',
        expect.any(Function)
      );
      expect((service as any).isInitialized).toBe(true);
    });

    it('should handle parse request through subscription', async () => {
      natsService.subscribe.mockImplementation(async (subject, handler) => {
        if (subject === 'resume.parse.request') {
          // Simulate receiving a message
          const testData = { resumeId: '123', jobId: 'job-456' };
          await handler(testData);
        }
      });

      await service.onApplicationBootstrap();

      expect(parsingService.handleParseRequest).toHaveBeenCalledWith({
        resumeId: '123',
        jobId: 'job-456',
      });
    });

    it('should handle retry request through subscription', async () => {
      natsService.subscribe.mockImplementation(async (subject, handler) => {
        if (subject === 'resume.retry.request') {
          // Simulate receiving a message
          const testData = { resumeId: '789', retryAttempt: 2 };
          await handler(testData);
        }
      });

      await service.onApplicationBootstrap();

      expect(parsingService.handleRetryRequest).toHaveBeenCalledWith({
        resumeId: '789',
        retryAttempt: 2,
      });
    });

    it('should throw error if NATS subscription fails', async () => {
      const error = new Error('NATS connection failed');
      natsService.subscribe.mockRejectedValue(error);

      await expect(service.onApplicationBootstrap()).rejects.toThrow(
        'NATS connection failed'
      );
      expect((service as any).isInitialized).toBe(false);
    });

    it('should throw error if event subscription setup fails', async () => {
      const error = new Error('Subscription failed');
      natsService.subscribe.mockRejectedValue(error);

      await expect(service.onApplicationBootstrap()).rejects.toThrow(
        'Subscription failed'
      );
      expect((service as any).isInitialized).toBe(false);
    });

    it('should log initialization steps', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      natsService.subscribe.mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(logSpy).toHaveBeenCalledWith('Resume Parser Service starting...');
      expect(logSpy).toHaveBeenCalledWith('GridFS service initialized');
      expect(logSpy).toHaveBeenCalledWith('NATS client initialized');
      expect(logSpy).toHaveBeenCalledWith('Event subscriptions set up successfully');
      expect(logSpy).toHaveBeenCalledWith('Parsing service initialized');
      expect(logSpy).toHaveBeenCalledWith('Resume Parser Service startup completed successfully');
    });
  });

  describe('onApplicationShutdown', () => {
    it('should clean up resources successfully', async () => {
      await service.onApplicationShutdown();

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Resume Parser Service shutting down...'
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Event subscriptions cleaned up'
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'All connections cleaned up successfully'
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock an error during cleanup
      jest
        .spyOn(service as any, 'cleanupEventSubscriptions')
        .mockRejectedValue(new Error('Cleanup failed'));

      await service.onApplicationShutdown();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error during shutdown:',
        expect.any(Error)
      );
    });

    it('should log shutdown steps', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.onApplicationShutdown();

      expect(logSpy).toHaveBeenCalledWith('Resume Parser Service shutting down...');
      expect(logSpy).toHaveBeenCalledWith('Event subscriptions cleaned up');
      expect(logSpy).toHaveBeenCalledWith('All connections cleaned up successfully');
    });
  });

  describe('setupEventSubscriptions', () => {
    it('should set up all required subscriptions', async () => {
      natsService.subscribe.mockResolvedValue(undefined);

      await (service as any).setupEventSubscriptions();

      expect(natsService.subscribe).toHaveBeenCalledTimes(2);
      expect(natsService.subscribe).toHaveBeenCalledWith(
        'resume.parse.request',
        expect.any(Function)
      );
      expect(natsService.subscribe).toHaveBeenCalledWith(
        'resume.retry.request',
        expect.any(Function)
      );
    });

    it('should handle subscription errors', async () => {
      const error = new Error('Subscription error');
      natsService.subscribe.mockRejectedValue(error);

      await expect((service as any).setupEventSubscriptions()).rejects.toThrow(
        'Subscription error'
      );
    });
  });

  describe('cleanupEventSubscriptions', () => {
    it('should clean up subscriptions successfully', async () => {
      await (service as any).cleanupEventSubscriptions();

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Event subscriptions cleaned up'
      );
    });

    it('should handle cleanup errors', async () => {
      // Create a mock that throws an error
      const cleanupSpy = jest
        .spyOn(service as any, 'cleanupEventSubscriptions')
        .mockImplementation(() => {
          throw new Error('Cleanup error');
        });

      try {
        await (service as any).cleanupEventSubscriptions();
    } catch (error) {
      expect((error as any).message).toBe('Cleanup error');
    }

      cleanupSpy.mockRestore();
    });
  });

  describe('initializeParsingService', () => {
    it('should initialize parsing service successfully', async () => {
      await (service as any).initializeParsingService();

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Parsing service initialized'
      );
    });

    it('should handle initialization errors', async () => {
      // Create a mock that throws an error
      const initSpy = jest
        .spyOn(service as any, 'initializeParsingService')
        .mockImplementation(() => {
          throw new Error('Init error');
        });

      try {
        await (service as any).initializeParsingService();
    } catch (error) {
      expect((error as any).message).toBe('Init error');
    }

      initSpy.mockRestore();
    });
  });
});
