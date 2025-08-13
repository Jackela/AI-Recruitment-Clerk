import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedSkillMatcherService, JobSkillRequirement } from './enhanced-skill-matcher.service';
import { GeminiClient } from '../../../../libs/shared-dtos/src/gemini/gemini.client';

describe('EnhancedSkillMatcherService', () => {
  let service: EnhancedSkillMatcherService;
  let geminiClient: jest.Mocked<GeminiClient>;

  const mockGeminiResponse = {
    data: {
      hasMatch: true,
      matchedSkill: 'React',
      matchScore: 0.9,
      confidence: 0.85,
      explanation: 'React experience demonstrates JavaScript proficiency'
    },
    processingTimeMs: 1000,
    confidence: 0.85
  };

  beforeEach(async () => {
    const mockGeminiClient = {
      generateStructuredResponse: jest.fn().mockResolvedValue(mockGeminiResponse),
      generateText: jest.fn().mockResolvedValue({
        data: 'Technology',
        processingTimeMs: 500,
        confidence: 0.8
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedSkillMatcherService,
        {
          provide: GeminiClient,
          useValue: mockGeminiClient
        }
      ],
    }).compile();

    service = module.get<EnhancedSkillMatcherService>(EnhancedSkillMatcherService);
    geminiClient = module.get(GeminiClient);
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
        { name: 'Angular', weight: 0.8, required: false }
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills, 'Technology');

      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.matches).toHaveLength(2);
      expect(result.breakdown.exactMatches).toBe(2);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle fuzzy skill matching through taxonomy', async () => {
      const resumeSkills = ['JS', 'ReactJS'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 0.9, required: true }
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.breakdown.fuzzyMatches).toBeGreaterThan(0);
    });

    it('should perform semantic matching for complex cases', async () => {
      const resumeSkills = ['Frontend Development', 'UI Libraries'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'React', weight: 1.0, required: true, description: 'Frontend JavaScript library for building user interfaces' }
      ];

      const result = await service.matchSkills(resumeSkills, jobSkills, 'Technology');

      expect(geminiClient.generateStructuredResponse).toHaveBeenCalled();
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.breakdown.semanticMatches).toBeGreaterThanOrEqual(0);
    });

    it('should generate skill gap analysis', async () => {
      const resumeSkills = ['JavaScript'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'Python', weight: 0.8, required: true },
        { name: 'Docker', weight: 0.6, required: false }
      ];

      geminiClient.generateStructuredResponse.mockResolvedValueOnce({
        data: {
          suggestions: [
            {
              skill: 'Python',
              priority: 'high',
              reason: 'Critical skill required for backend development'
            }
          ]
        },
        processingTimeMs: 1200,
        confidence: 0.9
      });

      const result = await service.matchSkills(resumeSkills, jobSkills);

      expect(result.gapAnalysis.missingCriticalSkills).toContain('Python');
      expect(result.gapAnalysis.missingOptionalSkills).toContain('Docker');
      expect(result.gapAnalysis.improvementSuggestions.length).toBeGreaterThan(0);
    });

    it('should calculate confidence scores correctly', async () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'React', weight: 0.9, required: true },
        { name: 'Vue.js', weight: 0.7, required: false }
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
      geminiClient.generateStructuredResponse.mockRejectedValueOnce(new Error('AI service unavailable'));
      
      const resumeSkills = ['JavaScript', 'React'];
      const jobSkills: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: true },
        { name: 'Angular', weight: 0.8, required: false }
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
        { name: 'Python', weight: 1.0, required: false }
      ];
      
      const jobSkillsWithoutRequired: JobSkillRequirement[] = [
        { name: 'JavaScript', weight: 1.0, required: false },
        { name: 'Python', weight: 1.0, required: false }
      ];

      const resultWithRequired = await service.matchSkills(resumeSkills, jobSkillsWithRequired);
      const resultWithoutRequired = await service.matchSkills(resumeSkills, jobSkillsWithoutRequired);

      expect(resultWithRequired.overallScore).toBeGreaterThan(resultWithoutRequired.overallScore);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValue(new Error('Network error'));
      
      const result = await service.matchSkills(['JavaScript'], [{ name: 'JavaScript', weight: 1.0, required: true }]);
      
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should handle invalid AI responses', async () => {
      geminiClient.generateStructuredResponse.mockResolvedValue({
        data: null,
        processingTimeMs: 1000,
        confidence: 0.5
      });
      
      const result = await service.matchSkills(['JavaScript'], [{ name: 'React', weight: 1.0, required: true }]);
      
      expect(result).toBeDefined();
      expect(result.matches).toHaveLength(0);
    });
  });
});