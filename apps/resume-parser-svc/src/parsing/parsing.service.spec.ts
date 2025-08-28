import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ParsingService } from './parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';
import { 
  createMockResumeSubmittedEvent,
  createMockAnalysisResumeParsedEvent,
  createMockParsedResumeDto,
  createMockNatsPublishResult
} from '../testing/test-fixtures';

describe('ParsingService', () => {
  let service: ParsingService;
  let visionLlmService: jest.Mocked<VisionLlmService>;
  let gridFsService: jest.Mocked<GridFsService>;
  let fieldMapperService: jest.Mocked<FieldMapperService>;
  let natsClient: jest.Mocked<NatsClient>;
  let loggerSpy: jest.SpyInstance;

  const mockPdfBuffer = Buffer.from('mock-pdf-content');
  const mockLlmOutput = { rawExtraction: 'extracted-data' };
  const mockResumeDto = createMockParsedResumeDto();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsingService,
        {
          provide: VisionLlmService,
          useValue: {
            parseResumePdf: jest.fn(),
          },
        },
        {
          provide: GridFsService,
          useValue: {
            downloadFile: jest.fn(),
          },
        },
        {
          provide: FieldMapperService,
          useValue: {
            normalizeToResumeDto: jest.fn(),
          },
        },
        {
          provide: NatsClient,
          useValue: {
            publishAnalysisResumeParsed: jest.fn(),
            publishJobResumeFailed: jest.fn(),
            publishProcessingError: jest.fn(),
            isConnected: true,
          },
        },
      ],
    }).compile();

    service = module.get<ParsingService>(ParsingService);
    visionLlmService = module.get(VisionLlmService);
    gridFsService = module.get(GridFsService);
    fieldMapperService = module.get(FieldMapperService);
    natsClient = module.get(NatsClient);

    // Spy on logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('handleResumeSubmitted', () => {
    const validEvent = createMockResumeSubmittedEvent();

    beforeEach(() => {
      gridFsService.downloadFile.mockResolvedValue(mockPdfBuffer);
      visionLlmService.parseResumePdf.mockResolvedValue(mockLlmOutput);
      fieldMapperService.normalizeToResumeDto.mockResolvedValue(mockResumeDto);
      natsClient.publishAnalysisResumeParsed.mockResolvedValue(createMockNatsPublishResult(true));
      natsClient.publishJobResumeFailed.mockResolvedValue(createMockNatsPublishResult(true));
    });

    it('should successfully process valid resume submission event', async () => {
      await service.handleResumeSubmitted(validEvent);

      expect(gridFsService.downloadFile).toHaveBeenCalledWith(validEvent.tempGridFsUrl);
      expect(visionLlmService.parseResumePdf).toHaveBeenCalledWith(mockPdfBuffer, validEvent.originalFilename);
      expect(fieldMapperService.normalizeToResumeDto).toHaveBeenCalledWith(mockLlmOutput);
      expect(natsClient.publishAnalysisResumeParsed).toHaveBeenCalledWith({
        jobId: validEvent.jobId,
        resumeId: validEvent.resumeId,
        resumeDto: mockResumeDto,
        timestamp: expect.any(String),
        processingTimeMs: expect.any(Number),
      });
    });

    it('should validate required event fields', async () => {
      const invalidEvents = [
        { ...validEvent, jobId: null },
        { ...validEvent, resumeId: '' },
        { ...validEvent, originalFilename: undefined },
        { ...validEvent, tempGridFsUrl: null },
        {},
      ];

      for (const invalidEvent of invalidEvents) {
        await expect(service.handleResumeSubmitted(invalidEvent))
          .rejects.toThrow('Invalid ResumeSubmittedEvent');
      }
    });

    it('should handle GridFS download errors', async () => {
      const downloadError = new Error('GridFS download failed');
      gridFsService.downloadFile.mockRejectedValue(downloadError);

      await expect(service.handleResumeSubmitted(validEvent)).rejects.toThrow('GridFS download failed');
      
      expect(natsClient.publishJobResumeFailed).toHaveBeenCalledWith({
        jobId: validEvent.jobId,
        resumeId: validEvent.resumeId,
        originalFilename: validEvent.originalFilename,
        error: downloadError.message,
        retryCount: 0,
        timestamp: expect.any(String),
      });
    });

    it('should handle Vision LLM service errors', async () => {
      const llmError = new Error('LLM processing failed');
      visionLlmService.parseResumePdf.mockRejectedValue(llmError);

      await expect(service.handleResumeSubmitted(validEvent)).rejects.toThrow('LLM processing failed');
      
      expect(natsClient.publishJobResumeFailed).toHaveBeenCalled();
    });

    it('should handle field mapping errors', async () => {
      const mappingError = new Error('Field mapping failed');
      fieldMapperService.normalizeToResumeDto.mockRejectedValue(mappingError);

      await expect(service.handleResumeSubmitted(validEvent)).rejects.toThrow('Field mapping failed');
      
      expect(natsClient.publishJobResumeFailed).toHaveBeenCalled();
    });

    it('should calculate processing time correctly', async () => {
      // Mock Date.now to control timing
      const startTime = 1000;
      const endTime = 3500;
      const mockDateNow = jest.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await service.handleResumeSubmitted(validEvent);

      expect(natsClient.publishAnalysisResumeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          processingTimeMs: endTime - startTime,
        })
      );

      mockDateNow.mockRestore();
    });
  });

  describe('processResumeFile', () => {
    const jobId = 'test-job-123';
    const resumeId = 'test-resume-456';
    const gridFsUrl = 'gridfs://test/resume.pdf';
    const filename = 'test-resume.pdf';

    beforeEach(() => {
      gridFsService.downloadFile.mockResolvedValue(mockPdfBuffer);
      visionLlmService.parseResumePdf.mockResolvedValue(mockLlmOutput);
      fieldMapperService.normalizeToResumeDto.mockResolvedValue(mockResumeDto);
    });

    it('should successfully process resume file', async () => {
      const result = await service.processResumeFile(jobId, resumeId, gridFsUrl, filename);

      expect(result).toMatchObject({
        jobId,
        resumeId,
        resumeDto: mockResumeDto,
        timestamp: expect.any(String),
        processingTimeMs: expect.any(Number),
        originalFilename: filename,
      });

      expect(gridFsService.downloadFile).toHaveBeenCalledWith(gridFsUrl);
      expect(visionLlmService.parseResumePdf).toHaveBeenCalledWith(mockPdfBuffer, filename);
      expect(fieldMapperService.normalizeToResumeDto).toHaveBeenCalledWith(mockLlmOutput);
    });

    it('should validate input parameters', async () => {
      const invalidParams = [
        ['', resumeId, gridFsUrl, filename],
        [jobId, '', gridFsUrl, filename],
        [jobId, resumeId, '', filename],
        [jobId, resumeId, gridFsUrl, ''],
        [null, resumeId, gridFsUrl, filename],
      ];

      for (const [jId, rId, url, fname] of invalidParams) {
        await expect(service.processResumeFile(jId as string, rId as string, url as string, fname as string))
          .rejects.toThrow(/Invalid parameters/);
      }
    });

    it('should handle empty or invalid file downloads', async () => {
      gridFsService.downloadFile.mockResolvedValue(Buffer.alloc(0)); // Empty buffer

      await expect(service.processResumeFile(jobId, resumeId, gridFsUrl, filename))
        .rejects.toThrow(/Failed to download file or file is empty/);
    });

    it('should handle Vision LLM empty results', async () => {
      visionLlmService.parseResumePdf.mockResolvedValue(null);

      await expect(service.processResumeFile(jobId, resumeId, gridFsUrl, filename))
        .rejects.toThrow(/Vision LLM service returned empty result/);
    });

    it('should handle field mapping failures', async () => {
      fieldMapperService.normalizeToResumeDto.mockResolvedValue(null);

      await expect(service.processResumeFile(jobId, resumeId, gridFsUrl, filename))
        .rejects.toThrow(/Field mapping failed/);
    });

    it('should log processing steps', async () => {
      await service.processResumeFile(jobId, resumeId, gridFsUrl, filename);

      expect(loggerSpy).toHaveBeenCalledWith(`Processing resume file for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${filename}`);
      expect(loggerSpy).toHaveBeenCalledWith(`Downloading file from GridFS: ${gridFsUrl}`);
      expect(loggerSpy).toHaveBeenCalledWith(`Parsing resume with Vision LLM service: ${filename}`);
      expect(loggerSpy).toHaveBeenCalledWith(`Normalizing extracted data for resume: ${resumeId}`);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Resume processing completed successfully'));
    });
  });

  describe('publishSuccessEvent', () => {
    const validResult = createMockAnalysisResumeParsedEvent();

    beforeEach(() => {
      natsClient.publishAnalysisResumeParsed.mockResolvedValue(createMockNatsPublishResult(true, 'msg-123'));
    });

    it('should successfully publish success event', async () => {
      await service.publishSuccessEvent(validResult);

      expect(natsClient.publishAnalysisResumeParsed).toHaveBeenCalledWith({
        jobId: validResult.jobId,
        resumeId: validResult.resumeId,
        resumeDto: validResult.resumeDto,
        timestamp: validResult.timestamp,
        processingTimeMs: validResult.processingTimeMs,
      });

      expect(loggerSpy).toHaveBeenCalledWith(`Publishing success event for resumeId: ${validResult.resumeId}`);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Success event published successfully'));
    });

    it('should validate required result fields', async () => {
      const invalidResults = [
        { ...validResult, jobId: null },
        { ...validResult, resumeId: '' },
        { ...validResult, resumeDto: null },
        { ...validResult, timestamp: undefined },
      ];

      for (const invalidResult of invalidResults) {
        await expect(service.publishSuccessEvent(invalidResult))
          .rejects.toThrow('Invalid success result: missing required fields');
      }
    });

    it('should handle NATS publishing failures', async () => {
      natsClient.publishAnalysisResumeParsed.mockResolvedValue(createMockNatsPublishResult(false, null, 'Network error'));

      await expect(service.publishSuccessEvent(validResult))
        .rejects.toThrow('Failed to publish success event: Network error');
    });

    it('should validate resume DTO structure', async () => {
      const invalidResumeDto = { ...validResult, resumeDto: { invalid: 'structure' } };
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await service.publishSuccessEvent(invalidResumeDto);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Resume DTO validation failed'));
    });
  });

  describe('publishFailureEvent', () => {
    const jobId = 'test-job';
    const resumeId = 'test-resume';
    const filename = 'test.pdf';
    const error = new Error('Processing failed');
    const retryCount = 2;

    beforeEach(() => {
      natsClient.publishJobResumeFailed.mockResolvedValue(createMockNatsPublishResult(true, 'msg-456'));
    });

    it('should successfully publish failure event', async () => {
      await service.publishFailureEvent(jobId, resumeId, filename, error, retryCount);

      expect(natsClient.publishJobResumeFailed).toHaveBeenCalledWith({
        jobId,
        resumeId,
        originalFilename: filename,
        error: error.message,
        retryCount,
        timestamp: expect.any(String),
        errorDetails: {
          name: error.name,
          stack: error.stack,
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith(`Publishing failure event for resumeId: ${resumeId}, retryCount: ${retryCount}`);
    });

    it('should validate input parameters and handle gracefully', async () => {
      const invalidParams = [
        ['', resumeId, filename],
        [jobId, '', filename],
        [jobId, resumeId, ''],
      ];

      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      for (const [jId, rId, fname] of invalidParams) {
        await service.publishFailureEvent(jId as string, rId as string, fname as string, error, retryCount);
        
        // Should log error but not throw (graceful handling)
        expect(errorSpy).toHaveBeenCalled();
      }
    });

    it('should handle NATS publishing failures gracefully', async () => {
      natsClient.publishJobResumeFailed.mockResolvedValue(createMockNatsPublishResult(false, null, 'Connection failed'));

      // Should not throw, but should log error
      await expect(service.publishFailureEvent(jobId, resumeId, filename, error, retryCount))
        .resolves.toBeUndefined();
    });

    it('should handle default retry count', async () => {
      await service.publishFailureEvent(jobId, resumeId, filename, error, undefined as any);

      expect(natsClient.publishJobResumeFailed).toHaveBeenCalledWith(
        expect.objectContaining({ retryCount: 0 })
      );
    });
  });

  describe('handleProcessingError', () => {
    const jobId = 'test-job';
    const resumeId = 'test-resume';
    const error = new Error('Processing error');

    beforeEach(() => {
      natsClient.publishJobResumeFailed.mockResolvedValue(createMockNatsPublishResult(true));
      natsClient.publishProcessingError.mockResolvedValue(createMockNatsPublishResult(true));
    });

    it('should handle processing errors correctly', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      
      await service.handleProcessingError(error, jobId, resumeId);

      expect(natsClient.publishProcessingError).toHaveBeenCalledWith(jobId, resumeId, error);
      expect(errorSpy).toHaveBeenCalledWith(`Handling processing error for resumeId: ${resumeId}`, error);
    });

    it('should determine retry strategy for retryable errors', async () => {
      const retryableError = new Error('Network timeout occurred');
      
      await service.handleProcessingError(retryableError, jobId, resumeId);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Scheduling retry'));
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('Invalid file format - corrupted');
      
      await service.handleProcessingError(nonRetryableError, jobId, resumeId);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Max retries reached or error not retryable'));
    });

    it('should handle errors in error handling gracefully', async () => {
      natsClient.publishProcessingError.mockRejectedValue(new Error('NATS error'));

      await expect(service.handleProcessingError(error, jobId, resumeId))
        .resolves.toBeUndefined();
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      // Access private methods for testing
      (service as any).retryCounts.clear();
    });

    it('should track retry counts per resume', async () => {
      const resumeId = 'test-resume';
      
      // Use reflection to access private methods
      const getRetryCount = (service as any).getRetryCount.bind(service);
      const incrementRetryCount = (service as any).incrementRetryCount.bind(service);

      expect(getRetryCount(resumeId)).toBe(0);
      
      incrementRetryCount(resumeId);
      expect(getRetryCount(resumeId)).toBe(1);
      
      incrementRetryCount(resumeId);
      expect(getRetryCount(resumeId)).toBe(2);
    });

    it('should identify retryable errors correctly', async () => {
      const shouldRetryProcessing = (service as any).shouldRetryProcessing.bind(service);
      
      const retryableErrors = [
        new Error('Network timeout'),
        new Error('Connection failed'),
        new Error('Rate limit exceeded'),
        new Error('GridFS download error'),
      ];
      
      const nonRetryableErrors = [
        new Error('Invalid file format'),
        new Error('Validation failed'),
        new Error('File corrupted'),
      ];

      retryableErrors.forEach(error => {
        expect(shouldRetryProcessing(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(shouldRetryProcessing(error)).toBe(false);
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when NATS is connected', async () => {
      Object.defineProperty(natsClient, 'isConnected', { value: true, writable: true });

      const health = await service.healthCheck();

      expect(health).toMatchObject({
        status: 'healthy',
        details: {
          natsConnected: true,
          retryQueueSize: expect.any(Number),
          activeRetries: expect.any(Array),
        }
      });
    });

    it('should return degraded status when NATS is disconnected', async () => {
      Object.defineProperty(natsClient, 'isConnected', { value: false, writable: true });

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.natsConnected).toBe(false);
    });

    it('should handle health check errors', async () => {
      // Mock a property access error
      Object.defineProperty(natsClient, 'isConnected', {
        get: () => { throw new Error('Connection check failed'); }
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('Resume DTO Validation', () => {
    it('should validate correct resume DTO structure', () => {
      const validateResumeDto = (service as any).validateResumeDto.bind(service);
      
      const validDto = createMockParsedResumeDto();
      expect(validateResumeDto(validDto)).toBe(true);
    });

    it('should reject invalid resume DTO structures', () => {
      const validateResumeDto = (service as any).validateResumeDto.bind(service);
      
      const invalidDtos = [
        {},
        { contactInfo: null },
        { contactInfo: {}, skills: 'not-an-array' },
        { contactInfo: {}, skills: [], workExperience: 'invalid' },
        { contactInfo: {}, skills: [], workExperience: [], education: null },
      ];

      invalidDtos.forEach(dto => {
        expect(validateResumeDto(dto)).toBe(false);
      });
    });

    it('should handle validation errors gracefully', () => {
      const validateResumeDto = (service as any).validateResumeDto.bind(service);
      
      // Create a problematic object that throws during property access
      const problematicDto = {
        get contactInfo() { throw new Error('Property access error'); }
      };

      expect(validateResumeDto(problematicDto)).toBe(false);
    });
  });
});