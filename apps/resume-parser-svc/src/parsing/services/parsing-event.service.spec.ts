import { Logger } from '@nestjs/common';
import { ParsingEventService } from './parsing-event.service';
import type { ResumeParserNatsService } from '../../services/resume-parser-nats.service';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';

describe('ParsingEventService', () => {
  let service: ParsingEventService;
  let mockNatsService: jest.Mocked<ResumeParserNatsService>;

  beforeEach(() => {
    mockNatsService = {
      publishAnalysisResumeParsed: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
      publishJobResumeFailed: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-456' }),
      publishProcessingError: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-789' }),
    } as unknown as jest.Mocked<ResumeParserNatsService>;

    service = new ParsingEventService(mockNatsService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishSuccessEvent', () => {
    const createValidResult = (): Parameters<typeof service.publishSuccessEvent>[0] => ({
      jobId: 'job-123',
      resumeId: 'resume-456',
      resumeDto: {
        contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        skills: ['TypeScript', 'Node.js'],
        workExperience: [],
        education: [],
      } as ResumeDTO,
      timestamp: new Date().toISOString(),
      processingTimeMs: 1500,
    });

    it('should publish success event with valid data', async () => {
      const result = createValidResult();
      mockNatsService.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await service.publishSuccessEvent(result);

      expect(mockNatsService.publishAnalysisResumeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-123',
          resumeId: 'resume-456',
          resumeDto: result.resumeDto,
          confidence: 0.85,
          parsingMethod: 'standard-parsing',
        }),
      );
    });

    it('should include processing time in event', async () => {
      const result = createValidResult();
      result.processingTimeMs = 2500;

      await service.publishSuccessEvent(result);

      expect(mockNatsService.publishAnalysisResumeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          processingTimeMs: 2500,
        }),
      );
    });

    it('should use 0 for missing processing time', async () => {
      const result = createValidResult();
      delete result.processingTimeMs;

      await service.publishSuccessEvent(result);

      expect(mockNatsService.publishAnalysisResumeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          processingTimeMs: 0,
        }),
      );
    });

    it('should throw error when jobId is missing', async () => {
      const result = createValidResult();
      result.jobId = '' as unknown as typeof result.jobId;

      await expect(service.publishSuccessEvent(result)).rejects.toThrow(
        'Invalid success result: missing required fields',
      );
    });

    it('should throw error when resumeId is missing', async () => {
      const result = createValidResult();
      result.resumeId = '' as unknown as typeof result.resumeId;

      await expect(service.publishSuccessEvent(result)).rejects.toThrow(
        'Invalid success result: missing required fields',
      );
    });

    it('should throw error when resumeDto is missing', async () => {
      const result = createValidResult();
      result.resumeDto = null as unknown as typeof result.resumeDto;

      await expect(service.publishSuccessEvent(result)).rejects.toThrow(
        'Invalid success result: missing required fields',
      );
    });

    it('should throw error when timestamp is missing', async () => {
      const result = createValidResult();
      result.timestamp = '' as unknown as typeof result.timestamp;

      await expect(service.publishSuccessEvent(result)).rejects.toThrow(
        'Invalid success result: missing required fields',
      );
    });

    it('should warn when resume DTO validation fails', async () => {
      const result = createValidResult();
      // Invalid structure - missing contactInfo
      result.resumeDto = {} as ResumeDTO;

      await service.publishSuccessEvent(result);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Resume DTO validation failed'),
      );
    });

    it('should warn when skills is not an array', async () => {
      const result = createValidResult();
      (result.resumeDto as Record<string, unknown>).skills = 'not-an-array';

      await service.publishSuccessEvent(result);

      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should warn when workExperience is not an array', async () => {
      const result = createValidResult();
      (result.resumeDto as Record<string, unknown>).workExperience = 'not-an-array';

      await service.publishSuccessEvent(result);

      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should warn when education is not an array', async () => {
      const result = createValidResult();
      (result.resumeDto as Record<string, unknown>).education = 'not-an-array';

      await service.publishSuccessEvent(result);

      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw when publish fails', async () => {
      const result = createValidResult();
      mockNatsService.publishAnalysisResumeParsed.mockResolvedValue({
        success: false,
        error: 'NATS connection failed',
      });

      await expect(service.publishSuccessEvent(result)).rejects.toThrow(
        'Failed to publish success event: NATS connection failed',
      );
    });

    it('should handle exceptions during publish', async () => {
      const result = createValidResult();
      mockNatsService.publishAnalysisResumeParsed.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(service.publishSuccessEvent(result)).rejects.toThrow(
        'Unexpected error',
      );
    });

    it('should log success after publishing', async () => {
      const result = createValidResult();
      mockNatsService.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
        messageId: 'msg-test',
      });

      await service.publishSuccessEvent(result);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Success event published successfully'),
      );
    });
  });

  describe('publishFailureEvent', () => {
    it('should publish failure event with all parameters', async () => {
      mockNatsService.publishJobResumeFailed.mockResolvedValue({
        success: true,
        messageId: 'msg-fail',
      });

      await service.publishFailureEvent(
        'job-123',
        'resume-456',
        'resume.pdf',
        new Error('Parsing failed'),
        2,
      );

      expect(mockNatsService.publishJobResumeFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-123',
          resumeId: 'resume-456',
          stage: 'parsing-failure',
          retryAttempt: 2,
        }),
      );
    });

    it('should use 0 for missing retry count', async () => {
      mockNatsService.publishJobResumeFailed.mockResolvedValue({
        success: true,
        messageId: 'msg-fail',
      });

      await service.publishFailureEvent(
        'job-123',
        'resume-456',
        'resume.pdf',
        new Error('Parsing failed'),
        undefined as unknown as number,
      );

      expect(mockNatsService.publishJobResumeFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAttempt: 0,
        }),
      );
    });

    it('should not throw when jobId is missing (logs and returns)', async () => {
      // publishFailureEvent doesn't throw, it logs and returns to avoid infinite loops
      await expect(
        service.publishFailureEvent('', 'resume-456', 'resume.pdf', new Error('Failed'), 0),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not throw when resumeId is missing (logs and returns)', async () => {
      await expect(
        service.publishFailureEvent('job-123', '', 'resume.pdf', new Error('Failed'), 0),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not throw when filename is missing (logs and returns)', async () => {
      await expect(
        service.publishFailureEvent('job-123', 'resume-456', '', new Error('Failed'), 0),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not throw when publish fails (to avoid infinite loops)', async () => {
      mockNatsService.publishJobResumeFailed.mockResolvedValue({
        success: false,
        error: 'Queue full',
      });

      // Should not throw
      await expect(
        service.publishFailureEvent('job-123', 'resume-456', 'resume.pdf', new Error('Failed'), 0),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not throw on exception (to avoid infinite loops)', async () => {
      mockNatsService.publishJobResumeFailed.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        service.publishFailureEvent('job-123', 'resume-456', 'resume.pdf', new Error('Failed'), 0),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should log success after publishing', async () => {
      mockNatsService.publishJobResumeFailed.mockResolvedValue({
        success: true,
        messageId: 'msg-fail-success',
      });

      await service.publishFailureEvent(
        'job-123',
        'resume-456',
        'resume.pdf',
        new Error('Parsing failed'),
        1,
      );

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Failure event published successfully'),
      );
    });
  });

  describe('publishProcessingError', () => {
    it('should publish processing error with context', async () => {
      mockNatsService.publishProcessingError.mockResolvedValue({
        success: true,
        messageId: 'msg-error',
      });

      await service.publishProcessingError(
        'job-123',
        'resume-456',
        new Error('Processing error'),
        3,
      );

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-123',
        'resume-456',
        expect.any(Error),
        expect.objectContaining({
          stage: 'error-handling',
          retryAttempt: 3,
        }),
      );
    });

    it('should work with retry attempt 0', async () => {
      mockNatsService.publishProcessingError.mockResolvedValue({
        success: true,
        messageId: 'msg-error',
      });

      await service.publishProcessingError(
        'job-123',
        'resume-456',
        new Error('First error'),
        0,
      );

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-123',
        'resume-456',
        expect.any(Error),
        expect.objectContaining({
          retryAttempt: 0,
        }),
      );
    });
  });
});
