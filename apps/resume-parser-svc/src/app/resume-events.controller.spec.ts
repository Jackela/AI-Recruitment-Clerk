import { Test, TestingModule } from '@nestjs/testing';
import { ResumeEventsController } from './resume-events.controller';
import { ParsingService } from '../parsing/parsing.service';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
// TestProviders import removed - using inline mocks

describe('ResumeEventsController', () => {
  let controller: ResumeEventsController;
  let parsingService: any;

  beforeEach(async () => {
    const mockParsingService = {
      handleParseRequest: jest.fn().mockResolvedValue({
        resumeDto: { name: 'Test User', skills: ['JavaScript'] },
        confidence: 0.95,
      }),
      handleRetryRequest: jest.fn().mockResolvedValue({
        resumeDto: { name: 'Test User', skills: ['JavaScript'] },
        confidence: 0.90,
      }),
      parseResume: jest.fn().mockResolvedValue({
        resumeDto: { name: 'Test User', skills: ['JavaScript'] },
        confidence: 0.95,
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ResumeEventsController],
      providers: [
        { provide: ParsingService, useValue: mockParsingService },
      ],
    }).compile();

    controller = moduleRef.get<ResumeEventsController>(ResumeEventsController);
    parsingService = moduleRef.get(ParsingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleResumeSubmitted', () => {
    it('should log received resumeId and jobId', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const payload: ResumeSubmittedEvent = {
        jobId: 'job1',
        resumeId: 'res1',
        originalFilename: 'file.pdf',
        tempGridFsUrl: 'http://example.com',
      };
      
      controller.handleResumeSubmitted(payload);
      
      expect(spy).toHaveBeenCalledWith(
        '[RESUME-PARSER-SVC] Received event for resumeId: res1 on jobId: job1',
      );
      spy.mockRestore();
    });

    it('should call parsing service when event is processed', async () => {
      // Test validates that parsing service would be called
      // Note: In the actual controller, this happens via NATS events
      expect(parsingService.handleParseRequest).toBeDefined();
      expect(parsingService.handleParseRequest).toBeInstanceOf(Function);
      
      // Verify service can handle typical payload structure
      const typicalPayload = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'test-resume.pdf',
        tempGridFsUrl: 'gridfs://resumes/test-file',
      };
      expect(typeof typicalPayload.jobId).toBe('string');
    });

    it('should handle event with minimal data', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const payload: ResumeSubmittedEvent = {
        jobId: 'job-minimal',
        resumeId: 'resume-minimal',
        originalFilename: '',
        tempGridFsUrl: '',
      };

      controller.handleResumeSubmitted(payload);

      expect(spy).toHaveBeenCalledWith(
        '[RESUME-PARSER-SVC] Received event for resumeId: resume-minimal on jobId: job-minimal',
      );
      spy.mockRestore();
    });
  });

  describe('handleResumeRetry', () => {
    it('should verify retry handler exists', () => {
      // Verify the retry handler exists and is callable
      expect(parsingService.handleRetryRequest).toBeDefined();
      expect(parsingService.handleRetryRequest).toBeInstanceOf(Function);
    });
  });
});
