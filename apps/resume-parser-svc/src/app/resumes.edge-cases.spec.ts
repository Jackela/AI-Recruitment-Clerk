import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';

describe('AppService - Edge Cases', () => {
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
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Empty and Null Input Edge Cases', () => {
    it('should handle null resume event gracefully', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      // Should not throw when handler is called with null
      await expect(handlerRef[0](null as any)).resolves.not.toThrow();
    });

    it('should handle undefined resume event gracefully', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      await expect(handlerRef[0](undefined as any)).resolves.not.toThrow();
    });

    it('should handle resume event with empty jobId', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: '',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      await expect(handlerRef[0](event)).resolves.not.toThrow();
      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('should handle resume event with empty filename', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: '',
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('should handle resume event with undefined fields', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event = {
        resumeId: 'resume-1',
        jobId: undefined,
        originalFilename: undefined,
        tempGridFsUrl: undefined,
      } as any;

      await expect(handlerRef[0](event)).resolves.not.toThrow();
    });
  });

  describe('Boundary Value Edge Cases', () => {
    it('should handle resume with unicode characters in filename', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: '简历-مرحبا-🚀.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('should handle resume with very long filename (255+ chars)', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const longFilename = 'a'.repeat(260) + '.pdf';
      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: longFilename,
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('should handle resume with special characters in GridFS URL', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl:
          'gridfs://bucket/file with spaces & special chars [test].pdf',
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('should handle resume with maximum field lengths', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-' + 'x'.repeat(1000),
        jobId: 'job-' + 'y'.repeat(1000),
        originalFilename: 'z'.repeat(500) + '.pdf',
        tempGridFsUrl: 'gridfs://bucket/' + 'w'.repeat(1000),
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });
  });

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle multiple concurrent resume submissions', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const events: ResumeSubmittedEvent[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          resumeId: `resume-${i}`,
          jobId: `job-${i}`,
          originalFilename: `candidate${i}.pdf`,
          tempGridFsUrl: `gridfs://bucket/file${i}`,
        }));

      const promises = events.map((event) => handlerRef[0](event));
      await Promise.all(promises);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid sequential submissions without loss', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      for (let i = 0; i < 50; i++) {
        await handlerRef[0]({
          resumeId: `resume-${i}`,
          jobId: 'job-1',
          originalFilename: `candidate${i}.pdf`,
          tempGridFsUrl: `gridfs://bucket/file${i}`,
        });
      }

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledTimes(50);
    });

    it('should handle concurrent bootstrap attempts gracefully', async () => {
      natsService.subscribeToResumeSubmissions.mockResolvedValue(undefined);

      // Attempt multiple simultaneous bootstraps
      const promises = Array(3)
        .fill(null)
        .map(() => service.onApplicationBootstrap());

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Timeout and Error Edge Cases', () => {
    it('should handle timeout during GridFS health check', async () => {
      gridFsService.healthCheck.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100),
          ),
      );

      await expect(service.onApplicationBootstrap()).rejects.toThrow('Timeout');
    });

    it('should handle slow parsing service response', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      parsingService.handleResumeSubmitted.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      await expect(handlerRef[0](event)).resolves.not.toThrow();
    });

    it('should handle parsing service throwing error', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      parsingService.handleResumeSubmitted.mockRejectedValue(
        new Error('Parsing failed'),
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      // Should not propagate error up
      await expect(handlerRef[0](event)).resolves.not.toThrow();
    });

    it('should handle partial failure during concurrent processing', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      let callCount = 0;
      parsingService.handleResumeSubmitted.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('Even numbered failure'));
        }
        return Promise.resolve(undefined);
      });

      await service.onApplicationBootstrap();

      const events = Array(6)
        .fill(null)
        .map((_, i) => ({
          resumeId: `resume-${i}`,
          jobId: 'job-1',
          originalFilename: `candidate${i}.pdf`,
          tempGridFsUrl: `gridfs://bucket/file${i}`,
        }));

      // Process all without throwing
      for (const event of events) {
        await expect(handlerRef[0](event)).resolves.not.toThrow();
      }

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledTimes(6);
    });
  });

  describe('Malformed Data Edge Cases', () => {
    it('should handle resume event with unexpected fields', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const eventWithExtraFields = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
        extraField1: 'unexpected',
        extraField2: 12345,
        nestedObject: { deep: { value: true } },
      } as any;

      await handlerRef[0](eventWithExtraFields);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(
        eventWithExtraFields,
      );
    });

    it('should handle resume event with circular reference (if passed)', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: any = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };
      event.self = event; // Circular reference

      // Should handle gracefully
      await expect(handlerRef[0](event)).resolves.not.toThrow();
    });

    it('should handle resumeId with special characters', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-<>"\'&;../test',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file',
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });

    it('should handle GridFS URL with path traversal patterns', async () => {
      const handlerRef: Array<(event: any) => Promise<void>> = [];
      natsService.subscribeToResumeSubmissions.mockImplementation(
        async (handler) => {
          handlerRef.push(handler);
        },
      );

      await service.onApplicationBootstrap();

      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-1',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: '../../../etc/passwd',
      };

      await handlerRef[0](event);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(event);
    });
  });

  describe('Service Lifecycle Edge Cases', () => {
    it('should handle shutdown before bootstrap completes', async () => {
      natsService.subscribeToResumeSubmissions.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      // Start bootstrap but don't await
      const bootstrapPromise = service.onApplicationBootstrap();

      // Shutdown immediately
      await service.onApplicationShutdown();

      // Bootstrap should complete or fail gracefully
      await expect(bootstrapPromise).rejects.toThrow();
    });

    it('should handle multiple shutdown calls', async () => {
      await service.onApplicationShutdown();
      await service.onApplicationShutdown();
      await service.onApplicationShutdown();

      // Should not throw on multiple shutdowns
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Resume Parser Service shutting down...',
      );
    });

    it('should handle health check returning unexpected format', async () => {
      gridFsService.healthCheck.mockResolvedValue({
        status: 'unknown_status' as any,
        extraField: 'value',
      });

      natsService.subscribeToResumeSubmissions.mockResolvedValue(undefined);

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });

    it('should handle health check returning null', async () => {
      gridFsService.healthCheck.mockResolvedValue(null as any);

      natsService.subscribeToResumeSubmissions.mockResolvedValue(undefined);

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });
});
