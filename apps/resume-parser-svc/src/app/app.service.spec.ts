import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';

describe('AppService', () => {
  let service: AppService;
  let natsService: jest.Mocked<ResumeParserNatsService>;
  let parsingService: jest.Mocked<ParsingService>;
  let gridFsService: jest.Mocked<GridFsService>;

  beforeEach(async () => {
    gridFsService = {
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<GridFsService>;

    natsService = {
      subscribeToResumeSubmissions: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<ResumeParserNatsService>;

    parsingService = {
      handleResumeSubmitted: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ParsingService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: GridFsService, useValue: gridFsService },
        { provide: ResumeParserNatsService, useValue: natsService },
        { provide: ParsingService, useValue: parsingService },
      ],
    }).compile();

    service = moduleRef.get<AppService>(AppService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getData', () => {
    it('returns initializing status before bootstrap', () => {
      expect(service.getData()).toEqual({
        message: 'Resume Parser Service API',
        status: 'initializing',
      });
    });

    it('returns ready status after bootstrap', async () => {
      natsService.subscribeToResumeSubmissions.mockResolvedValue(undefined);
      await service.onApplicationBootstrap();

      expect(service.getData()).toEqual({
        message: 'Resume Parser Service API',
        status: 'ready',
      });
    });
  });

  describe('onApplicationBootstrap', () => {
    it('sets up resume submission subscription', async () => {
      natsService.subscribeToResumeSubmissions.mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(
        natsService.subscribeToResumeSubmissions,
      ).toHaveBeenCalledTimes(1);
      expect(
        natsService.subscribeToResumeSubmissions,
      ).toHaveBeenCalledWith(expect.any(Function));
    });

    it('forwards resume submissions to parsing service', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();
      const event = {
        resumeId: 'resume-1',
        jobId: 'job-2',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };
      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('propagates errors when subscription setup fails', async () => {
      const error = new Error('Subscription failed');
      natsService.subscribeToResumeSubmissions.mockRejectedValue(error);

      await expect(service.onApplicationBootstrap()).rejects.toThrow(
        'Subscription failed',
      );
    });

    it('logs initialization milestones', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      natsService.subscribeToResumeSubmissions.mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(logSpy).toHaveBeenCalledWith('Resume Parser Service starting...');
      expect(logSpy).toHaveBeenCalledWith('GridFS service initialized: healthy');
      expect(logSpy).toHaveBeenCalledWith('NATS client initialized');
      expect(logSpy).toHaveBeenCalledWith(
        'Event subscriptions set up successfully',
      );
      expect(logSpy).toHaveBeenCalledWith('Parsing service initialized');
      expect(logSpy).toHaveBeenCalledWith(
        'Resume Parser Service startup completed successfully',
      );
    });
  });

  describe('onApplicationShutdown', () => {
    it('logs shutdown flow and cleans up subscriptions', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.onApplicationShutdown();

      expect(logSpy).toHaveBeenCalledWith(
        'Resume Parser Service shutting down...',
      );
      expect(logSpy).toHaveBeenCalledWith('Event subscriptions cleaned up');
      expect(logSpy).toHaveBeenCalledWith(
        'All connections cleaned up successfully',
      );
    });

    it('logs errors during shutdown gracefully', async () => {
      const error = new Error('cleanup failed');
      jest
        .spyOn(service as any, 'cleanupEventSubscriptions')
        .mockRejectedValue(error);

      await service.onApplicationShutdown();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error during shutdown:',
        error,
      );
    });
  });

  describe('private helpers', () => {
    it('setupEventSubscriptions logs skip when API unavailable', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (service as any).natsService = {} as ResumeParserNatsService;

      await (service as any).setupEventSubscriptions();

      expect(logSpy).toHaveBeenCalledWith(
        'NATS subscription skipped (subscribeToResumeSubmissions unavailable)',
      );
    });
  });
});
