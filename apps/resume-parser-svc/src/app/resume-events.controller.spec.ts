import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ResumeEventsController } from './resume-events.controller';
import { ParsingService } from '../parsing/parsing.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ResumeEventsController', () => {
  let controller: ResumeEventsController;
  let parsingService: jest.Mocked<ParsingService>;
  let natsService: jest.Mocked<ResumeParserNatsService>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined as any);

    const mockParsingService = {
      handleResumeSubmitted: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ParsingService>;

    const mockNatsService = {
      subscribeToResumeSubmissions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ResumeParserNatsService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ResumeEventsController],
      providers: [
        { provide: ParsingService, useValue: mockParsingService },
        { provide: ResumeParserNatsService, useValue: mockNatsService },
      ],
    }).compile();

    controller = moduleRef.get<ResumeEventsController>(ResumeEventsController);
    parsingService = moduleRef.get(ParsingService);
    natsService = moduleRef.get(ResumeParserNatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('subscribes to resume submissions via NATS service', async () => {
      await controller.onModuleInit();
      expect(
        natsService.subscribeToResumeSubmissions,
      ).toHaveBeenCalledTimes(1);
      expect(
        natsService.subscribeToResumeSubmissions,
      ).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('handleResumeSubmitted', () => {
    it('delegates resume processing to ParsingService', async () => {
      const payload: ResumeSubmittedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'candidate.pdf',
        tempGridFsUrl: 'gridfs://bucket/file-id',
      };

      await controller.handleResumeSubmitted(payload);

      expect(parsingService.handleResumeSubmitted).toHaveBeenCalledWith(
        payload,
      );
    });
  });
});
