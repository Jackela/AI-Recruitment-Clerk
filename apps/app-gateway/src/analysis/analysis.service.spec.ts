import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import type { AnalysisInitiatedResponseDto } from './dto/analysis-response.dto';
import type { MulterFile } from '../jobs/types/multer.types';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let natsClientMock: jest.Mocked<AppGatewayNatsService>;

  const mockMulterFile: MulterFile = {
    fieldname: 'resume',
    originalname: 'test-resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
  } as MulterFile;

  beforeEach(async () => {
    natsClientMock = {
      publishJobJdSubmitted: jest.fn(),
      publishResumeSubmitted: jest.fn(),
    } as unknown as jest.Mocked<AppGatewayNatsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: AppGatewayNatsService,
          useValue: natsClientMock,
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have natsClient injected', () => {
      expect(natsClientMock).toBeDefined();
    });
  });

  describe('initiateAnalysis', () => {
    const mockJdText =
      'Software Engineer position with JavaScript and Python requirements';
    const mockSessionId = 'test-session-123';
    const mockOptions = JSON.stringify({ depth: 'detailed' });

    beforeEach(() => {
      natsClientMock.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'jd-msg-123',
      });
      natsClientMock.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'resume-msg-456',
      });
    });

    it('should initiate analysis successfully with valid inputs', async () => {
      const result = await service.initiateAnalysis(
        mockJdText,
        mockMulterFile,
        mockSessionId,
        mockOptions,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
      expect(result.analysisId).toMatch(/^analysis_\d+_[a-z0-9]+$/);
      expect(result.processingSteps).toEqual([
        'jd_extraction',
        'resume_parsing',
        'skill_matching',
        'scoring_analysis',
        'report_generation',
      ]);
      expect(result.estimatedProcessingTime).toBe(30);
      expect(result.timestamp).toBeDefined();
    });

    it('should initiate analysis without sessionId', async () => {
      const result = await service.initiateAnalysis(
        mockJdText,
        mockMulterFile,
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
    });

    it('should initiate analysis without options', async () => {
      const result = await service.initiateAnalysis(mockJdText, mockMulterFile);

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
    });

    it('should handle invalid options JSON gracefully', async () => {
      const invalidOptions = 'not-valid-json';
      const result = await service.initiateAnalysis(
        mockJdText,
        mockMulterFile,
        mockSessionId,
        invalidOptions,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
    });

    it('should publish JD event correctly', async () => {
      await service.initiateAnalysis(mockJdText, mockMulterFile, mockSessionId);

      expect(natsClientMock.publishJobJdSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: expect.stringMatching(/^analysis_job_analysis_\d+_[a-z0-9]+$/),
          jobTitle: 'Analysis Session Job',
          jdText: mockJdText,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should publish resume event correctly', async () => {
      await service.initiateAnalysis(mockJdText, mockMulterFile, mockSessionId);

      expect(natsClientMock.publishResumeSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: expect.any(String),
          resumeId: expect.stringMatching(/^resume_\d+_[a-z0-9]+$/),
          originalFilename: mockMulterFile.originalname,
          tempGridFsUrl: expect.stringMatching(/^analysis:\/\/session\/.*$/),
        }),
      );
    });

    it('should throw error when JD publish fails', async () => {
      natsClientMock.publishJobJdSubmitted.mockResolvedValue({
        success: false,
        error: 'NATS connection failed',
      });

      await expect(
        service.initiateAnalysis(mockJdText, mockMulterFile),
      ).rejects.toThrow(
        'Analysis pipeline failed: Failed to publish JD event: NATS connection failed',
      );
    });

    it('should throw error when resume publish fails', async () => {
      natsClientMock.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'jd-msg-123',
      });
      natsClientMock.publishResumeSubmitted.mockResolvedValue({
        success: false,
        error: 'Resume service unavailable',
      });

      await expect(
        service.initiateAnalysis(mockJdText, mockMulterFile),
      ).rejects.toThrow(
        'Analysis pipeline failed: Failed to publish resume event: Resume service unavailable',
      );
    });

    it('should handle empty JD text', async () => {
      const result = await service.initiateAnalysis('', mockMulterFile);

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
    });

    it('should handle JD text with special characters', async () => {
      const specialJdText =
        'Job description with special chars: <>&"\' and unicode: 你好世界';
      const result = await service.initiateAnalysis(
        specialJdText,
        mockMulterFile,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
    });

    it('should handle file with empty originalname', async () => {
      const emptyNameFile = { ...mockMulterFile, originalname: '' };
      const result = await service.initiateAnalysis(mockJdText, emptyNameFile);

      expect(result).toBeDefined();
      expect(natsClientMock.publishResumeSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilename: '',
        }),
      );
    });

    it('should handle very long JD text', async () => {
      const longJdText = 'a'.repeat(10000);
      const result = await service.initiateAnalysis(longJdText, mockMulterFile);

      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
    });

    it('should handle publishing errors gracefully', async () => {
      natsClientMock.publishJobJdSubmitted.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        service.initiateAnalysis(mockJdText, mockMulterFile),
      ).rejects.toThrow('Analysis pipeline failed: Network error');
    });

    it('should handle unknown error types', async () => {
      natsClientMock.publishJobJdSubmitted.mockImplementation(() => {
        throw 'Unknown error';
      });

      await expect(
        service.initiateAnalysis(mockJdText, mockMulterFile),
      ).rejects.toThrow('Analysis pipeline failed: Unknown error');
    });

    it('should generate unique analysis IDs for each call', async () => {
      const result1 = await service.initiateAnalysis(
        mockJdText,
        mockMulterFile,
      );

      // Reset mocks for second call
      natsClientMock.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'jd-msg-456',
      });
      natsClientMock.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'resume-msg-789',
      });

      const result2 = await service.initiateAnalysis(
        mockJdText,
        mockMulterFile,
      );

      expect(result1.analysisId).not.toBe(result2.analysisId);
    });

    it('should include correct message in response', async () => {
      const result = await service.initiateAnalysis(mockJdText, mockMulterFile);

      expect(result.message).toBe(
        'Analysis pipeline initiated successfully. JD extraction and resume parsing events have been published.',
      );
    });
  });

  describe('Private Methods via initiateAnalysis', () => {
    it('should generate analysis ID with correct format', async () => {
      const result = await service.initiateAnalysis(
        mockJdText,
        mockMulterFile,
        mockSessionId,
      );

      // ID format: analysis_{timestamp}_{random}
      const parts = result.analysisId.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('analysis');
      expect(parseInt(parts[1])).toBeLessThanOrEqual(Date.now());
      expect(parts[2]).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate resume ID with correct format', async () => {
      await service.initiateAnalysis(mockJdText, mockMulterFile);

      const publishedEvent =
        natsClientMock.publishResumeSubmitted.mock.calls[0][0];
      const parts = publishedEvent.resumeId.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('resume');
      expect(parseInt(parts[1])).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Timestamp Handling', () => {
    it('should include ISO timestamp in response', async () => {
      const before = new Date().toISOString();
      const result = await service.initiateAnalysis(mockJdText, mockMulterFile);
      const after = new Date().toISOString();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  describe('Async Operations', () => {
    it('should handle concurrent analysis requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(async (_, i) => {
          natsClientMock.publishJobJdSubmitted.mockResolvedValueOnce({
            success: true,
            messageId: `jd-msg-${i}`,
          });
          natsClientMock.publishResumeSubmitted.mockResolvedValueOnce({
            success: true,
            messageId: `resume-msg-${i}`,
          });
          return service.initiateAnalysis(mockJdText, mockMulterFile);
        });

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.status).toBe('processing');
      });

      // Check all IDs are unique
      const ids = results.map((r) => r.analysisId);
      expect(new Set(ids).size).toBe(5);
    });
  });
});
