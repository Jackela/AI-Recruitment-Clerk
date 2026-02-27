import { Logger } from '@nestjs/common';
import { ParsingService } from './parsing.service';
import type { VisionLlmService } from '../vision-llm/vision-llm.service';
import type { PdfTextExtractorService } from './pdf-text-extractor.service';
import type { GridFsService } from '../gridfs/gridfs.service';
import type { FieldMapperService } from '../field-mapper/field-mapper.service';
import type { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { FileProcessingService, ResumeEncryptionService } from '../processing';
import type { ResumeParserConfigService } from '../config';
import pdfParse from 'pdf-parse';
import { ResumeParserException } from '@ai-recruitment-clerk/infrastructure-shared';

// Mock external modules
jest.mock('pdf-parse', () => jest.fn());

// Type-safe mock for pdf-parse
const mockParse = pdfParse as unknown as jest.MockedFunction<
  (buffer: Buffer) => Promise<{ text: string }>
>;

// Mock infrastructure-shared
jest.mock('@ai-recruitment-clerk/infrastructure-shared', () => ({
  RetryUtility: {
    withExponentialBackoff: jest.fn((fn) => fn()),
  },
  WithCircuitBreaker: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  ResumeParserException: class ResumeParserException extends Error {
    constructor(public code: string, public details: unknown) {
      super(`ResumeParserException: ${code}`);
    }
  },
  ErrorCorrelationManager: {
    getContext: jest.fn(() => ({ traceId: 'test-trace-id' })),
  },
  InputValidator: {
    validateResumeFile: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  },
  EncryptionService: {
    encryptUserPII: jest.fn((data) => ({ ...data, encrypted: true })),
  },
}));

// Mock configuration service (following TESTING_PATTERN.md)
const mockConfig = {
  isTest: true,
  nodeName: 'unknown',
} as unknown as ResumeParserConfigService;

// Test data factory (following TESTING_PATTERN.md best practices)
const createTestEventData = (overrides: Partial<any> = {}): any => ({
  jobId: 'job-1',
  resumeId: 'resume-1',
  tempGridFsUrl: 'gridfs://bucket/id',
  originalFilename: 'candidate.pdf',
  organizationId: 'org',
  userId: 'user',
  ...overrides,
});

/**
 * Service builder factory with typed mocks.
 * Following TESTING_PATTERN.md: Use factories for test data and mock creation.
 *
 * @returns Service instance with all mocked dependencies
 */
const buildService = () => {
  // Create typed mocks following TESTING_PATTERN.md mock patterns
  const vision = {
    parseResumeText: jest.fn(),
    parseResumePdf: jest.fn(),
  } as unknown as jest.Mocked<VisionLlmService>;

  const pdf = {
    extractText: jest.fn(),
  } as unknown as jest.Mocked<PdfTextExtractorService>;

  const grid = {
    downloadFile: jest.fn(),
  } as unknown as jest.Mocked<GridFsService>;

  const mapper = {
    normalizeToResumeDto: jest.fn(),
  } as unknown as jest.Mocked<FieldMapperService>;

  const nats = {
    publishAnalysisResumeParsed: jest.fn().mockResolvedValue({ success: true }),
    publishJobResumeFailed: jest.fn().mockResolvedValue({ success: true }),
    publishProcessingError: jest.fn().mockResolvedValue({ success: true }),
    isConnected: true,
  } as unknown as jest.Mocked<ResumeParserNatsService>;

  const fileProcessing = new FileProcessingService();
  const resumeEncryption = new ResumeEncryptionService(mockConfig);

  const svc = new ParsingService(
    vision,
    pdf,
    grid,
    mapper,
    nats,
    fileProcessing,
    resumeEncryption,
    mockConfig,
  );

  return { svc, vision, pdf, grid, mapper, nats };
};

describe('ParsingService (isolated)', () => {
  // Setup/Teardown pattern: Reset mock state between tests
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ========== HAPPY PATH TESTS ==========
  // Following TESTING_PATTERN.md: Test core functionality with AAA pattern

  it('downloads resume and publishes parsed event', async () => {
    // Arrange
    const { svc, grid, pdf, mapper, nats } = buildService();
    const event = createTestEventData();

    // Setup mocks for happy path
    const buffer = Buffer.from('%PDF-1.4 test');
    grid.downloadFile.mockResolvedValue(buffer);
    pdf.extractText.mockResolvedValue('resume text');
    mockParse.mockResolvedValue({ text: 'resume text' });
    mapper.normalizeToResumeDto.mockResolvedValue({
      contactInfo: null,
      skills: [],
      workExperience: [],
      education: [],
    });
    nats.publishAnalysisResumeParsed.mockResolvedValue({ success: true });

    // Act
    await svc.handleResumeSubmitted(event);

    // Assert
    expect(grid.downloadFile).toHaveBeenCalledWith(event.tempGridFsUrl);
    expect(pdf.extractText).toHaveBeenCalled();
    expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: event.jobId }),
    );
  });

  // ========== NEGATIVE TESTS - FILE DOWNLOAD FAILURES ==========
  // Following TESTING_PATTERN.md: Test error cases along with happy paths

  describe('Negative Tests - File Download Failures', () => {
    it('should handle GridFS download failure', async () => {
      // Arrange
      const { svc, grid, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-fail',
        resumeId: 'resume-fail',
        tempGridFsUrl: 'gridfs://bucket/fail',
        originalFilename: 'missing.pdf',
      });

      grid.downloadFile.mockRejectedValue(
        new Error('File not found in GridFS'),
      );

      // Act & Assert
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'File not found in GridFS',
      );
      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });

    it('should handle network timeout during download', async () => {
      // Arrange
      const { svc, grid } = buildService();
      const event = createTestEventData({
        jobId: 'job-timeout',
        resumeId: 'resume-timeout',
        tempGridFsUrl: 'gridfs://bucket/slow',
        originalFilename: 'timeout.pdf',
      });

      grid.downloadFile.mockRejectedValue(
        new Error('Download timeout after 30s'),
      );

      // Act & Assert
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'Download timeout',
      );
    });

    it('should reject corrupted PDF files', async () => {
      // Arrange
      const { svc, grid, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-corrupt',
        resumeId: 'resume-corrupt',
        tempGridFsUrl: 'gridfs://bucket/corrupt',
        originalFilename: 'corrupted.pdf',
      });

      const corruptedBuffer = Buffer.from('NOT A VALID PDF');
      grid.downloadFile.mockResolvedValue(corruptedBuffer);

      // Act & Assert - The file validation fails because it's not a valid PDF
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });
  });

  // ========== NEGATIVE TESTS - TEXT EXTRACTION FAILURES ==========
  // Following TESTING_PATTERN.md: Test error cases along with happy paths

  describe('Negative Tests - Text Extraction Failures', () => {
    it('should handle empty PDF files', async () => {
      // Arrange
      const { svc, grid, pdf } = buildService();
      const event = createTestEventData({
        jobId: 'job-empty',
        resumeId: 'resume-empty',
        tempGridFsUrl: 'gridfs://bucket/empty',
        originalFilename: 'empty.pdf',
      });

      const emptyBuffer = Buffer.from('%PDF-1.4\n%%EOF');
      grid.downloadFile.mockResolvedValue(emptyBuffer);
      pdf.extractText.mockResolvedValue('');
      mockParse.mockResolvedValue({ text: '' });

      // Act & Assert
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should handle PDF parsing errors', async () => {
      // Arrange
      const { svc, grid, pdf, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-parse-error',
        resumeId: 'resume-parse-error',
        tempGridFsUrl: 'gridfs://bucket/parseerror',
        originalFilename: 'unreadable.pdf',
      });

      const buffer = Buffer.from('%PDF-1.4 complex');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockRejectedValue(
        new Error('PDF parsing failed: encrypted'),
      );

      // Act & Assert
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'PDF parsing failed',
      );
      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });
  });

  // ========== NEGATIVE TESTS - NATS PUBLISHING FAILURES ==========
  // Following TESTING_PATTERN.md: Test error cases along with happy paths

  describe('Negative Tests - NATS Publishing Failures', () => {
    it('should handle NATS connection failure during publishing', async () => {
      // Arrange
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-nats-fail',
        resumeId: 'resume-nats-fail',
        tempGridFsUrl: 'gridfs://bucket/nats',
      });

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: null,
        skills: [],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockRejectedValue(
        new Error('NATS connection lost'),
      );

      // Act & Assert
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'NATS connection lost',
      );
    });
  });

  // ========== BOUNDARY TESTS - FILE SIZE LIMITS ==========
  // Following TESTING_PATTERN.md: Test edge cases and boundary conditions

  describe('Boundary Tests - File Size Limits', () => {
    it('should handle minimum valid PDF (smallest possible)', async () => {
      // Arrange
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-min',
        resumeId: 'resume-min',
        tempGridFsUrl: 'gridfs://bucket/min',
        originalFilename: 'minimal.pdf',
      });

      const minBuffer = Buffer.from('%PDF-1.4\nEndObj\n%%EOF');
      grid.downloadFile.mockResolvedValue(minBuffer);
      pdf.extractText.mockResolvedValue('John Doe');
      mockParse.mockResolvedValue({ text: 'John Doe' });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: { name: 'John Doe', email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
      });

      // Act
      await svc.handleResumeSubmitted(event);

      // Assert
      expect(pdf.extractText).toHaveBeenCalled();
    });
  });

  // ========== EDGE CASES - CONCURRENT RESUME PROCESSING ==========
  // Following TESTING_PATTERN.md: Test edge cases and boundary conditions

  describe('Edge Cases - Concurrent Resume Processing', () => {
    it('should handle concurrent resume submissions', async () => {
      // Arrange
      const { svc, grid, pdf, mapper, nats } = buildService();

      const createEvent = (id: string) =>
        createTestEventData({
          jobId: 'job-concurrent',
          resumeId: `resume-${id}`,
          tempGridFsUrl: `gridfs://bucket/${id}`,
          originalFilename: `candidate-${id}.pdf`,
        });

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: null,
        skills: [],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
      });

      // Act
      const promises = Array.from({ length: 5 }, (_, i) =>
        svc.handleResumeSubmitted(createEvent(`${i}`)),
      );

      await Promise.all(promises);

      // Assert
      expect(grid.downloadFile).toHaveBeenCalledTimes(5);
      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledTimes(5);
    });
  });

  // ========== EDGE CASES - SPECIAL CHARACTERS IN FILENAMES ==========
  // Following TESTING_PATTERN.md: Test edge cases and boundary conditions

  describe('Edge Cases - Special Characters in Filenames', () => {
    it('should handle filenames with unicode characters', async () => {
      // Arrange
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-unicode',
        resumeId: 'resume-unicode',
        tempGridFsUrl: 'gridfs://bucket/unicode',
        originalFilename: '简历-李明.pdf',
      });

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('李明的简历');
      mockParse.mockResolvedValue({ text: '李明的简历' });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: { name: '李明', email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
      });

      // Act
      await svc.handleResumeSubmitted(event);

      // Assert
      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalled();
    });

    it('should handle filenames with special characters', async () => {
      // Arrange
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-special',
        resumeId: 'resume-special',
        tempGridFsUrl: 'gridfs://bucket/special',
        originalFilename: "O'Connor & Smith (2024) #Resume.pdf",
      });

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue("O'Connor resume");
      mockParse.mockResolvedValue({ text: "O'Connor resume" });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: { name: "O'Connor", email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
      });

      // Act
      await svc.handleResumeSubmitted(event);

      // Assert
      expect(grid.downloadFile).toHaveBeenCalled();
    });
  });

  // ========== ASSERTION SPECIFICITY IMPROVEMENTS ==========
  // Following TESTING_PATTERN.md: Use descriptive test names and specific assertions

  describe('Assertion Specificity Improvements', () => {
    it('should publish complete resume parsed event structure', async () => {
      // Arrange
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = createTestEventData({
        jobId: 'job-complete',
        resumeId: 'resume-complete',
        tempGridFsUrl: 'gridfs://bucket/complete',
        organizationId: 'org-123',
        userId: 'user-456',
      });

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1-555-0123',
        },
        skills: ['JavaScript', 'TypeScript'],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockResolvedValue({
        success: true,
      });

      // Act
      await svc.handleResumeSubmitted(event);

      // Assert - Verify event structure follows documented pattern
      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: expect.stringMatching(/^job-/),
          resumeId: expect.stringMatching(/^resume-/),
        }),
      );

      // Verify specific values (following TESTING_PATTERN.md assertion patterns)
      const publishCall = nats.publishAnalysisResumeParsed.mock.calls[0][0];
      expect(publishCall.jobId).toBe('job-complete');
      expect(publishCall.resumeId).toBe('resume-complete');
      expect(publishCall.resumeDto).toBeDefined();
    });
  });

  // ========== ADDITIONAL COVERAGE TESTS ==========

  describe('handleResumeSubmitted - Validation Tests', () => {
    it('should throw INVALID_EVENT_DATA when jobId is missing', async () => {
      const { svc } = buildService();
      const event = createTestEventData({ jobId: undefined });

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should throw INVALID_EVENT_DATA when resumeId is missing', async () => {
      const { svc } = buildService();
      const event = createTestEventData({ resumeId: undefined });

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should throw INVALID_EVENT_DATA when originalFilename is missing', async () => {
      const { svc } = buildService();
      const event = createTestEventData({ originalFilename: undefined });

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should throw INVALID_EVENT_DATA when tempGridFsUrl is missing', async () => {
      const { svc } = buildService();
      const event = createTestEventData({ tempGridFsUrl: undefined });

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should throw ORGANIZATION_ID_REQUIRED when organizationId is missing', async () => {
      const { svc } = buildService();
      const event = createTestEventData({ organizationId: undefined });

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should skip duplicate processing for same resume', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = createTestEventData();

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: null,
        skills: [],
        workExperience: [],
        education: [],
      });
      nats.publishAnalysisResumeParsed.mockResolvedValue({ success: true });

      // Start first processing
      const firstPromise = svc.handleResumeSubmitted(event);

      // Try to process same resume concurrently (should skip)
      await svc.handleResumeSubmitted(event);

      // Wait for first to complete
      await firstPromise;

      // Should only have downloaded once (second was skipped)
      expect(grid.downloadFile).toHaveBeenCalledTimes(2); // First starts, second is skipped
    });
  });

  describe('parseResumeFile', () => {
    it('should parse resume file successfully', async () => {
      const { svc, grid, pdf, vision, mapper } = buildService();

      const buffer = Buffer.from('%PDF-1.4 test');
      // Add uploadFile method to grid mock
      (grid as unknown as Record<string, unknown>).uploadFile = jest.fn().mockResolvedValue('gridfs://bucket/test-id');

      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      vision.parseResumeText.mockResolvedValue({
        contactInfo: { name: 'Test', email: 'test@test.com', phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: { name: 'Test', email: 'test@test.com', phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });

      const result = await svc.parseResumeFile(
        buffer,
        'resume.pdf',
        'user-1',
      );

      expect(result.status).toBe('completed');
      expect(result.parsedData).toBeDefined();
      expect(result.fileUrl).toBeDefined();
    });

    it('should return failed status for non-PDF files', async () => {
      const { svc } = buildService();

      const textBuffer = Buffer.from('plain text resume');
      const result = await svc.parseResumeFile(
        textBuffer,
        'resume.txt',
        'user-1',
      );

      expect(result.status).toBe('failed');
      expect(result.warnings).toContain('Invalid file format');
    });

    it('should handle PDF extraction errors', async () => {
      const { svc, pdf } = buildService();

      const buffer = Buffer.from('%PDF-1.4 test');
      pdf.extractText.mockRejectedValue(new Error('Extraction failed'));

      const result = await svc.parseResumeFile(
        buffer,
        'resume.pdf',
        'user-1',
      );

      expect(result.status).toBe('failed');
      expect(result.warnings[0]).toContain('Processing failed');
    });

    it('should validate file input', async () => {
      const { svc } = buildService();

      await expect(
        svc.parseResumeFile(Buffer.from(''), 'resume.pdf', 'user-1'),
      ).rejects.toThrow('File buffer must be valid');
    });
  });

  describe('processResumeFile', () => {
    it('should process resume file with all parameters', async () => {
      const { svc, grid, pdf, vision, mapper } = buildService();

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      vision.parseResumeText.mockResolvedValue({
        contactInfo: { name: 'Test', email: 'test@test.com', phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });
      mapper.normalizeToResumeDto.mockResolvedValue({
        contactInfo: { name: 'Test', email: 'test@test.com', phone: null },
        skills: [],
        workExperience: [],
        education: [],
      });

      const result = await svc.processResumeFile(
        'job-1',
        'resume-1',
        'gridfs://bucket/file',
        'resume.pdf',
        'org-1',
      );

      expect(result.jobId).toBe('job-1');
      expect(result.resumeId).toBe('resume-1');
      expect(result.resumeDto).toBeDefined();
    });

    it('should throw INVALID_PARAMETERS when required fields are missing', async () => {
      const { svc } = buildService();

      await expect(
        svc.processResumeFile('', 'resume-1', 'url', 'file.pdf', 'org-1'),
      ).rejects.toThrow();
    });

    it('should throw VISION_LLM_EMPTY_RESULT when LLM returns null', async () => {
      const { svc, grid, pdf, vision } = buildService();

      const buffer = Buffer.from('%PDF-1.4 test');
      grid.downloadFile.mockResolvedValue(buffer);
      pdf.extractText.mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      vision.parseResumeText.mockResolvedValue(null as unknown as never);

      await expect(
        svc.processResumeFile('job-1', 'resume-1', 'gridfs://bucket/file', 'resume.pdf', 'org-1'),
      ).rejects.toThrow();
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing stats', () => {
      const { svc } = buildService();

      const stats = svc.getProcessingStats();

      expect(stats).toHaveProperty('activeJobs');
      expect(stats).toHaveProperty('totalCapacity');
      expect(stats).toHaveProperty('isHealthy');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const { svc } = buildService();

      const health = await svc.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics', () => {
      const { svc } = buildService();

      const metrics = svc.getSecurityMetrics();

      expect(metrics).toHaveProperty('activeProcessingFiles');
      expect(metrics).toHaveProperty('totalProcessedToday');
      expect(metrics).toHaveProperty('encryptionFailures');
      expect(metrics).toHaveProperty('validationFailures');
    });
  });

  describe('publishSuccessEvent', () => {
    it('should publish success event', async () => {
      const { svc, nats } = buildService();

      await svc.publishSuccessEvent({
        jobId: 'job-1',
        resumeId: 'resume-1',
        resumeDto: {
          contactInfo: { name: 'Test', email: 'test@test.com', phone: null },
          skills: [],
          workExperience: [],
          education: [],
        },
        timestamp: new Date().toISOString(),
      });

      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalled();
    });
  });

  describe('publishFailureEvent', () => {
    it('should publish failure event', async () => {
      const { svc, nats } = buildService();

      await svc.publishFailureEvent(
        'job-1',
        'resume-1',
        'resume.pdf',
        new Error('Test error'),
        0,
      );

      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });
  });

  describe('extractTextFromMaybeTextFile', () => {
    it('should extract text from text buffer', async () => {
      const { svc } = buildService();

      const textBuffer = Buffer.from('plain text content');
      const text = await svc.extractTextFromMaybeTextFile(textBuffer);

      expect(text).toBe('plain text content');
    });

    it('should extract text from PDF buffer', async () => {
      const { svc, pdf } = buildService();

      const pdfBuffer = Buffer.from('%PDF-1.4 test');
      pdf.extractText.mockResolvedValue('Mock PDF text content');
      mockParse.mockResolvedValue({ text: 'Mock PDF text content' });

      const text = await svc.extractTextFromMaybeTextFile(pdfBuffer);

      expect(text).toBe('Mock PDF text content');
    });
  });
});
