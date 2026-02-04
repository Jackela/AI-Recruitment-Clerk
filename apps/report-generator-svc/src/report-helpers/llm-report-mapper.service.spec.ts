import { LlmReportMapperService } from './llm-report-mapper.service';
import type { MatchScoredEvent, ScoringData } from '../report-generator/report-generator.service';

describe('LlmReportMapperService', () => {
  let service: LlmReportMapperService;

  const mockMatchScoredEvent: MatchScoredEvent = {
    jobId: 'job-123',
    resumeId: 'resume-123',
    scoreDto: {
      resumeId: 'resume-123',
      jobId: 'job-123',
      overallScore: 0.82,
      skillsScore: 85,
      experienceScore: 80,
      educationScore: 75,
      breakdown: {
        skillsMatch: 85,
        experienceMatch: 80,
        educationMatch: 75,
        overallFit: 82,
      },
      matchingSkills: [
        { skill: 'JavaScript', matchScore: 90, matchType: 'exact', explanation: 'Direct match' },
        { skill: 'Python', matchScore: 70, matchType: 'partial', explanation: 'Related' },
      ],
      recommendations: {
        decision: 'hire',
        reasoning: 'Strong candidate',
        strengths: ['Excellent skills', 'Good fit'],
        concerns: ['Limited management experience'],
        suggestions: ['Consider for senior role'],
      },
      analysisConfidence: 0.88,
      processingTimeMs: 1200,
      scoredAt: new Date(),
    },
    resumeData: {
      resumeId: 'resume-123',
      candidateName: 'John Doe',
      extractedData: {
        personalInfo: {
          email: 'john@example.com',
          phone: '+1234567890',
          location: 'San Francisco, CA',
        },
        workExperience: [],
        education: [],
        skills: ['JavaScript', 'Python'],
      },
      parsedAt: new Date(),
    },
    jobData: {
      jobId: 'job-123',
      title: 'Senior Developer',
      description: 'Senior software developer role',
      requirements: {
        requiredSkills: [{ name: 'JavaScript', weight: 1 }],
        experienceYears: { min: 5, max: 10 },
        educationLevel: 'bachelor',
      },
    },
    metadata: {
      requestedBy: 'user-123',
      reportType: 'detailed',
    },
  };

  beforeEach(() => {
    service = new LlmReportMapperService();
  });

  describe('buildReportEvent', () => {
    it('should build report event from match scored event', () => {
      const result = service.buildReportEvent(mockMatchScoredEvent);

      expect(result.jobId).toBe('job-123');
      expect(result.resumeIds).toEqual(['resume-123']);
      expect(result.jobData?.title).toBe('Senior Developer');
      expect(result.resumesData).toHaveLength(1);
      expect(result.scoringResults).toHaveLength(1);
      expect(result.metadata?.requestedBy).toBe('user-123');
    });

    it('should handle event without job data', () => {
      const eventWithoutJob = { ...mockMatchScoredEvent, jobData: undefined };
      const result = service.buildReportEvent(eventWithoutJob);

      expect(result.jobData).toBeUndefined();
      expect(result.jobId).toBe('job-123');
    });
  });

  describe('parseYear', () => {
    it('should parse valid year string', () => {
      expect(service.parseYear('2020')).toBe(2020);
    });

    it('should return current year for invalid input', () => {
      const currentYear = new Date().getFullYear();
      expect(service.parseYear('invalid')).toBe(currentYear);
    });
  });

  describe('convertToScoreBreakdown', () => {
    it('should convert scoring data to score breakdown', () => {
      const result = service.convertToScoreBreakdown(mockMatchScoredEvent.scoreDto);

      expect(result.skillsMatch).toBe(85);
      expect(result.experienceMatch).toBe(80);
      expect(result.educationMatch).toBe(75);
      expect(result.overallFit).toBe(82);
    });
  });

  describe('convertToMatchingSkills', () => {
    it('should convert matching skills', () => {
      const result = service.convertToMatchingSkills(
        mockMatchScoredEvent.scoreDto.matchingSkills,
      );

      expect(result).toHaveLength(2);
      expect(result[0].skill).toBe('JavaScript');
      expect(result[0].matchScore).toBe(90);
    });
  });

  describe('convertToReportRecommendation', () => {
    it('should convert recommendations', () => {
      const result = service.convertToReportRecommendation(
        mockMatchScoredEvent.scoreDto.recommendations,
      );

      expect(result.decision).toBe('hire');
      expect(result.reasoning).toBe('Strong candidate');
      expect(result.strengths).toEqual(['Excellent skills', 'Good fit']);
      expect(result.concerns).toEqual(['Limited management experience']);
    });
  });

  describe('generateExecutiveSummary', () => {
    it('should generate executive summary', () => {
      const result = service.generateExecutiveSummary(mockMatchScoredEvent);

      expect(result).toContain('82%'); // overall score
      expect(result).toContain('HIRE'); // decision
      expect(result).toContain('Excellent skills');
    });

    it('should handle concerns correctly', () => {
      const result = service.generateExecutiveSummary(mockMatchScoredEvent);

      expect(result).toContain('Limited management experience');
    });
  });

  describe('generateReportFilename', () => {
    it('should generate report filename with timestamp', () => {
      const result = service.generateReportFilename('match-analysis', 'job-123', 'resume-123', 'md');

      expect(result).toContain('match-analysis');
      expect(result).toContain('job-123');
      expect(result).toContain('resume-123');
      expect(result).toMatch(/\.md$/);
    });
  });

  describe('formatForInterviewGuide', () => {
    it('should format data for interview guide', () => {
      const candidateData = {
        id: 'cand-123',
        name: 'John Doe',
        skills: [
          { skill: 'JavaScript', matchScore: 90, matchType: 'exact', explanation: 'Match' },
        ],
        scoreBreakdown: { overallFit: 85 },
        recommendation: { decision: 'hire' },
        strengths: ['Strong skills'],
        concerns: [],
      };

      const jobRequirements = {
        requiredSkills: ['JavaScript', 'TypeScript'],
      };

      const result = service.formatForInterviewGuide(candidateData, jobRequirements);

      expect(result.llmCandidateData.id).toBe('cand-123');
      expect(result.llmCandidateData.name).toBe('John Doe');
      expect(result.llmJobRequirements.requiredSkills).toHaveLength(2);
    });
  });

  describe('mapRecommendationDecision', () => {
    it('should map hire to hire', () => {
      expect(service.mapRecommendationDecision('hire')).toBe('hire');
    });

    it('should map interview to consider', () => {
      expect(service.mapRecommendationDecision('interview')).toBe('consider');
    });

    it('should map reject to pass', () => {
      expect(service.mapRecommendationDecision('reject')).toBe('pass');
    });

    it('should map strong_hire to strong_hire', () => {
      expect(service.mapRecommendationDecision('strong_hire')).toBe('strong_hire');
    });

    it('should default to consider', () => {
      expect(service.mapRecommendationDecision('unknown' as any)).toBe('consider');
    });
  });

  describe('deriveMissingSkills', () => {
    it('should extract missing skills', () => {
      const scoringData: ScoringData = {
        ...mockMatchScoredEvent.scoreDto,
        matchingSkills: [
          { skill: 'JavaScript', matchScore: 90, matchType: 'exact', explanation: 'Match' },
          { skill: 'Python', matchScore: 70, matchType: 'missing', explanation: 'Missing' },
        ],
      } as ScoringData;

      const result = service.deriveMissingSkills(scoringData);

      expect(result).toEqual(['Python']);
    });

    it('should return undefined when no missing skills', () => {
      const result = service.deriveMissingSkills(mockMatchScoredEvent.scoreDto);

      expect(result).toBeUndefined();
    });
  });
});
