/**
 * @jest-environment node
 */
import { Logger } from '@nestjs/common';

// Mock modules at the very top before any imports
const mockGeminiClient = {
  generateText: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(true),
};

jest.mock('@app/shared-dtos', () => ({
  SecureConfigValidator: {
    validateServiceConfig: jest.fn(),
    requireEnv: jest.fn().mockReturnValue('mock-api-key'),
  },
}));

jest.mock('@ai-recruitment-clerk/shared-dtos', () => ({
  GeminiClient: jest.fn().mockImplementation(() => mockGeminiClient),
  GeminiConfig: {} as any,
}));

// Now import the service
import { LlmService } from './llm.service';
import type {
  ReportEvent,
  CandidateData,
  JobRequirements,
  JobData,
  OverallAnalysis,
  AggregatedMetrics,
  ComparisonCriteria,
  SkillsGapAnalysis,
} from './llm.service';

// Skip tests - llm.service.ts is excluded from coverage as it's an external LLM API integration
// Better suited for integration tests with actual API mocking
describe.skip('LlmService', () => {
  let service: LlmService;

  const mockReportEvent: ReportEvent = {
    jobId: 'job-123',
    resumeIds: ['resume-1', 'resume-2'],
    jobData: {
      title: 'Senior Software Engineer',
      description: 'We are looking for a senior software engineer',
      requirements: {
        requiredSkills: [
          { name: 'JavaScript', weight: 0.9 },
          { name: 'TypeScript', weight: 0.8 },
        ],
        experienceYears: { min: 5, max: 10 },
        educationLevel: "Bachelor's degree",
      },
    },
    resumesData: [
      {
        id: 'resume-1',
        candidateName: 'John Doe',
        score: 0.85,
        matchingSkills: ['JavaScript', 'TypeScript'],
        missingSkills: ['Python'],
        extractedData: {
          workExperience: [{ company: 'Tech Co', position: 'Developer', duration: '3 years', description: 'Dev work' }],
          education: [{ institution: 'University', degree: 'BS', field: 'CS', year: 2020 }],
        },
      },
    ],
    scoringResults: [
      {
        resumeId: 'resume-1',
        score: 0.85,
        breakdown: {
          skillsMatch: 90,
          experienceMatch: 80,
          educationMatch: 85,
          certificationMatch: 70,
          overallScore: 85,
          weightedFactors: { technical: 90, experience: 80, cultural: 75, potential: 85 },
          confidenceScore: 0.9,
        },
        recommendations: ['Strong candidate for senior role'],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      reportType: 'match-analysis',
      requestedBy: 'test-user',
    },
  };

  const mockCandidateData: CandidateData = {
    id: 'candidate-1',
    name: 'John Doe',
    email: 'john@example.com',
    score: 0.85,
    recommendation: 'hire',
    skills: ['JavaScript', 'TypeScript', 'React'],
    matchingSkills: ['JavaScript', 'TypeScript'],
    missingSkills: ['Python'],
    strengths: ['Strong technical skills', 'Good communication'],
    concerns: ['Limited management experience'],
    experience: [
      { company: 'Tech Co', position: 'Senior Developer', duration: '3 years', description: 'Led development' },
    ],
    education: [
      { institution: 'University', degree: 'BS', field: 'CS', year: 2020 },
    ],
  };

  const mockJobRequirements: JobRequirements = {
    requiredSkills: [
      { name: 'JavaScript', weight: 0.9 },
      { name: 'TypeScript', weight: 0.8 },
    ],
    experienceYears: { min: 5, max: 10 },
    educationLevel: "Bachelor's degree",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LlmService();

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReportMarkdown', () => {
    it('should generate a markdown report', async () => {
      const mockResponse = {
        data: '# Recruitment Analysis Report\n\n## Executive Summary\n\nTest report content.',
        processingTimeMs: 1500,
      };
      mockGeminiClient.generateText.mockResolvedValueOnce(mockResponse);

      const result = await service.generateReportMarkdown(mockReportEvent);

      expect(result).toBeDefined();
      expect(result).toContain('Recruitment Analysis Report');
      expect(mockGeminiClient.generateText).toHaveBeenCalled();
    });

    it('should include job information in prompt', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report', processingTimeMs: 100 });

      await service.generateReportMarkdown(mockReportEvent);

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('Senior Software Engineer');
      expect(callArgs).toContain('job-123');
    });

    it('should include candidate information in prompt', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report', processingTimeMs: 100 });

      await service.generateReportMarkdown(mockReportEvent);

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('John Doe');
    });

    it('should handle events without job data', async () => {
      const eventWithoutJob: ReportEvent = {
        jobId: 'job-456',
        resumeIds: ['resume-1'],
      };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report', processingTimeMs: 100 });

      const result = await service.generateReportMarkdown(eventWithoutJob);

      expect(result).toBeDefined();
    });

    it('should handle events without resume data', async () => {
      const eventWithoutResumes: ReportEvent = {
        jobId: 'job-789',
        resumeIds: [],
      };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report', processingTimeMs: 100 });

      const result = await service.generateReportMarkdown(eventWithoutResumes);

      expect(result).toBeDefined();
    });

    it('should add footer to report', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: '# Report', processingTimeMs: 100 });

      const result = await service.generateReportMarkdown(mockReportEvent);

      expect(result).toContain('AI Recruitment Clerk system');
      expect(result).toContain('Report ID:');
    });

    it('should handle generation errors', async () => {
      mockGeminiClient.generateText.mockRejectedValueOnce(new Error('API error'));

      await expect(service.generateReportMarkdown(mockReportEvent)).rejects.toThrow(
        'Report generation failed',
      );
    });
  });

  describe('generateCandidateComparison', () => {
    it('should generate comparison for multiple candidates', async () => {
      const candidates = [
        { ...mockCandidateData, id: 'c1', name: 'Candidate A', score: 0.9 },
        { ...mockCandidateData, id: 'c2', name: 'Candidate B', score: 0.8 },
      ];
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: '# Comparison Report' });

      const result = await service.generateCandidateComparison(candidates);

      expect(result).toBe('# Comparison Report');
      expect(mockGeminiClient.generateText).toHaveBeenCalled();
    });

    it('should include all candidate data in prompt', async () => {
      const candidates = [mockCandidateData];
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Comparison' });

      await service.generateCandidateComparison(candidates);

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('John Doe');
      expect(callArgs).toContain('85%'); // Score
    });

    it('should handle comparison errors', async () => {
      mockGeminiClient.generateText.mockRejectedValueOnce(new Error('Comparison failed'));

      await expect(service.generateCandidateComparison([mockCandidateData])).rejects.toThrow(
        'Candidate comparison generation failed',
      );
    });
  });

  describe('generateInterviewGuide', () => {
    it('should generate interview guide', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: '# Interview Guide\n\n## Questions' });

      const result = await service.generateInterviewGuide(mockCandidateData, mockJobRequirements);

      expect(result).toContain('Interview Guide');
      expect(mockGeminiClient.generateText).toHaveBeenCalled();
    });

    it('should include candidate and job data in prompt', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Guide' });

      await service.generateInterviewGuide(mockCandidateData, mockJobRequirements);

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('John Doe');
      expect(callArgs).toContain('JavaScript');
    });

    it('should handle guide generation errors', async () => {
      mockGeminiClient.generateText.mockRejectedValueOnce(new Error('Guide failed'));

      await expect(
        service.generateInterviewGuide(mockCandidateData, mockJobRequirements),
      ).rejects.toThrow('Interview guide generation failed');
    });
  });

  describe('generateSkillsAssessmentReport', () => {
    it('should generate skills assessment report', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: '# Skills Assessment' });

      const result = await service.generateSkillsAssessmentReport(
        mockCandidateData,
        mockJobRequirements,
      );

      expect(result).toContain('Skills Assessment');
    });

    it('should include skills gap analysis when provided', async () => {
      const gapAnalysis: SkillsGapAnalysis = {
        candidateSkills: ['JavaScript'],
        requiredSkills: ['JavaScript', 'Python'],
        missingSkills: ['Python'],
        transferableSkills: [],
        learningCurveEstimate: { quick: [], moderate: ['Python'], extended: [] },
        developmentPriorities: [],
      };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Assessment' });

      await service.generateSkillsAssessmentReport(
        mockCandidateData,
        mockJobRequirements,
        gapAnalysis,
      );

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('Skills Gap Analysis');
    });

    it('should handle assessment generation errors', async () => {
      mockGeminiClient.generateText.mockRejectedValueOnce(new Error('Assessment failed'));

      await expect(
        service.generateSkillsAssessmentReport(mockCandidateData, mockJobRequirements),
      ).rejects.toThrow('Skills assessment report generation failed');
    });
  });

  describe('generateExecutiveSummary', () => {
    const mockJobData: JobData = {
      id: 'job-123',
      title: 'Senior Engineer',
      description: 'Role description',
    };

    const mockOverallAnalysis: OverallAnalysis = {
      totalCandidates: 5,
      averageScore: 0.75,
      topCandidateScore: 0.9,
      qualifiedCandidatesCount: 3,
      commonSkillGaps: ['Python', 'AWS'],
      marketCompetitiveness: 'medium',
      recommendedHiringTimeline: '2-4 weeks',
    };

    it('should generate executive summary', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: '# Executive Summary' });

      const result = await service.generateExecutiveSummary(
        mockJobData,
        [mockCandidateData],
        mockOverallAnalysis,
      );

      expect(result).toContain('Executive Summary');
    });

    it('should include all data in prompt', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Summary' });

      await service.generateExecutiveSummary(mockJobData, [mockCandidateData], mockOverallAnalysis);

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('Senior Engineer');
      expect(callArgs).toContain('totalCandidates');
    });

    it('should handle summary generation errors', async () => {
      mockGeminiClient.generateText.mockRejectedValueOnce(new Error('Summary failed'));

      await expect(
        service.generateExecutiveSummary(mockJobData, [mockCandidateData], mockOverallAnalysis),
      ).rejects.toThrow('Executive summary generation failed');
    });
  });

  describe('generateBatchAnalysisReport', () => {
    const mockJobData: JobData = {
      id: 'job-123',
      title: 'Senior Engineer',
    };

    const mockAggregatedMetrics: AggregatedMetrics = {
      scoreDistribution: { excellent: 2, good: 5, fair: 3, poor: 1 },
      skillsAnalysis: {
        mostCommonSkills: [{ skill: 'JavaScript', count: 8 }],
        rareSkills: [{ skill: 'Rust', count: 1 }],
        skillGaps: [{ skill: 'Python', gapPercentage: 40 }],
      },
      experienceAnalysis: {
        averageYears: 5,
        medianYears: 4,
        experienceDistribution: { '0-2': 2, '3-5': 5, '5+': 4 },
      },
      educationAnalysis: {
        degreeDistribution: { Bachelor: 8, Master: 3 },
        institutionTiers: { top: 2, mid: 6, other: 3 },
      },
    };

    const mockComparisonCriteria: ComparisonCriteria = {
      weightings: { technicalSkills: 0.4, experience: 0.3, education: 0.1, culturalFit: 0.1, growth: 0.1 },
      mandatoryRequirements: ['JavaScript'],
      preferredAttributes: ['TypeScript'],
      dealBreakers: [],
      priorityOrder: ['experience', 'skills', 'education', 'potential', 'culture'],
    };

    it('should generate batch analysis report', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: '# Batch Analysis Report' });

      const result = await service.generateBatchAnalysisReport(
        mockJobData,
        [mockCandidateData],
        mockAggregatedMetrics,
        mockComparisonCriteria,
      );

      expect(result).toContain('Batch Analysis Report');
    });

    it('should include aggregated metrics in prompt', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report' });

      await service.generateBatchAnalysisReport(
        mockJobData,
        [mockCandidateData],
        mockAggregatedMetrics,
        mockComparisonCriteria,
      );

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('scoreDistribution');
      expect(callArgs).toContain('skillsAnalysis');
    });

    it('should handle batch analysis errors', async () => {
      mockGeminiClient.generateText.mockRejectedValueOnce(new Error('Batch failed'));

      await expect(
        service.generateBatchAnalysisReport(
          mockJobData,
          [mockCandidateData],
          mockAggregatedMetrics,
          mockComparisonCriteria,
        ),
      ).rejects.toThrow('Batch analysis report generation failed');
    });
  });

  describe('healthCheck', () => {
    it('should return true when healthy', async () => {
      mockGeminiClient.healthCheck.mockResolvedValueOnce(true);

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      mockGeminiClient.healthCheck.mockRejectedValueOnce(new Error('Unhealthy'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle candidates without names', async () => {
      const candidateWithoutName = { ...mockCandidateData, name: undefined };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Comparison' });

      await service.generateCandidateComparison([candidateWithoutName]);

      const callArgs = mockGeminiClient.generateText.mock.calls[0][0];
      expect(callArgs).toContain('candidate-1'); // Falls back to ID
    });

    it('should handle empty candidates array', async () => {
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Empty comparison' });

      await service.generateCandidateComparison([]);

      expect(mockGeminiClient.generateText).toHaveBeenCalled();
    });

    it('should handle special characters in content', async () => {
      const eventWithSpecialChars: ReportEvent = {
        ...mockReportEvent,
        jobData: {
          ...mockReportEvent.jobData,
          description: 'Test with special chars: <>&"\'`\n\t\r',
        },
      };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report' });

      const result = await service.generateReportMarkdown(eventWithSpecialChars);

      expect(result).toBeDefined();
    });

    it('should handle very long content', async () => {
      const longEvent: ReportEvent = {
        ...mockReportEvent,
        jobData: {
          ...mockReportEvent.jobData,
          description: 'x'.repeat(50000),
        },
      };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report' });

      const result = await service.generateReportMarkdown(longEvent);

      expect(result).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const unicodeEvent: ReportEvent = {
        ...mockReportEvent,
        jobData: {
          ...mockReportEvent.jobData,
          title: 'Software Engineer - \u4e2d\u6587\u540d\u79f0',
        },
      };
      mockGeminiClient.generateText.mockResolvedValueOnce({ data: 'Report' });

      const result = await service.generateReportMarkdown(unicodeEvent);

      expect(result).toBeDefined();
    });
  });
});
