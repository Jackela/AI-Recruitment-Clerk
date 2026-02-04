import { ParsingService } from './parsing.service';
import type { VisionLlmService } from '../vision-llm/vision-llm.service';
import type { PdfTextExtractorService } from './pdf-text-extractor.service';
import type { GridFsService } from '../gridfs/gridfs.service';
import type { FieldMapperService } from '../field-mapper/field-mapper.service';
import type { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { FileProcessingService, ResumeEncryptionService } from '../processing';
import { ResumeParserConfigService } from '../config';
import pdfParse from 'pdf-parse';

// Mock external modules
jest.mock('pdf-parse', () => jest.fn());

// Type-safe mock for pdf-parse
const mockParse = pdfParse as unknown as jest.MockedFunction<
  (buffer: Buffer) => Promise<{ text: string }>
>;

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

      // Act & Assert
      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'FILE_VALIDATION_FAILED',
      );
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
});
