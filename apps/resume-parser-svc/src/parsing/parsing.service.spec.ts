import { ParsingService } from './parsing.service';
import type { VisionLlmService } from '../vision-llm/vision-llm.service';
import type { PdfTextExtractorService } from './pdf-text-extractor.service';
import type { GridFsService } from '../gridfs/gridfs.service';
import type { FieldMapperService } from '../field-mapper/field-mapper.service';
import type { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import pdfParse from 'pdf-parse';

jest.mock('pdf-parse', () => jest.fn());

const mockParse = pdfParse as unknown as jest.MockedFunction<(buffer: Buffer) => Promise<{ text: string }>>;

const buildService = () => {
  const vision = { parseResumeText: jest.fn(), parseResumePdf: jest.fn() } as unknown as VisionLlmService;
  const pdf = { extractText: jest.fn() } as unknown as PdfTextExtractorService;
  const grid = { downloadFile: jest.fn() } as unknown as GridFsService;
  const mapper = { normalizeToResumeDto: jest.fn() } as unknown as FieldMapperService;
  const nats = {
    publishAnalysisResumeParsed: jest.fn(),
    publishJobResumeFailed: jest.fn(),
    publishProcessingError: jest.fn(),
    isConnected: true,
  } as unknown as ResumeParserNatsService;

  const svc = new ParsingService(vision, pdf, grid, mapper, nats);
  return { svc, vision, pdf, grid, mapper, nats };
};

describe('ParsingService (isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads resume and publishes parsed event', async () => {
    const { svc, grid, pdf, mapper, nats, vision: _vision } = buildService();
    const event = {
      jobId: 'job-1',
      resumeId: 'resume-1',
      tempGridFsUrl: 'gridfs://bucket/id',
      originalFilename: 'candidate.pdf',
      organizationId: 'org',
      userId: 'user',
    } as any;

    const buffer = Buffer.from('%PDF-1.4 test');
    (grid.downloadFile as any).mockResolvedValue(buffer);
    (pdf.extractText as any).mockResolvedValue('resume text');
    mockParse.mockResolvedValue({ text: 'resume text' });
    (mapper.normalizeToResumeDto as any).mockResolvedValue({ contactInfo: null, skills: [], workExperience: [], education: [] });
    (nats.publishAnalysisResumeParsed as any).mockResolvedValue({ success: true });

    await svc.handleResumeSubmitted(event);

    expect(grid.downloadFile).toHaveBeenCalledWith(event.tempGridFsUrl);
    expect(pdf.extractText).toHaveBeenCalledWith(buffer);
    expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(expect.objectContaining({ jobId: event.jobId }));
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - File Download Failures', () => {
    it('should handle GridFS download failure', async () => {
      const { svc, grid, nats, vision: _vision, pdf: _pdf, mapper: _mapper } = buildService();
      const event = {
        jobId: 'job-fail',
        resumeId: 'resume-fail',
        tempGridFsUrl: 'gridfs://bucket/fail',
        originalFilename: 'missing.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      (grid.downloadFile as any).mockRejectedValue(
        new Error('File not found in GridFS'),
      );

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'File not found in GridFS',
      );
      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });

    it('should handle network timeout during download', async () => {
      const { svc, grid, nats: _nats, vision: _vision, pdf: _pdf, mapper: _mapper } = buildService();
      const event = {
        jobId: 'job-timeout',
        resumeId: 'resume-timeout',
        tempGridFsUrl: 'gridfs://bucket/slow',
        originalFilename: 'timeout.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      (grid.downloadFile as any).mockRejectedValue(
        new Error('Download timeout after 30s'),
      );

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'Download timeout',
      );
    });

    it('should reject corrupted PDF files', async () => {
      const { svc, grid, nats, vision: _vision, pdf: _pdf, mapper: _mapper } = buildService();
      const event = {
        jobId: 'job-corrupt',
        resumeId: 'resume-corrupt',
        tempGridFsUrl: 'gridfs://bucket/corrupt',
        originalFilename: 'corrupted.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      const corruptedBuffer = Buffer.from('NOT A VALID PDF');
      (grid.downloadFile as any).mockResolvedValue(corruptedBuffer);

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'FILE_VALIDATION_FAILED',
      );
      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });
  });

  describe('Negative Tests - Text Extraction Failures', () => {
    it('should handle empty PDF files', async () => {
      const { svc, grid, pdf, nats: _nats, vision: _vision, mapper: _mapper } = buildService();
      const event = {
        jobId: 'job-empty',
        resumeId: 'resume-empty',
        tempGridFsUrl: 'gridfs://bucket/empty',
        originalFilename: 'empty.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      const emptyBuffer = Buffer.from('%PDF-1.4\n%%EOF');
      (grid.downloadFile as any).mockResolvedValue(emptyBuffer);
      (pdf.extractText as any).mockResolvedValue('');
      mockParse.mockResolvedValue({ text: '' });

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow();
    });

    it('should handle PDF parsing errors', async () => {
      const { svc, grid, pdf, nats, vision: _vision, mapper: _mapper } = buildService();
      const event = {
        jobId: 'job-parse-error',
        resumeId: 'resume-parse-error',
        tempGridFsUrl: 'gridfs://bucket/parseerror',
        originalFilename: 'unreadable.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      const buffer = Buffer.from('%PDF-1.4 complex');
      (grid.downloadFile as any).mockResolvedValue(buffer);
      (pdf.extractText as any).mockRejectedValue(
        new Error('PDF parsing failed: encrypted'),
      );

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'PDF parsing failed',
      );
      expect(nats.publishJobResumeFailed).toHaveBeenCalled();
    });
  });

  describe('Negative Tests - NATS Publishing Failures', () => {
    it('should handle NATS connection failure during publishing', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = {
        jobId: 'job-nats-fail',
        resumeId: 'resume-nats-fail',
        tempGridFsUrl: 'gridfs://bucket/nats',
        originalFilename: 'candidate.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      const buffer = Buffer.from('%PDF-1.4 test');
      (grid.downloadFile as any).mockResolvedValue(buffer);
      (pdf.extractText as any).mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      (mapper.normalizeToResumeDto as any).mockResolvedValue({
        contactInfo: null,
        skills: [],
        workExperience: [],
        education: [],
      });
      (nats.publishAnalysisResumeParsed as any).mockRejectedValue(
        new Error('NATS connection lost'),
      );

      await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
        'NATS connection lost',
      );
    });
  });

  describe('Boundary Tests - File Size Limits', () => {
    it('should handle minimum valid PDF (smallest possible)', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = {
        jobId: 'job-min',
        resumeId: 'resume-min',
        tempGridFsUrl: 'gridfs://bucket/min',
        originalFilename: 'minimal.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      const minBuffer = Buffer.from('%PDF-1.4\nEndObj\n%%EOF');
      (grid.downloadFile as any).mockResolvedValue(minBuffer);
      (pdf.extractText as any).mockResolvedValue('John Doe');
      mockParse.mockResolvedValue({ text: 'John Doe' });
      (mapper.normalizeToResumeDto as any).mockResolvedValue({
        contactInfo: { name: 'John Doe' },
        skills: [],
        workExperience: [],
        education: [],
      });
      (nats.publishAnalysisResumeParsed as any).mockResolvedValue({
        success: true,
      });

      await svc.handleResumeSubmitted(event);

      expect(pdf.extractText).toHaveBeenCalled();
    });
  });

  describe('Edge Cases - Concurrent Resume Processing', () => {
    it('should handle concurrent resume submissions', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();

      const createEvent = (id: string) => ({
        jobId: 'job-concurrent',
        resumeId: `resume-${id}`,
        tempGridFsUrl: `gridfs://bucket/${id}`,
        originalFilename: `candidate-${id}.pdf`,
        organizationId: 'org',
        userId: 'user',
      });

      const buffer = Buffer.from('%PDF-1.4 test');
      (grid.downloadFile as any).mockResolvedValue(buffer);
      (pdf.extractText as any).mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      (mapper.normalizeToResumeDto as any).mockResolvedValue({
        contactInfo: null,
        skills: [],
        workExperience: [],
        education: [],
      });
      (nats.publishAnalysisResumeParsed as any).mockResolvedValue({
        success: true,
      });

      const promises = Array(5)
        .fill(null)
        .map((_, i) => svc.handleResumeSubmitted(createEvent(`${i}`)));

      await Promise.all(promises);

      expect(grid.downloadFile).toHaveBeenCalledTimes(5);
      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Cases - Special Characters in Filenames', () => {
    it('should handle filenames with unicode characters', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = {
        jobId: 'job-unicode',
        resumeId: 'resume-unicode',
        tempGridFsUrl: 'gridfs://bucket/unicode',
        originalFilename: '简历-李明.pdf',
        organizationId: 'org',
        userId: 'user',
      } as any;

      const buffer = Buffer.from('%PDF-1.4 test');
      (grid.downloadFile as any).mockResolvedValue(buffer);
      (pdf.extractText as any).mockResolvedValue('李明的简历');
      mockParse.mockResolvedValue({ text: '李明的简历' });
      (mapper.normalizeToResumeDto as any).mockResolvedValue({
        contactInfo: { name: '李明' },
        skills: [],
        workExperience: [],
        education: [],
      });
      (nats.publishAnalysisResumeParsed as any).mockResolvedValue({
        success: true,
      });

      await svc.handleResumeSubmitted(event);

      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalled();
    });

    it('should handle filenames with special characters', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = {
        jobId: 'job-special',
        resumeId: 'resume-special',
        tempGridFsUrl: 'gridfs://bucket/special',
        originalFilename: "O'Connor & Smith (2024) #Resume.pdf",
        organizationId: 'org',
        userId: 'user',
      } as any;

      const buffer = Buffer.from('%PDF-1.4 test');
      (grid.downloadFile as any).mockResolvedValue(buffer);
      (pdf.extractText as any).mockResolvedValue("O'Connor resume");
      mockParse.mockResolvedValue({ text: "O'Connor resume" });
      (mapper.normalizeToResumeDto as any).mockResolvedValue({
        contactInfo: { name: "O'Connor" },
        skills: [],
        workExperience: [],
        education: [],
      });
      (nats.publishAnalysisResumeParsed as any).mockResolvedValue({
        success: true,
      });

      await svc.handleResumeSubmitted(event);

      expect(grid.downloadFile).toHaveBeenCalled();
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should publish complete resume parsed event structure', async () => {
      const { svc, grid, pdf, mapper, nats } = buildService();
      const event = {
        jobId: 'job-complete',
        resumeId: 'resume-complete',
        tempGridFsUrl: 'gridfs://bucket/complete',
        originalFilename: 'candidate.pdf',
        organizationId: 'org-123',
        userId: 'user-456',
      } as any;

      const buffer = Buffer.from('%PDF-1.4 test');
      (grid.downloadFile as any).mockResolvedValue(buffer);
      (pdf.extractText as any).mockResolvedValue('resume text');
      mockParse.mockResolvedValue({ text: 'resume text' });
      (mapper.normalizeToResumeDto as any).mockResolvedValue({
        contactInfo: { name: 'John Doe', email: 'john@example.com' },
        skills: ['JavaScript', 'TypeScript'],
        workExperience: [],
        education: [],
      });
      (nats.publishAnalysisResumeParsed as any).mockResolvedValue({
        success: true,
      });

      await svc.handleResumeSubmitted(event);

      expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: expect.stringMatching(/^job-/),
          resumeId: expect.stringMatching(/^resume-/),
        }),
      );

      const publishCall = (nats.publishAnalysisResumeParsed as any).mock
        .calls[0][0];
      expect(publishCall.jobId).toBe('job-complete');
      expect(publishCall.resumeId).toBe('resume-complete');
      expect(publishCall.resumeDto).toBeDefined();
    });
  });
});
