import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { ReportDocument } from '../schemas/report.schema';
import { ReportTemplatesService } from './report-templates.service';
import { GridFsService } from './gridfs.service';
import type {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
} from '../schemas/report.schema';

describe('ReportTemplatesService', () => {
  let service: ReportTemplatesService;
  let gridFsService: jest.Mocked<GridFsService>;

  // Test data factories
  const createMockScoreBreakdown = (overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
    skillsMatch: 85,
    experienceMatch: 90,
    educationMatch: 80,
    overallFit: 85,
    ...overrides,
  });

  const createMockMatchingSkill = (overrides: Partial<MatchingSkill> = {}): MatchingSkill => ({
    skill: 'JavaScript',
    matchScore: 95,
    matchType: 'exact',
    explanation: 'Perfect match for required skill',
    ...overrides,
  });

  const createMockRecommendation = (overrides: Partial<ReportRecommendation> = {}): ReportRecommendation => ({
    decision: 'hire',
    reasoning: 'Strong technical background with relevant experience',
    strengths: ['Strong JavaScript skills', 'Good experience level'],
    concerns: ['Limited leadership experience'],
    suggestions: ['Consider for technical interview'],
    ...overrides,
  });

  const createMockReportDocument = (overrides: Partial<ReportDocument> = {}): ReportDocument => ({
    jobId: 'test-job-id',
    resumeId: 'test-resume-id',
    scoreBreakdown: createMockScoreBreakdown(),
    skillsAnalysis: [
      createMockMatchingSkill({ skill: 'JavaScript', matchScore: 95, matchType: 'exact' }),
      createMockMatchingSkill({ skill: 'TypeScript', matchScore: 85, matchType: 'exact' }),
      createMockMatchingSkill({ skill: 'React', matchScore: 80, matchType: 'partial' }),
    ],
    recommendation: createMockRecommendation(),
    summary: 'Strong technical candidate with relevant experience',
    analysisConfidence: 0.92,
    processingTimeMs: 1500,
    status: 'completed',
    generatedBy: 'report-generator-service',
    llmModel: 'gemini-1.5-flash',
    generatedAt: new Date(),
    ...overrides,
  }) as ReportDocument;

  const createMockGridFsService = (): jest.Mocked<GridFsService> =>
    ({
      saveReport: jest.fn().mockResolvedValue('file-id'),
      saveReportBuffer: jest.fn().mockResolvedValue('file-id'),
      healthCheck: jest.fn().mockResolvedValue(true),
      getReport: jest.fn(),
      getReportStream: jest.fn(),
      getReportMetadata: jest.fn(),
      findReportFiles: jest.fn(),
      deleteReport: jest.fn(),
      updateReportMetadata: jest.fn(),
    } as unknown as jest.Mocked<GridFsService>);

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockGridFsService = createMockGridFsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ReportTemplatesService,
          useFactory: () => new ReportTemplatesService(mockGridFsService),
        },
        { provide: GridFsService, useValue: mockGridFsService },
      ],
    }).compile();

    service = module.get<ReportTemplatesService>(ReportTemplatesService);
    gridFsService = module.get(GridFsService) as jest.Mocked<GridFsService>;

    // Suppress console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(async () => {
    // Clean up browser instance after each test
    await service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('generatePdfReport', () => {
    it('should generate PDF report for individual template type', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert
      expect(result.content).toBeDefined();
      expect(result.filename).toContain('individual-report');
      expect(result.filename).toContain('test-job-id');
      expect(result.filename).toContain('test-resume-id');
      expect(result.filename).toContain('.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.metadata.reportType).toBe('pdf');
      expect(result.metadata.encoding).toBe('binary');
      expect(result.metadata.mimeType).toBe('application/pdf');
    });

    it('should generate PDF report for comparison template type', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'comparison');

      // Assert
      expect(result.content).toBeDefined();
      expect(result.filename).toContain('comparison-report');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should generate PDF report for interview-guide template type', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'interview-guide');

      // Assert
      expect(result.content).toBeDefined();
      expect(result.filename).toContain('interview-guide-report');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should return base64 encoded content for PDF format', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert
      // Base64 encoded string should only contain valid base64 characters
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      expect(result.content).toMatch(base64Regex);
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should decode base64 content to valid PDF bytes', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');
      const decodedContent = Buffer.from(result.content, 'base64');

      // Assert - Decoded content should be PDF bytes (mock returns 'mock-pdf-content')
      expect(decodedContent.length).toBeGreaterThan(0);
      expect(decodedContent.toString('utf-8')).toBe('mock-pdf-content');
    });

    it('should generate PDF with correct metadata', async () => {
      // Arrange
      const reportData = createMockReportDocument({
        jobId: 'job-123',
        resumeId: 'resume-456',
      });

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert
      expect(result.metadata.jobId).toBe('job-123');
      expect(result.metadata.resumeId).toBe('resume-456');
      expect(result.metadata.reportType).toBe('pdf');
      expect(result.metadata.mimeType).toBe('application/pdf');
    });
  });

  describe('PDF Generation via Puppeteer', () => {
    it('should call Puppeteer to generate PDF', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert - The mock puppeteer returns 'mock-pdf-content'
      const decodedContent = Buffer.from(result.content, 'base64').toString('utf-8');
      expect(decodedContent).toBe('mock-pdf-content');
    });

    it('should handle PDF generation with custom options', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generatePdfReportBuffer(
        reportData,
        'individual',
        undefined,
        {
          format: 'A4',
          printBackground: true,
        },
      );

      // Assert
      expect(result.content).toBeDefined();
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should clean up browser on module destroy', async () => {
      // Arrange
      const reportData = createMockReportDocument();
      await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Act - Should not throw
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('PDF Error Handling and Edge Cases', () => {
    it('should handle report with minimal data', async () => {
      // Arrange
      const minimalReport = createMockReportDocument({
        skillsAnalysis: [],
        recommendation: createMockRecommendation({
          decision: 'consider',
          reasoning: '',
          strengths: [],
          concerns: [],
          suggestions: [],
        }),
      });

      // Act
      const result = await service.generateReportInFormat(minimalReport, 'pdf', 'individual');

      // Assert
      expect(result.content).toBeDefined();
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should handle special characters in report data', async () => {
      // Arrange
      const reportData = createMockReportDocument({
        recommendation: createMockRecommendation({
          decision: 'hire',
          reasoning: 'Candidate has <script>alert("test")</script> & "quotes" and \'apostrophes\'',
        }),
      });

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert - Content should be safely encoded
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should handle very long report content', async () => {
      // Arrange
      const longReasoning = 'A'.repeat(10000);
      const reportData = createMockReportDocument({
        recommendation: createMockRecommendation({
          decision: 'consider',
          reasoning: longReasoning,
        }),
      });

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should include proper metadata for binary encoding', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert
      expect(result.metadata.encoding).toBe('binary');
      expect(result.metadata.mimeType).toBe('application/pdf');
      expect(result.metadata.reportType).toBe('pdf');
    });

    it('should handle missing optional fields gracefully', async () => {
      // Arrange
      const reportData = createMockReportDocument({
        generatedAt: undefined,
      });

      // Act
      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      // Assert
      expect(result.content).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('generatePdfReportBuffer', () => {
    it('should generate PDF buffer with proper metadata', async () => {
      // Arrange
      const reportData = createMockReportDocument({
        jobId: 'job-abc',
        resumeId: 'resume-xyz',
      });

      // Act
      const result = await service.generatePdfReportBuffer(reportData, 'individual');

      // Assert
      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('individual-report');
      expect(result.filename).toContain('job-abc');
      expect(result.filename).toContain('resume-xyz');
      expect(result.filename).toContain('.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.metadata.reportType).toBe('pdf');
      expect(result.metadata.jobId).toBe('job-abc');
      expect(result.metadata.resumeId).toBe('resume-xyz');
    });

    it('should generate PDF buffer for comparison report', async () => {
      // Arrange
      const reportData = createMockReportDocument();

      // Act
      const result = await service.generatePdfReportBuffer(
        reportData,
        'comparison',
        {
          candidates: [
            {
              name: 'John Doe',
              score: 92,
              recommendation: 'hire',
              skills: ['JavaScript', 'React'],
            },
          ],
        },
      );

      // Assert
      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('comparison-report');
      expect(result.mimeType).toBe('application/pdf');
    });
  });

  describe('generateAndSavePdfReport', () => {
    it('should generate and save PDF report to GridFS', async () => {
      // Arrange
      const reportData = createMockReportDocument();
      const fileId = 'pdf-file-id-789';

      gridFsService.saveReportBuffer.mockResolvedValue(fileId);

      // Act
      const result = await service.generateAndSavePdfReport(reportData, 'individual');

      // Assert
      expect(result).toBe(fileId);
      expect(gridFsService.saveReportBuffer).toHaveBeenCalled();
    });
  });

  describe('saveGeneratedReport', () => {
    it('should save generated PDF report to GridFS', async () => {
      // Arrange
      const reportData = createMockReportDocument();
      const generatedReport = await service.generateReportInFormat(reportData, 'pdf', 'individual');
      const fileId = 'saved-file-id-123';

      gridFsService.saveReport.mockResolvedValue(fileId);

      // Act
      const result = await service.saveGeneratedReport(generatedReport);

      // Assert
      expect(result).toBe(fileId);
      expect(gridFsService.saveReport).toHaveBeenCalledWith(
        generatedReport.content,
        generatedReport.filename,
        generatedReport.metadata,
      );
    });
  });

  describe('saveGeneratedReportBuffer', () => {
    it('should save PDF buffer to GridFS', async () => {
      // Arrange
      const buffer = Buffer.from('test content');
      const filename = 'test-report.pdf';
      const metadata = {
        reportType: 'pdf' as const,
        jobId: 'job-123',
        resumeId: 'resume-456',
        generatedBy: 'test-service',
        generatedAt: new Date(),
        mimeType: 'application/pdf',
        encoding: 'binary' as const,
      };
      const fileId = 'buffer-file-id-456';

      gridFsService.saveReportBuffer.mockResolvedValue(fileId);

      // Act
      const result = await service.saveGeneratedReportBuffer(buffer, filename, metadata);

      // Assert
      expect(result).toBe(fileId);
      expect(gridFsService.saveReportBuffer).toHaveBeenCalledWith(
        buffer,
        filename,
        metadata,
      );
    });
  });

  describe('generateReportInFormat', () => {
    it('should generate HTML report', async () => {
      const reportData = createMockReportDocument();

      const result = await service.generateReportInFormat(reportData, 'html', 'individual');

      expect(result.content).toBeDefined();
      expect(result.mimeType).toBe('text/html');
      expect(result.filename).toContain('.html');
    });

    it('should generate JSON report', async () => {
      const reportData = createMockReportDocument();

      const result = await service.generateReportInFormat(reportData, 'json', 'individual');

      expect(result.content).toBeDefined();
      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toContain('.json');
      // Verify it's valid JSON
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it('should generate markdown report', async () => {
      const reportData = createMockReportDocument();

      const result = await service.generateReportInFormat(reportData, 'markdown', 'individual');

      expect(result.content).toBeDefined();
      expect(result.mimeType).toBe('text/markdown');
      expect(result.filename).toContain('.md');
    });

    it('should generate Excel report', async () => {
      const reportData = createMockReportDocument();

      const result = await service.generateReportInFormat(reportData, 'excel', 'individual');

      expect(result.content).toBeDefined();
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.filename).toContain('.xlsx');
    });

    it('should throw error for unsupported format', async () => {
      const reportData = createMockReportDocument();

      await expect(
        service.generateReportInFormat(reportData, 'invalid' as 'pdf', 'individual'),
      ).rejects.toThrow();
    });
  });

  describe('Template Types', () => {
    it('should generate batch report', async () => {
      const reportData = createMockReportDocument();
      const additionalData = {
        candidates: [
          { name: 'John', score: 90, recommendation: 'hire', skills: ['JS'] },
          { name: 'Jane', score: 85, recommendation: 'consider', skills: ['Python'] },
        ],
      };

      const result = await service.generateReportInFormat(reportData, 'pdf', 'batch', additionalData);

      expect(result.filename).toContain('batch-report');
    });

    it('should generate executive summary report', async () => {
      const reportData = createMockReportDocument();

      const result = await service.generateReportInFormat(reportData, 'pdf', 'executive-summary');

      expect(result.filename).toContain('executive-summary');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle report with zero scores', async () => {
      const reportData = createMockReportDocument({
        scoreBreakdown: createMockScoreBreakdown({
          skillsMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          overallFit: 0,
        }),
      });

      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      expect(result.content).toBeDefined();
    });

    it('should handle report with 100% scores', async () => {
      const reportData = createMockReportDocument({
        scoreBreakdown: createMockScoreBreakdown({
          skillsMatch: 100,
          experienceMatch: 100,
          educationMatch: 100,
          overallFit: 100,
        }),
      });

      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      expect(result.content).toBeDefined();
    });

    it('should handle report with many skills', async () => {
      const manySkills = Array.from({ length: 50 }, (_, i) =>
        createMockMatchingSkill({ skill: `Skill${i}`, matchScore: 80 }),
      );

      const reportData = createMockReportDocument({
        skillsAnalysis: manySkills,
      });

      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      expect(result.content).toBeDefined();
    });

    it('should handle report with many concerns', async () => {
      const manyConcerns = Array.from({ length: 20 }, (_, i) => `Concern ${i}`);

      const reportData = createMockReportDocument({
        recommendation: createMockRecommendation({ concerns: manyConcerns }),
      });

      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      expect(result.content).toBeDefined();
    });

    it('should handle unicode characters in report', async () => {
      const reportData = createMockReportDocument({
        recommendation: createMockRecommendation({
          reasoning: 'Candidate speaks \u4e2d\u6587, \u65e5\u672c\u8a9e, and \ud55c\uad6d\uc5b4',
        }),
      });

      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      expect(result.content).toBeDefined();
    });

    it('should handle markdown in recommendation text', async () => {
      const reportData = createMockReportDocument({
        recommendation: createMockRecommendation({
          reasoning: '# Important\n\n* Item 1\n* Item 2\n\n**Bold text**',
        }),
      });

      const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');

      expect(result.content).toBeDefined();
    });

    it('should handle different recommendation decisions', async () => {
      const decisions = ['hire', 'consider', 'reject', 'interview'] as const;

      for (const decision of decisions) {
        const reportData = createMockReportDocument({
          recommendation: createMockRecommendation({ decision }),
        });

        const result = await service.generateReportInFormat(reportData, 'pdf', 'individual');
        expect(result.content).toBeDefined();
      }
    });
  });
});
