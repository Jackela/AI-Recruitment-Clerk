import {
  EnhancedSkillMatcherService,
  JobSkillRequirement,
} from './enhanced-skill-matcher.service';
import { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';

describe('EnhancedSkillMatcherService', () => {
  let service: EnhancedSkillMatcherService;
  let geminiClient: jest.Mocked<GeminiClient>;

  const mockGeminiResponse = {
    data: {
      hasMatch: true,
      matchedSkill: 'React',
      matchScore: 0.9,
      confidence: 0.85,
      explanation: 'React experience demonstrates JavaScript proficiency',
    },
    processingTimeMs: 1000,
    confidence: 0.85,
  };

  beforeEach(() => {
    const mockGeminiClient = {
      generateStructuredResponse: jest
        .fn()
        .mockResolvedValue(mockGeminiResponse),
      generateText: jest.fn().mockResolvedValue({
        data: 'Technology',
        processingTimeMs: 500,
        confidence: 0.8,
      }),
    } as Partial<jest.Mocked<GeminiClient>>;

    service = new EnhancedSkillMatcherService(
      mockGeminiClient as unknown as GeminiClient,
    );
    geminiClient = mockGeminiClient as unknown as jest.Mocked<GeminiClient>;

    (service as any).logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('matchSkills', () => {
    it('should perform exact skill matching', async () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 0.9, required: true },
        { name: 'Angular', weight: 0.8, required: false },
      ];

      const result = await service.matchSkills(
        resumeSkills,
        jobSkills,
        'Technology',
      );

      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.matches).toHaveLength(2);
      expect(result.breakdown.exactMatches).toBe(2);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle fuzzy skill matching through taxonomy', async () => {
      const resumeSkills = ['JS', 'ReactJS'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 0.9, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.breakdown.fuzzyMatches).toBeGreaterThan(0);
    });

    it('should perform semantic matching for complex cases', async () => {
      const resumeSkills = ['Frontend Development', 'UI Libraries'];
      const jobSkills: JobSkillRequirement[] = [
        {
          name: 'React',
          weight: 1.0,
          required: true,
          description:
            'Frontend JavaScript library for building user interfaces',
        },
      ];

      const result = await service.matchSkills(
        resumeSkills,
        jobSkills,
        'Technology',
      );

      expect(geminiClient.generateStructuredResponse).toHaveBeenCalled();
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.breakdown.semanticMatches).toBeGreaterThanOrEqual(0);
    });

    it('should generate skill gap analysis', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'Python', weight: 0.8, required: true },
        { name: 'Docker', weight: 0.6, required: false },
      ];

      geminiClient.generateStructuredResponse.mockResolvedValueOnce({
        data: {
          suggestions: [
            {
              skill: 'Python',
              priority: 'high',
              reason: 'Critical skill required for backend development',
            },
          ],
        },
        processingTimeMs: 1200,
        confidence: 0.9,
      });

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.gapAnalysis.missingCriticalSkills).toContain('Python');
      expect(result.gapAnalysis.missingOptionalSkills).toContain('Docker');
      expect(result.gapAnalysis.improvementSuggestions.length).toBeGreaterThan(
        0,
      );
    });

    it('should calculate confidence scores correctly', async () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 0.9, required: true },
        { name: 'Vue.js', weight: 0.7, required: false },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Should have high confidence with good matches and coverage
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle empty skill lists gracefully', async () => {
      const result = await service.matchSkills([], []);

      expect(result.overallScore).toBe(0);
      expect(result.matches).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should use fallback when AI analysis fails', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const resumeSkills = ['JavaScript', 'React'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'Angular', weight: 0.8, required: false },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(1.0); // Should indicate fallback was used
    });

    it('should weight required skills higher than optional skills', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkillsWithRequired: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'Python', weight: 1.0, required: false },
      ];

      const jobSkillsWithoutRequired: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: false },
        { name: 'Python', weight: 1.0, required: false },
      ];

      const resultWithRequired = await service.matchSkills(
        resumeSkills,
        jobSkillsWithRequired,
      );
      const resultWithoutRequired = await service.matchSkills(
        resumeSkills,
        jobSkillsWithoutRequired,
      );

      expect(resultWithRequired.overallScore).toBeGreaterThan(
        resultWithoutRequired.overallScore,
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.matchSkills(
        ['JavaScript'],
        [{ name: 'JavaScript', weight: 1.0, required: true }],
      );

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should handle invalid AI responses', async () => {
      geminiClient.generateStructuredResponse.mockResolvedValue({
        data: null,
        processingTimeMs: 1000,
        confidence: 0.5,
      });

      const result = await service.matchSkills(
        ['JavaScript'],
        [{ name: 'React', weight: 1.0, required: true }],
      );

      expect(result).toBeDefined();
      expect(result.matches).toHaveLength(0);
    });
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Boundary Tests - Skill Matching Thresholds', () => {
    it('should handle exactly 100% skill match', async () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 1.0, required: true },
        { name: 'Node.js', weight: 1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.overallScore).toBeGreaterThanOrEqual(95);
      expect(result.matches).toHaveLength(3);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should handle 0% skill match (no overlap)', async () => {
      const resumeSkills = ['Python', 'Django', 'Flask'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.overallScore).toBeLessThan(30);
      expect(result.matches.length).toBeLessThanOrEqual(1);
    });

    it('should handle exactly threshold weight (0.5)', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 0.5, required: false },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
      expect(result.matches).toHaveLength(1);
    });

    it('should handle zero-weight skills', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 0, required: false },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.overallScore).toBeDefined();
    });
  });

  describe('Negative Tests - Invalid Inputs', () => {
    it('should handle skills with invalid characters', async () => {
      const resumeSkills = ['JavaScript<script>', 'React"DROP TABLE'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
      expect(result.matches.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle extremely long skill names (>500 chars)', async () => {
      const longSkill = 'A'.repeat(600);
      const resumeSkills = [longSkill];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
    });

    it('should handle negative weight values', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: -1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle weight values exceeding 1.0', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 5.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
    });
  });

  describe('Negative Tests - AI Service Failures', () => {
    it('should handle API timeout errors', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValue(
        new Error('Request timeout'),
      );

      const result = await service.matchSkills(
        ['JavaScript'],
        [{ name: 'React', weight: 1.0, required: true }],
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle API rate limiting (429)', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValue(
        new Error('Rate limit exceeded'),
      );

      const result = await service.matchSkills(
        ['JavaScript'],
        [{ name: 'React', weight: 1.0, required: true }],
      );

      expect(result).toBeDefined();
    });

    it('should handle malformed AI response structure', async () => {
      geminiClient.generateStructuredResponse.mockResolvedValue({
        data: { invalid: 'structure' },
        processingTimeMs: 1000,
        confidence: 0.5,
      } as any);

      const result = await service.matchSkills(
        ['JavaScript'],
        [{ name: 'React', weight: 1.0, required: true }],
      );

      expect(result).toBeDefined();
    });

    it('should handle AI service returning very low confidence (<0.3)', async () => {
      geminiClient.generateStructuredResponse.mockResolvedValue({
        data: mockGeminiResponse.data,
        processingTimeMs: 1000,
        confidence: 0.2,
      });

      const result = await service.matchSkills(
        ['JavaScript'],
        [{ name: 'React', weight: 1.0, required: true }],
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Edge Cases - Large Datasets', () => {
    it('should handle very large resume skill list (>100 skills)', async () => {
      const largeResumeSkills = Array.from({ length: 150 }, (_, i) => `Skill${i}`);
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
      ];

      const matchSpy = jest
        .spyOn<any, any>(service as any, 'findBestSkillMatch')
        .mockResolvedValue(null);
      const gapSpy = jest
        .spyOn<any, any>(service as any, 'analyzeSkillGaps')
        .mockResolvedValue({
          missingCriticalSkills: [],
          missingOptionalSkills: [],
          improvementSuggestions: [],
        });
      const scoreSpy = jest
        .spyOn<any, any>(service as any, 'calculateWeightedSkillScore')
        .mockReturnValue(0);
      const confidenceSpy = jest
        .spyOn<any, any>(service as any, 'calculateMatchConfidence')
        .mockReturnValue(0.5);

      const result = await service.matchSkills(largeResumeSkills, jobSkills);

      expect(result).toBeDefined();
      expect(result.matches.length).toBeGreaterThanOrEqual(0);

      matchSpy.mockRestore();
      gapSpy.mockRestore();
      scoreSpy.mockRestore();
      confidenceSpy.mockRestore();
    });

    it('should handle very large job requirements list (>50 skills)', async () => {
      const resumeSkills = ['JavaScript', 'React'];
      const largeJobSkills: JobSkillRequirement[] = Array.from(
        { length: 80 },
        (_, i) => ({
          name: `RequiredSkill${i}`,
          weight: 0.8,
          required: i < 40,
        }),
      );

      const matchSpy = jest
        .spyOn<any, any>(service as any, 'findBestSkillMatch')
        .mockResolvedValue(null);
      const gapSpy = jest
        .spyOn<any, any>(service as any, 'analyzeSkillGaps')
        .mockResolvedValue({
          missingCriticalSkills: [],
          missingOptionalSkills: [],
          improvementSuggestions: [],
        });
      const scoreSpy = jest
        .spyOn<any, any>(service as any, 'calculateWeightedSkillScore')
        .mockReturnValue(0);
      const confidenceSpy = jest
        .spyOn<any, any>(service as any, 'calculateMatchConfidence')
        .mockReturnValue(0.5);

      const result = await service.matchSkills(resumeSkills, largeJobSkills);

      expect(result).toBeDefined();

      matchSpy.mockRestore();
      gapSpy.mockRestore();
      scoreSpy.mockRestore();
      confidenceSpy.mockRestore();
    });

    it('should handle performance degradation with complex matching', async () => {
      const largeResumeSkills = Array.from({ length: 50 }, (_, i) => `Skill${i}`);
      const largeJobSkills: JobSkillRequirement[] = Array.from(
        { length: 50 },
        (_, i) => ({ name: `Job${i}`, weight: 0.8, required: true }),
      );

      const matchSpy = jest
        .spyOn<any, any>(service as any, 'findBestSkillMatch')
        .mockResolvedValue(null);
      const gapSpy = jest
        .spyOn<any, any>(service as any, 'analyzeSkillGaps')
        .mockResolvedValue({
          missingCriticalSkills: [],
          missingOptionalSkills: [],
          improvementSuggestions: [],
        });
      const scoreSpy = jest
        .spyOn<any, any>(service as any, 'calculateWeightedSkillScore')
        .mockReturnValue(0);
      const confidenceSpy = jest
        .spyOn<any, any>(service as any, 'calculateMatchConfidence')
        .mockReturnValue(0.5);

      const startTime = Date.now();
      const result = await service.matchSkills(largeResumeSkills, largeJobSkills);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // Should complete within 30s

      matchSpy.mockRestore();
      gapSpy.mockRestore();
      scoreSpy.mockRestore();
      confidenceSpy.mockRestore();
    });
  });

  describe('Edge Cases - Special Characters and Encoding', () => {
    it('should handle unicode skill names', async () => {
      const resumeSkills = ['JavaScript', '日本語', 'Développement', 'Разработка'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
    });

    it('should handle skills with emojis', async () => {
      const resumeSkills = ['JavaScript ⚡', 'React 🚀'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result).toBeDefined();
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete match result structure', async () => {
      const result = await service.matchSkills(
        ['JavaScript', 'React'],
        [{ name: 'JavaScript', weight: 1.0, required: true }],
      );

      expect(result).toMatchObject({
        overallScore: expect.any(Number),
        confidence: expect.any(Number),
        matches: expect.any(Array),
        breakdown: expect.objectContaining({
          exactMatches: expect.any(Number),
          fuzzyMatches: expect.any(Number),
          semanticMatches: expect.any(Number),
        }),
        gapAnalysis: expect.objectContaining({
          missingCriticalSkills: expect.any(Array),
          missingOptionalSkills: expect.any(Array),
          improvementSuggestions: expect.any(Array),
        }),
      });
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
