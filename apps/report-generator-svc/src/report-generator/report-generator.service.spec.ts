import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ReportGeneratorService,
  MatchScoredEvent,
  ReportGenerationRequest,
  GeneratedReport,
  ReportDataItem,
  JobData,
  ResumeData,
  ScoringData,
  ReportDocument,
  CandidateComparisonData,
  InterviewCandidateData,
  ExtractedJobRequirements,
} from './report-generator.service';
import { LlmService } from './llm.service';
import { GridFsService, ReportFileMetadata } from './gridfs.service';
import { ReportRepository, ReportCreateData } from './report.repository';
import {
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
  ReportDocument as SchemaReportDocument,
} from '../schemas/report.schema';
import {
  ReportGeneratorException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';

// Mock ErrorCorrelationManager
jest.mock('@ai-recruitment-clerk/infrastructure-shared', () => ({
  ReportGeneratorException: jest.fn().mockImplementation((message, details) => {
    const error = new Error(message);
    error.name = 'ReportGeneratorException';
    (error as any).details = details;
    return error;
  }),
  ErrorCorrelationManager: {
    getContext: jest.fn(() => ({ traceId: 'test-trace-id' })),
  },
}));

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  let llmService: jest.Mocked<LlmService>;
  let gridFsService: jest.Mocked<GridFsService>;
  let reportRepository: jest.Mocked<ReportRepository>;

  // Test data factories
  const createMockJobData = (overrides: Partial<JobData> = {}): JobData => ({
    jobId: 'test-job-id',
    title: 'Senior Software Engineer',
    description: 'Looking for an experienced software engineer',
    requirements: {
      requiredSkills: [
        { name: 'JavaScript', weight: 0.8 },
        { name: 'TypeScript', weight: 0.9 },
        { name: 'Node.js', weight: 0.7 },
      ],
      experienceYears: { min: 3, max: 8 },
      educationLevel: 'bachelor',
      location: 'Remote',
      department: 'Engineering',
      employmentType: 'full-time',
    },
    companyInfo: {
      name: 'Tech Corp',
      industry: 'Technology',
      size: '100-500',
    },
    ...overrides,
  });

  const createMockResumeData = (
    overrides: Partial<ResumeData> = {},
  ): ResumeData => ({
    resumeId: 'test-resume-id',
    candidateName: 'John Doe',
    extractedData: {
      personalInfo: {
        email: 'john.doe@email.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
      },
      workExperience: [
        {
          position: 'Software Developer',
          company: 'Previous Corp',
          duration: '2020-2023',
          description: 'Developed web applications',
          skills: ['JavaScript', 'React', 'Node.js'],
        },
      ],
      education: [
        {
          degree: 'bachelor',
          school: 'University of Technology',
          year: '2020',
          field: 'Computer Science',
        },
      ],
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      certifications: [
        {
          name: 'AWS Certified Developer',
          issuer: 'Amazon Web Services',
          date: '2022',
        },
      ],
      projects: [
        {
          name: 'E-commerce Platform',
          description: 'Built a scalable e-commerce platform',
          technologies: ['React', 'Node.js', 'MongoDB'],
        },
      ],
    },
    parsedAt: new Date(),
    fileUrl: 'https://example.com/resume.pdf',
    ...overrides,
  });

  const createMockScoringData = (
    overrides: Partial<ScoringData> = {},
  ): ScoringData => ({
    resumeId: 'test-resume-id',
    jobId: 'test-job-id',
    overallScore: 85,
    skillsScore: 80,
    experienceScore: 90,
    educationScore: 85,
    culturalFitScore: 75,
    breakdown: {
      skillsMatch: 80,
      experienceMatch: 90,
      educationMatch: 85,
      overallFit: 85,
    },
    matchingSkills: [
      {
        skill: 'JavaScript',
        matchScore: 0.95,
        matchType: 'exact',
        explanation: 'Perfect match for required skill',
      },
      {
        skill: 'TypeScript',
        matchScore: 0.85,
        matchType: 'exact',
        explanation: 'Strong match for required skill',
      },
    ],
    recommendations: {
      decision: 'hire',
      reasoning: 'Strong technical background with relevant experience',
      strengths: ['Strong JavaScript skills', 'Good experience level'],
      concerns: ['Limited leadership experience'],
      suggestions: ['Consider for technical interview'],
    },
    analysisConfidence: 0.92,
    processingTimeMs: 1500,
    scoredAt: new Date(),
    ...overrides,
  });

  const createMockMatchScoredEvent = (
    overrides: Partial<MatchScoredEvent> = {},
  ): MatchScoredEvent => ({
    jobId: 'test-job-id',
    resumeId: 'test-resume-id',
    scoreDto: createMockScoringData(),
    jobData: createMockJobData(),
    resumeData: createMockResumeData(),
    metadata: {
      requestedBy: 'test-user',
      generatedAt: new Date(),
      reportType: 'match-analysis',
    },
    ...overrides,
  });

  const createMockReportDocument = (overrides: Partial<any> = {}): any => ({
    _id: new Types.ObjectId(),
    jobId: 'test-job-id',
    resumeId: 'test-resume-id',
    scoreBreakdown: {
      skillsMatch: 80,
      experienceMatch: 90,
      educationMatch: 85,
      overallFit: 85,
    },
    skillsAnalysis: [
      {
        skill: 'JavaScript',
        matchScore: 0.95,
        matchType: 'exact',
        explanation: 'Perfect match',
      },
    ],
    recommendation: {
      decision: 'hire',
      reasoning: 'Strong candidate',
      strengths: ['Technical skills'],
      concerns: [],
      suggestions: ['Interview recommended'],
    },
    summary: 'Strong technical candidate with relevant experience',
    analysisConfidence: 0.92,
    processingTimeMs: 1500,
    status: 'completed',
    generatedBy: 'report-generator-service',
    llmModel: 'gemini-1.5-flash',
    generatedAt: new Date(),
    detailedReportUrl: '/api/reports/file/test-file-id',
    save: jest.fn().mockResolvedValue(this),
    toObject: jest.fn().mockReturnValue(this),
    ...overrides,
  });

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGeneratorService,
        {
          provide: LlmService,
          useValue: {
            generateReportMarkdown: jest.fn(),
            generateCandidateComparison: jest.fn(),
            generateInterviewGuide: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: GridFsService,
          useValue: {
            saveReport: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: ReportRepository,
          useValue: {
            createReport: jest.fn(),
            updateResumeRecord: jest.fn(),
            findReport: jest.fn(),
            getReportAnalytics: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportGeneratorService>(ReportGeneratorService);
    llmService = module.get<jest.Mocked<LlmService>>(LlmService);
    gridFsService = module.get<jest.Mocked<GridFsService>>(GridFsService);
    reportRepository =
      module.get<jest.Mocked<ReportRepository>>(ReportRepository);

    // Suppress console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleMatchScored', () => {
    it('should successfully process match scored event', async () => {
      // Arrange
      const event = createMockMatchScoredEvent();
      const mockMarkdown =
        '# Analysis Report\n\nCandidate shows strong potential...';
      const mockFileId = 'test-file-id-123';
      const mockReportId = new Types.ObjectId();

      llmService.generateReportMarkdown.mockResolvedValue(mockMarkdown);
      gridFsService.saveReport.mockResolvedValue(mockFileId);
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument({
          _id: mockReportId,
        }),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(llmService.generateReportMarkdown).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: event.jobId,
          resumeIds: [event.resumeId],
          jobData: expect.any(Object),
          resumesData: expect.any(Array),
          scoringResults: expect.any(Array),
          metadata: expect.any(Object),
        }),
      );

      expect(gridFsService.saveReport).toHaveBeenCalledWith(
        mockMarkdown,
        expect.stringContaining('match-analysis'),
        expect.objectContaining({
          reportType: 'markdown',
          jobId: event.jobId,
          resumeId: event.resumeId,
          generatedBy: 'report-generator-service',
          mimeType: 'text/markdown',
          encoding: 'utf-8',
        }),
      );

      expect(reportRepository.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: event.jobId,
          resumeId: event.resumeId,
          scoreBreakdown: expect.any(Object),
          skillsAnalysis: expect.any(Array),
          recommendation: expect.any(Object),
          summary: expect.any(String),
          analysisConfidence: event.scoreDto.analysisConfidence,
          generatedBy: 'report-generator-service',
          llmModel: 'gemini-1.5-flash',
          detailedReportUrl: `/api/reports/file/${mockFileId}`,
        }),
      );

      expect(reportRepository.updateResumeRecord).toHaveBeenCalledWith(
        event.resumeId,
        expect.objectContaining({
          status: 'completed',
          reportGridFsId: mockFileId,
          processingTimeMs: expect.any(Number),
        }),
      );
    });

    it('should handle missing event data gracefully', async () => {
      // Arrange
      const invalidEvent = {
        jobId: '',
        resumeId: 'test-resume-id',
        scoreDto: null,
      } as any;

      // Act & Assert
      await expect(service.handleMatchScored(invalidEvent)).rejects.toThrow();
      expect(ReportGeneratorException).toHaveBeenCalledWith(
        'INVALID_EVENT_DATA',
        expect.objectContaining({
          provided: {
            scoreDto: false,
            jobId: false,
            resumeId: true,
          },
          correlationId: 'test-trace-id',
        }),
      );
    });

    it('should handle LLM service failure', async () => {
      // Arrange
      const event = createMockMatchScoredEvent();
      const llmError = new Error('LLM service unavailable');

      llmService.generateReportMarkdown.mockRejectedValue(llmError);
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act & Assert
      await expect(service.handleMatchScored(event)).rejects.toThrow(
        'LLM service unavailable',
      );

      expect(reportRepository.updateResumeRecord).toHaveBeenCalledWith(
        event.resumeId,
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'LLM service unavailable',
          processingTimeMs: expect.any(Number),
        }),
      );
    });

    it('should handle GridFS save failure', async () => {
      // Arrange
      const event = createMockMatchScoredEvent();
      const mockMarkdown = '# Analysis Report';
      const gridFsError = new Error('GridFS storage failed');

      llmService.generateReportMarkdown.mockResolvedValue(mockMarkdown);
      gridFsService.saveReport.mockRejectedValue(gridFsError);
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act & Assert
      await expect(service.handleMatchScored(event)).rejects.toThrow(
        'GridFS storage failed',
      );

      expect(reportRepository.updateResumeRecord).toHaveBeenCalledWith(
        event.resumeId,
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'GridFS storage failed',
        }),
      );
    });

    it('should handle database save failure', async () => {
      // Arrange
      const event = createMockMatchScoredEvent();
      const mockMarkdown = '# Analysis Report';
      const mockFileId = 'test-file-id';
      const dbError = new Error('Database connection failed');

      llmService.generateReportMarkdown.mockResolvedValue(mockMarkdown);
      gridFsService.saveReport.mockResolvedValue(mockFileId);
      reportRepository.createReport.mockRejectedValue(dbError);
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act & Assert
      await expect(service.handleMatchScored(event)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should process event with minimal data', async () => {
      // Arrange
      const minimalEvent = createMockMatchScoredEvent({
        jobData: undefined,
        resumeData: undefined,
        metadata: undefined,
      });

      llmService.generateReportMarkdown.mockResolvedValue('# Minimal Report');
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(minimalEvent);

      // Assert
      expect(llmService.generateReportMarkdown).toHaveBeenCalled();
      expect(gridFsService.saveReport).toHaveBeenCalled();
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      // Arrange
      const request: ReportGenerationRequest = {
        jobId: 'test-job-id',
        resumeIds: ['resume-1', 'resume-2'],
        reportType: 'comparison',
        outputFormats: ['markdown', 'pdf'],
        options: {
          includeInterviewGuide: true,
          requestedBy: 'test-user',
        },
      };

      const mockReportId = new Types.ObjectId();
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument({
          _id: mockReportId,
        }),
      );

      // Act
      const result = await service.generateReport(request);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          reportId: mockReportId.toString(),
          jobId: request.jobId,
          resumeIds: request.resumeIds,
          reportType: request.reportType,
          files: expect.any(Array),
          metadata: expect.objectContaining({
            generatedAt: expect.any(Date),
            processingTimeMs: expect.any(Number),
            generatedBy: 'report-generator-service',
          }),
          summary: expect.any(String),
        }),
      );

      expect(reportRepository.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: request.jobId,
          resumeId: request.resumeIds[0],
          generatedBy: 'report-generator-service',
          llmModel: 'gemini-1.5-flash',
          requestedBy: request.options?.requestedBy,
        }),
      );
    });

    it('should validate request parameters', async () => {
      // Arrange
      const invalidRequest = {
        jobId: '',
        resumeIds: [],
        reportType: 'invalid',
        outputFormats: ['pdf'],
      } as any;

      // Act & Assert
      await expect(service.generateReport(invalidRequest)).rejects.toThrow();
      expect(ReportGeneratorException).toHaveBeenCalledWith(
        'INVALID_REPORT_REQUEST',
        expect.objectContaining({
          provided: {
            jobId: false,
            resumeIds: [],
            resumeCount: 0,
          },
          correlationId: 'test-trace-id',
        }),
      );
    });

    it('should handle single resume report generation', async () => {
      // Arrange
      const singleResumeRequest: ReportGenerationRequest = {
        jobId: 'test-job-id',
        resumeIds: ['resume-1'],
        reportType: 'individual',
        outputFormats: ['markdown'],
      };

      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );

      // Act
      const result = await service.generateReport(singleResumeRequest);

      // Assert
      expect(result.resumeIds).toEqual(['resume-1']);
      expect(result.reportType).toBe('individual');
    });

    it('should handle multiple output formats', async () => {
      // Arrange
      const multiFormatRequest: ReportGenerationRequest = {
        jobId: 'test-job-id',
        resumeIds: ['resume-1'],
        reportType: 'individual',
        outputFormats: ['markdown', 'html', 'pdf', 'json'],
      };

      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );

      // Act
      const result = await service.generateReport(multiFormatRequest);

      // Assert
      expect(result.files).toHaveLength(4);
      expect(result.files.map((f) => f.format)).toEqual([
        'markdown',
        'html',
        'pdf',
        'json',
      ]);
    });
  });

  describe('generateCandidateComparison', () => {
    it('should generate comparison for multiple candidates', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeIds = ['resume-1', 'resume-2', 'resume-3'];
      const mockComparison =
        '# Candidate Comparison\n\nCandidate 1 shows stronger technical skills...';

      const mockReports = resumeIds.map((resumeId, index) =>
        createMockReportDocument({
          resumeId,
          scoreBreakdown: {
            skillsMatch: 80 + index * 5,
            experienceMatch: 75 + index * 3,
            educationMatch: 85,
            overallFit: 80 + index * 4,
          },
        }),
      );

      reportRepository.findReport
        .mockResolvedValueOnce(mockReports[0])
        .mockResolvedValueOnce(mockReports[1])
        .mockResolvedValueOnce(mockReports[2]);

      llmService.generateCandidateComparison.mockResolvedValue(mockComparison);

      // Act
      const result = await service.generateCandidateComparison(
        jobId,
        resumeIds,
      );

      // Assert
      expect(result).toBe(mockComparison);
      expect(reportRepository.findReport).toHaveBeenCalledTimes(3);
      expect(llmService.generateCandidateComparison).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'resume-1',
            name: 'Candidate resume-1',
            score: expect.any(Number),
            skills: expect.any(Array),
            recommendation: expect.any(String),
          }),
        ]),
      );
    });

    it('should handle insufficient candidates error', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeIds = ['resume-1'];

      reportRepository.findReport.mockResolvedValue(createMockReportDocument());

      // Act & Assert
      await expect(
        service.generateCandidateComparison(jobId, resumeIds),
      ).rejects.toThrow();
      expect(ReportGeneratorException).toHaveBeenCalledWith(
        'INSUFFICIENT_CANDIDATES',
        expect.objectContaining({
          provided: 1,
          required: 2,
          jobId,
        }),
      );
    });

    it('should handle missing reports gracefully', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeIds = ['resume-1', 'resume-2', 'resume-3'];

      reportRepository.findReport
        .mockResolvedValueOnce(createMockReportDocument())
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockReportDocument());

      llmService.generateCandidateComparison.mockResolvedValue('# Comparison');

      // Act
      const result = await service.generateCandidateComparison(
        jobId,
        resumeIds,
      );

      // Assert
      expect(result).toBe('# Comparison');
      expect(llmService.generateCandidateComparison).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'resume-1' }),
          expect.objectContaining({ id: 'resume-3' }),
        ]),
      );
    });

    it('should handle LLM service failure in comparison', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeIds = ['resume-1', 'resume-2'];
      const llmError = new Error('LLM comparison failed');

      reportRepository.findReport
        .mockResolvedValueOnce(createMockReportDocument())
        .mockResolvedValueOnce(createMockReportDocument());

      llmService.generateCandidateComparison.mockRejectedValue(llmError);

      // Act & Assert
      await expect(
        service.generateCandidateComparison(jobId, resumeIds),
      ).rejects.toThrow('LLM comparison failed');
    });
  });

  describe('generateInterviewGuide', () => {
    it('should generate interview guide successfully', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeId = 'test-resume-id';
      const mockGuide =
        '# Interview Guide\n\n## Technical Questions\n1. Tell me about your JavaScript experience...';

      const mockReport = createMockReportDocument();
      reportRepository.findReport.mockResolvedValue(mockReport);
      llmService.generateInterviewGuide.mockResolvedValue(mockGuide);

      // Act
      const result = await service.generateInterviewGuide(jobId, resumeId);

      // Assert
      expect(result).toBe(mockGuide);
      expect(reportRepository.findReport).toHaveBeenCalledWith({
        jobId,
        resumeId,
      });
      expect(llmService.generateInterviewGuide).toHaveBeenCalledWith(
        expect.objectContaining({
          id: resumeId,
          name: `Candidate ${resumeId}`,
          score: expect.any(Number),
          recommendation: expect.any(String),
          skills: expect.any(Array),
          strengths: expect.any(Array),
          concerns: expect.any(Array),
        }),
        expect.objectContaining({
          requiredSkills: expect.any(Array),
        }),
      );
    });

    it('should handle missing report for interview guide', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeId = 'test-resume-id';

      reportRepository.findReport.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateInterviewGuide(jobId, resumeId),
      ).rejects.toThrow();
      expect(ReportGeneratorException).toHaveBeenCalledWith(
        'REPORT_NOT_FOUND',
        expect.objectContaining({
          jobId,
          resumeId,
        }),
      );
    });

    it('should handle interview guide generation with options', async () => {
      // Arrange
      const jobId = 'test-job-id';
      const resumeId = 'test-resume-id';
      const options = { requestedBy: 'hiring-manager' };
      const mockGuide = '# Interview Guide';

      reportRepository.findReport.mockResolvedValue(createMockReportDocument());
      llmService.generateInterviewGuide.mockResolvedValue(mockGuide);

      // Act
      const result = await service.generateInterviewGuide(
        jobId,
        resumeId,
        options,
      );

      // Assert
      expect(result).toBe(mockGuide);
    });
  });

  describe('getReportAnalytics', () => {
    it('should return analytics from repository', async () => {
      // Arrange
      const mockAnalytics = {
        totalReports: 150,
        reportsByStatus: {
          completed: 120,
          pending: 20,
          failed: 10,
        },
        reportsByRecommendation: {
          hire: 50,
          consider: 60,
          interview: 30,
          reject: 10,
        },
        averageProcessingTime: 2500,
        averageConfidenceScore: 0.85,
        reportsGeneratedToday: 25,
        topPerformingCandidates: [
          {
            resumeId: 'top-candidate-1',
            overallScore: 95,
            recommendation: 'hire',
          },
        ],
      };

      reportRepository.getReportAnalytics.mockResolvedValue(mockAnalytics);

      // Act
      const result = await service.getReportAnalytics();

      // Assert
      expect(result).toEqual(mockAnalytics);
      expect(reportRepository.getReportAnalytics).toHaveBeenCalledWith({});
    });

    it('should pass filters to repository', async () => {
      // Arrange
      const filters = {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        reportType: 'individual',
      };

      reportRepository.getReportAnalytics.mockResolvedValue({
        totalReports: 0,
        reportsByStatus: {},
        reportsByRecommendation: {},
        averageProcessingTime: 0,
        averageConfidenceScore: 0,
        reportsGeneratedToday: 0,
        topPerformingCandidates: [],
      });

      // Act
      await service.getReportAnalytics(filters);

      // Assert
      expect(reportRepository.getReportAnalytics).toHaveBeenCalledWith(filters);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are healthy', async () => {
      // Arrange
      llmService.healthCheck.mockResolvedValue(true);
      gridFsService.healthCheck.mockResolvedValue(true);
      reportRepository.healthCheck.mockResolvedValue({
        status: 'healthy',
        count: 100,
        performance: null,
      });

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        details: {
          llmService: true,
          gridFsService: true,
          reportRepository: true,
        },
      });
    });

    it('should return degraded status when some services are unhealthy', async () => {
      // Arrange
      llmService.healthCheck.mockResolvedValue(false);
      gridFsService.healthCheck.mockResolvedValue(true);
      reportRepository.healthCheck.mockResolvedValue({
        status: 'healthy',
        count: 100,
        performance: null,
      });

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'degraded',
        details: {
          llmService: false,
          gridFsService: true,
          reportRepository: true,
        },
      });
    });

    it('should handle repository returning non-boolean health status', async () => {
      // Arrange
      llmService.healthCheck.mockResolvedValue(true);
      gridFsService.healthCheck.mockResolvedValue(true);
      reportRepository.healthCheck.mockResolvedValue({
        connected: true,
        latency: 50,
      } as any);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        details: {
          llmService: true,
          gridFsService: true,
          reportRepository: true,
        },
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle correlation context when available', async () => {
      // Arrange
      const mockContext = { traceId: 'custom-trace-id', spanId: 'span-123' };
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(
        mockContext,
      );

      const invalidEvent = {
        jobId: '',
        resumeId: 'test-resume-id',
        scoreDto: null,
      } as any;

      // Act & Assert
      await expect(service.handleMatchScored(invalidEvent)).rejects.toThrow();
      expect(ReportGeneratorException).toHaveBeenCalledWith(
        'INVALID_EVENT_DATA',
        expect.objectContaining({
          correlationId: 'custom-trace-id',
        }),
      );
    });

    it('should handle correlation context when not available', async () => {
      // Arrange
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      const invalidEvent = {
        jobId: '',
        resumeId: 'test-resume-id',
        scoreDto: null,
      } as any;

      // Act & Assert
      await expect(service.handleMatchScored(invalidEvent)).rejects.toThrow();
      expect(ReportGeneratorException).toHaveBeenCalledWith(
        'INVALID_EVENT_DATA',
        expect.objectContaining({
          correlationId: undefined,
        }),
      );
    });

    it('should handle empty scoring data gracefully', async () => {
      // Arrange
      const event = createMockMatchScoredEvent({
        scoreDto: {
          ...createMockScoringData(),
          matchingSkills: [],
          recommendations: {
            decision: 'consider',
            reasoning: '',
            strengths: [],
            concerns: [],
            suggestions: [],
          },
        },
      });

      llmService.generateReportMarkdown.mockResolvedValue('# Empty Report');
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(llmService.generateReportMarkdown).toHaveBeenCalled();
      expect(gridFsService.saveReport).toHaveBeenCalled();
    });

    it('should handle very large processing times', async () => {
      // Arrange
      const event = createMockMatchScoredEvent();

      llmService.generateReportMarkdown.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve('# Slow Report'), 100),
          ),
      );
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(reportRepository.updateResumeRecord).toHaveBeenCalledWith(
        event.resumeId,
        expect.objectContaining({
          status: 'completed',
          processingTimeMs: expect.any(Number),
        }),
      );
    });

    it('should handle malformed resume data', async () => {
      // Arrange
      const event = createMockMatchScoredEvent({
        resumeData: {
          ...createMockResumeData(),
          extractedData: {
            personalInfo: { email: 'invalid-email' },
            workExperience: [],
            education: [],
            skills: [],
          } as any,
        },
      });

      llmService.generateReportMarkdown.mockResolvedValue('# Report');
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(llmService.generateReportMarkdown).toHaveBeenCalledWith(
        expect.objectContaining({
          resumesData: expect.any(Array),
        }),
      );
    });

    it('should handle ObjectId serialization in report results', async () => {
      // Arrange
      const request: ReportGenerationRequest = {
        jobId: 'test-job-id',
        resumeIds: ['resume-1'],
        reportType: 'individual',
        outputFormats: ['pdf'],
      };

      const mockReportId = new Types.ObjectId();
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument({
          _id: mockReportId,
        }),
      );

      // Act
      const result = await service.generateReport(request);

      // Assert
      expect(result.reportId).toBe(mockReportId.toString());
      expect(typeof result.reportId).toBe('string');
    });

    it('should handle string _id in report results', async () => {
      // Arrange
      const request: ReportGenerationRequest = {
        jobId: 'test-job-id',
        resumeIds: ['resume-1'],
        reportType: 'individual',
        outputFormats: ['pdf'],
      };

      const stringId = 'string-report-id-123';
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument({
          _id: stringId as any,
        }),
      );

      // Act
      const result = await service.generateReport(request);

      // Assert
      expect(result.reportId).toBe(stringId);
    });
  });

  describe('Private Method Integration Tests', () => {
    it('should generate proper report filename format', async () => {
      // Arrange
      const event = createMockMatchScoredEvent();

      llmService.generateReportMarkdown.mockResolvedValue('# Report');
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(gridFsService.saveReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(
          /^match-analysis-test-job-id-test-resume-id-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/,
        ),
        expect.any(Object),
      );
    });

    it('should generate executive summary with proper format', async () => {
      // Arrange
      const event = createMockMatchScoredEvent({
        scoreDto: {
          ...createMockScoringData(),
          overallScore: 85,
          recommendations: {
            decision: 'hire',
            reasoning: 'Strong technical background',
            strengths: [
              'JavaScript expertise',
              'Good problem-solving skills',
              'Team collaboration',
            ],
            concerns: ['Limited leadership experience'],
            suggestions: ['Technical interview recommended'],
          },
        },
      });

      llmService.generateReportMarkdown.mockResolvedValue('# Report');
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(reportRepository.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.stringContaining('85% overall match'),
        }),
      );
    });

    it('should handle missing skills in resume data mapping', async () => {
      // Arrange
      const event = createMockMatchScoredEvent({
        resumeData: {
          ...createMockResumeData(),
          extractedData: {
            ...createMockResumeData().extractedData,
            skills: [],
          },
        },
      });

      llmService.generateReportMarkdown.mockResolvedValue('# Report');
      gridFsService.saveReport.mockResolvedValue('file-id');
      reportRepository.createReport.mockResolvedValue(
        createMockReportDocument(),
      );
      reportRepository.updateResumeRecord.mockResolvedValue(null);

      // Act
      await service.handleMatchScored(event);

      // Assert
      expect(llmService.generateReportMarkdown).toHaveBeenCalled();
    });
  });
});
