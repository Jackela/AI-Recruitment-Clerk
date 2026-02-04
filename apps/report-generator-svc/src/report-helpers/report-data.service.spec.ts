import { ReportDataService } from './report-data.service';
import type { ReportDocument } from './report-data.service';

describe('ReportDataService', () => {
  let service: ReportDataService;

  const mockReportDocument: ReportDocument = {
    _id: 'report-123',
    jobId: 'job-123',
    resumeId: 'resume-123',
    scoreBreakdown: {
      skillsMatch: 85,
      experienceMatch: 80,
      educationMatch: 75,
      overallFit: 80,
    },
    skillsAnalysis: [
      { skill: 'JavaScript', matchScore: 90, matchType: 'exact', explanation: 'Direct match' },
      { skill: 'TypeScript', matchScore: 85, matchType: 'exact', explanation: 'Direct match' },
      { skill: 'Python', matchScore: 60, matchType: 'partial', explanation: 'Related experience' },
    ],
    recommendation: {
      decision: 'hire',
      reasoning: 'Strong technical fit',
      strengths: ['Strong JavaScript skills', 'Good experience'],
      concerns: ['Limited Python experience'],
      suggestions: ['Assess Python skills in interview'],
    },
    summary: 'Good candidate overall',
    analysisConfidence: 0.85,
    processingTimeMs: 1500,
    generatedBy: 'test',
    llmModel: 'test-model',
  };

  beforeEach(() => {
    service = new ReportDataService();
  });

  describe('formatCandidateForComparison', () => {
    it('should format report document for comparison', () => {
      const result = service.formatCandidateForComparison(mockReportDocument);

      expect(result.id).toBe('resume-123');
      expect(result.name).toBe('Candidate resume-123');
      expect(result.score).toBe(0.8); // overallFit / 100
      expect(result.skills).toEqual(['JavaScript', 'TypeScript', 'Python']);
      expect(result.recommendation).toBe('hire');
    });
  });

  describe('formatCandidateForInterview', () => {
    it('should format report document for interview guide', () => {
      const result = service.formatCandidateForInterview(mockReportDocument);

      expect(result.id).toBe('resume-123');
      expect(result.name).toBe('Candidate resume-123');
      expect(result.skills).toEqual(mockReportDocument.skillsAnalysis);
      expect(result.experience).toBe(80); // experienceMatch
      expect(result.education).toBe(75); // educationMatch
    });
  });

  describe('extractJobRequirements', () => {
    it('should extract job requirements from report', () => {
      const result = service.extractJobRequirements(mockReportDocument);

      expect(result.requiredSkills).toEqual(['JavaScript', 'TypeScript', 'Python']);
      expect(result.experienceLevel).toBe('mid-level');
      expect(result.educationLevel).toBe('bachelor');
    });
  });

  describe('aggregateScoreBreakdown', () => {
    it('should aggregate score breakdown from multiple items', () => {
      const items = [
        { scoreBreakdown: { skillsMatch: 80, experienceMatch: 70, educationMatch: 75, overallFit: 75 } },
        { scoreBreakdown: { skillsMatch: 90, experienceMatch: 85, educationMatch: 80, overallFit: 85 } },
        { scoreBreakdown: { skillsMatch: 70, experienceMatch: 75, educationMatch: 70, overallFit: 72 } },
      ];

      const result = service.aggregateScoreBreakdown(items);

      expect(result.skillsMatch).toBe(80); // (80 + 90 + 70) / 3
      expect(result.experienceMatch).toBe(77); // Math.round((70 + 85 + 75) / 3)
      expect(result.educationMatch).toBe(75);
      expect(result.overallFit).toBe(77);
    });

    it('should return default values for empty array', () => {
      const result = service.aggregateScoreBreakdown([]);

      expect(result.skillsMatch).toBe(0);
      expect(result.experienceMatch).toBe(0);
    });

    it('should handle items without score breakdown', () => {
      const items = [
        {}, // no scoreBreakdown
        { scoreBreakdown: { skillsMatch: 80, experienceMatch: 70, educationMatch: 75, overallFit: 75 } },
      ];

      const result = service.aggregateScoreBreakdown(items);

      expect(result.skillsMatch).toBe(80);
      expect(result.experienceMatch).toBe(70);
    });
  });

  describe('aggregateSkillsAnalysis', () => {
    it('should aggregate skills and average match scores', () => {
      const items = [
        {
          skillsAnalysis: [
            { skill: 'JavaScript', matchScore: 90, matchType: 'exact', explanation: 'Match' },
            { skill: 'Python', matchScore: 60, matchType: 'partial', explanation: 'Partial' },
          ],
        },
        {
          skillsAnalysis: [
            { skill: 'JavaScript', matchScore: 85, matchType: 'exact', explanation: 'Match' },
            { skill: 'TypeScript', matchScore: 80, matchType: 'exact', explanation: 'Match' },
          ],
        },
      ];

      const result = service.aggregateSkillsAnalysis(items);

      expect(result).toHaveLength(3);
      const jsSkill = result.find((s) => s.skill === 'JavaScript');
      expect(jsSkill?.matchScore).toBe(88); // (90 + 85) / 2 rounded
    });

    it('should return empty array for empty input', () => {
      const result = service.aggregateSkillsAnalysis([]);
      expect(result).toEqual([]);
    });
  });

  describe('generateOverallRecommendation', () => {
    it('should aggregate recommendations from multiple items', () => {
      const items = [
        {
          recommendation: {
            decision: 'hire',
            reasoning: 'Good fit',
            strengths: ['Strong skills', 'Good experience'],
            concerns: ['None'],
            suggestions: ['Hire'],
          },
        },
        {
          recommendation: {
            decision: 'hire',
            reasoning: 'Very good fit',
            strengths: ['Excellent communication'],
            concerns: [],
            suggestions: ['Quick interview'],
          },
        },
      ];

      const result = service.generateOverallRecommendation(items);

      expect(result.decision).toBe('hire');
      expect(result.strengths).toContain('Strong skills');
      expect(result.strengths).toContain('Excellent communication');
      expect(result.strengths.length).toBeLessThanOrEqual(5); // Top 5 unique
    });

    it('should return default for items without recommendations', () => {
      const result = service.generateOverallRecommendation([{}]);

      expect(result.decision).toBe('consider');
      expect(result.strengths).toEqual([]);
    });
  });

  describe('calculateAverageConfidence', () => {
    it('should calculate average confidence', () => {
      const items = [
        { confidence: 0.9 },
        { confidence: 0.8 },
        { confidence: 0.85 },
      ];

      const result = service.calculateAverageConfidence(items);

      expect(result).toBeCloseTo(0.85); // (0.9 + 0.8 + 0.85) / 3
    });

    it('should return default confidence for empty array', () => {
      const result = service.calculateAverageConfidence([]);
      expect(result).toBe(0.85);
    });
  });

  describe('generateBatchSummary', () => {
    it('should generate summary with top skills', () => {
      const items = [
        { resumeId: '1' },
        { resumeId: '2' },
        { resumeId: '3' },
      ];

      const result = service.generateBatchSummary(items);

      expect(result).toContain('3 candidate');
    });
  });

  describe('formatCandidateForLlm', () => {
    it('should format candidate data for LLM', () => {
      const candidate = {
        id: 'cand-123',
        name: 'John Doe',
        score: 0.85,
        recommendation: 'hire',
        skills: ['JavaScript', 'Python'],
        strengths: ['Strong skills'],
        concerns: ['Limited experience'],
      };

      const result = service.formatCandidateForLlm(candidate);

      expect(result.id).toBe('cand-123');
      expect(result.name).toBe('John Doe');
      expect(result.score).toBe(0.85);
      expect(result.recommendation).toBe('hire');
      expect(result.matchingSkills).toEqual(['JavaScript', 'Python']);
    });
  });

  describe('mapRecommendationDecision', () => {
    it('should map hire decision', () => {
      expect(service.mapRecommendationDecision('hire')).toBe('hire');
    });

    it('should map interview to consider', () => {
      expect(service.mapRecommendationDecision('interview')).toBe('consider');
    });

    it('should map reject to pass', () => {
      expect(service.mapRecommendationDecision('reject')).toBe('pass');
    });

    it('should default to consider for unknown', () => {
      expect(service.mapRecommendationDecision('unknown')).toBe('consider');
    });
  });
});
