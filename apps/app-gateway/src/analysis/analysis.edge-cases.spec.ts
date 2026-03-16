import { Test } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { MulterFile } from '../jobs/types/multer.types';

const NATS_CLIENT_TOKEN = 'AppGatewayNatsService';

const mockNatsClient = () => ({
  publishJobJdSubmitted: jest.fn(),
  publishResumeSubmitted: jest.fn(),
});

describe('AnalysisService - Edge Cases', () => {
  let service: AnalysisService;
  let natsClient: jest.Mocked<ReturnType<typeof mockNatsClient>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: NATS_CLIENT_TOKEN,
          useValue: mockNatsClient(),
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    natsClient = module.get(NATS_CLIENT_TOKEN);
  });

  describe('Empty and Null Input Edge Cases', () => {
    it('should handle empty JD text', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis('', resumeFile);

      expect(result).toHaveProperty('analysisId');
      expect(result).toHaveProperty('status', 'processing');
    });

    it('should handle null resume file', async () => {
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      // Should throw or handle gracefully
      await expect(
        service.initiateAnalysis('Job description', null as any),
      ).rejects.toThrow();
    });

    it('should handle undefined session ID', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
        undefined,
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle empty options JSON', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
        'session-1',
        '',
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle whitespace-only JD text', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis('   \t\n  ', resumeFile);

      expect(result).toHaveProperty('analysisId');
    });
  });

  describe('Large Input Boundary Edge Cases', () => {
    it('should handle JD text with 50000 characters', async () => {
      const longJD = 'A'.repeat(50000);
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(longJD, resumeFile);

      expect(result).toHaveProperty('analysisId');
      expect(natsClient.publishJobJdSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          jdText: longJD,
        }),
      );
    });

    it('should handle resume with 10MB file size', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024, // 10MB
        buffer: Buffer.alloc(10 * 1024 * 1024),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle filename with 300+ characters', async () => {
      const longFilename = 'a'.repeat(300) + '.pdf';
      const resumeFile = new MulterFile({
        originalname: longFilename,
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle unicode in JD text', async () => {
      const unicodeJD =
        '软件工程师 💻 مرحبا שלום 🚀 Software Engineer エンジニア "><script>alert(1)</script>';
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(unicodeJD, resumeFile);

      expect(result).toHaveProperty('analysisId');
      expect(natsClient.publishJobJdSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          jdText: unicodeJD,
        }),
      );
    });

    it('should handle unicode in filename', async () => {
      const resumeFile = new MulterFile({
        originalname: '简历-مرحبا-🚀.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('analysisId');
    });
  });

  describe('NATS Publishing Boundary Edge Cases', () => {
    it('should handle JD publish failure', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: false,
        error: 'NATS connection failed',
      });

      await expect(
        service.initiateAnalysis('Job description', resumeFile),
      ).rejects.toThrow('Failed to publish JD event');
    });

    it('should handle resume publish failure after successful JD', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: false,
        error: 'NATS connection failed',
      });

      await expect(
        service.initiateAnalysis('Job description', resumeFile),
      ).rejects.toThrow('Failed to publish resume event');
    });

    it('should handle concurrent analysis initiations', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const promises = Array(10)
        .fill(null)
        .map(() => service.initiateAnalysis('Job description', resumeFile));

      const results = await Promise.all(promises);

      const analysisIds = results.map((r) => r.analysisId);
      expect(new Set(analysisIds).size).toBe(10); // All unique
    });

    it('should handle slow NATS publish response', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, messageId: 'msg-1' }),
              100,
            ),
          ),
      );
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('analysisId');
    });
  });

  describe('ID Generation Edge Cases', () => {
    it('should generate unique analysis IDs for 1000 rapid calls', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const result = await service.initiateAnalysis(`Job ${i}`, resumeFile);
        ids.add(result.analysisId);
      }

      expect(ids.size).toBe(1000); // All unique
    });

    it('should generate IDs with correct prefix format', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result.analysisId).toMatch(/^analysis_\d+_[a-z0-9]+$/);
    });

    it('should generate resume IDs with correct prefix format', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockImplementation((event) => {
        expect(event.resumeId).toMatch(/^resume_\d+_[a-z0-9]+$/);
        return Promise.resolve({ success: true, messageId: 'msg-2' });
      });

      await service.initiateAnalysis('Job description', resumeFile);
    });

    it('should handle ID generation at timestamp boundary', async () => {
      // Mock Date.now to return edge value
      const mockDateNow = jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(Number.MAX_SAFE_INTEGER - 100);

      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('analysisId');
      mockDateNow.mockRestore();
    });
  });

  describe('Options Parsing Edge Cases', () => {
    it('should handle invalid JSON in options', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
        'session-1',
        'invalid json {',
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle valid JSON options', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
        'session-1',
        '{"priority": "high", "timeout": 60}',
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle deeply nested JSON options', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const deepOptions = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 'deep' },
              },
            },
          },
        },
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
        'session-1',
        deepOptions,
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle options with null values', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
        'session-1',
        '{"field": null}',
      );

      expect(result).toHaveProperty('analysisId');
    });
  });

  describe('Pipeline State Edge Cases', () => {
    it('should handle duplicate analysis initiation', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      // Initiate same analysis twice
      const result1 = await service.initiateAnalysis('Same job', resumeFile);
      const result2 = await service.initiateAnalysis('Same job', resumeFile);

      // Should create separate instances
      expect(result1.analysisId).not.toBe(result2.analysisId);
    });

    it('should return processing steps in response', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('processingSteps');
      expect(result.processingSteps).toContain('jd_extraction');
      expect(result.processingSteps).toContain('resume_parsing');
      expect(result.processingSteps).toContain('scoring_analysis');
    });

    it('should return estimated processing time', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('estimatedProcessingTime');
      expect(typeof result.estimatedProcessingTime).toBe('number');
    });

    it('should include timestamp in response', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });
  });

  describe('Response Structure Edge Cases', () => {
    it('should return complete response structure', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toMatchObject({
        analysisId: expect.any(String),
        status: 'processing',
        message: expect.any(String),
        estimatedProcessingTime: expect.any(Number),
        processingSteps: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should handle virtual job ID format', async () => {
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      let capturedJobId = '';
      natsClient.publishJobJdSubmitted.mockImplementation((event) => {
        capturedJobId = event.jobId;
        return Promise.resolve({ success: true, messageId: 'msg-1' });
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      await service.initiateAnalysis('Job description', resumeFile);

      expect(capturedJobId).toMatch(/^analysis_job_analysis_\d+_[a-z0-9]+$/);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle filename with path traversal patterns', async () => {
      const resumeFile = new MulterFile({
        originalname: '../../../etc/passwd.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      natsClient.publishResumeSubmitted.mockImplementation((event) => {
        expect(event.originalFilename).toBe('../../../etc/passwd.pdf');
        return Promise.resolve({ success: true, messageId: 'msg-2' });
      });

      const result = await service.initiateAnalysis(
        'Job description',
        resumeFile,
      );

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle JD text with SQL injection patterns', async () => {
      const maliciousJD =
        "'; DROP TABLE jobs; -- \" OR 1=1; DELETE FROM analysis WHERE '1'='1";
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockImplementation((event) => {
        expect(event.jdText).toBe(maliciousJD);
        return Promise.resolve({ success: true, messageId: 'msg-1' });
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(maliciousJD, resumeFile);

      expect(result).toHaveProperty('analysisId');
    });

    it('should handle XSS attempt in JD text', async () => {
      const xssJD = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
      const resumeFile = new MulterFile({
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      });

      natsClient.publishJobJdSubmitted.mockImplementation((event) => {
        expect(event.jdText).toBe(xssJD);
        return Promise.resolve({ success: true, messageId: 'msg-1' });
      });
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const result = await service.initiateAnalysis(xssJD, resumeFile);

      expect(result).toHaveProperty('analysisId');
    });
  });
});
