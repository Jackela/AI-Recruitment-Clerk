import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceAnalyzerService, JobRequirements } from './experience-analyzer.service';
import { GeminiClient } from '@ai-recruitment-clerk/ai-services-shared';
import { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ExperienceAnalyzerService', () => {
  let service: ExperienceAnalyzerService;
  let geminiClient: jest.Mocked<GeminiClient>;

  const mockWorkExperience: ResumeDTO['workExperience'] = [
    {
      company: 'TechCorp',
      position: 'Senior Software Engineer',
      startDate: '2020-01-01',
      endDate: 'present',
      summary: 'Led a team of 5 developers in building scalable web applications using React and Node.js. Implemented CI/CD pipelines and mentored junior developers.'
    },
    {
      company: 'StartupInc',
      position: 'Full Stack Developer',
      startDate: '2018-06-01',
      endDate: '2019-12-31',
      summary: 'Developed full-stack applications using JavaScript, React, and Express.js. Worked in an agile environment.'
    },
    {
      company: 'WebAgency',
      position: 'Junior Developer',
      startDate: '2017-01-01',
      endDate: '2018-05-31',
      summary: 'Built responsive websites using HTML, CSS, and JavaScript. Collaborated with design team.'
    }
  ];

  const mockJobRequirements: JobRequirements = {
    experienceYears: { min: 3, max: 8 },
    seniority: 'senior',
    leadershipRequired: true,
    requiredTechnologies: ['React', 'Node.js'],
    requiredIndustries: ['Technology']
  };

  const mockAIAnalysisResponse = {
    data: {
      relevantYears: 6.5,
      leadershipExperience: {
        hasLeadership: true,
        leadershipYears: 4,
        teamSizeManaged: 5,
        leadershipEvidence: ['Led a team of 5 developers', 'mentored junior developers']
      },
      careerProgression: {
        score: 85,
        trend: 'ascending',
        evidence: 'Clear progression from Junior to Senior role with increasing responsibilities',
        promotions: 2
      },
      relevanceFactors: {
        skillAlignmentScore: 90,
        industryRelevance: 95,
        roleSimilarityScore: 88,
        technologyRelevance: 92
      }
    },
    processingTimeMs: 2000,
    confidence: 0.9
  };

  beforeEach(async () => {
    const mockGeminiClient = {
      generateStructuredResponse: jest.fn().mockResolvedValue(mockAIAnalysisResponse),
      generateText: jest.fn().mockResolvedValue({
        data: 'Technology',
        processingTimeMs: 500,
        confidence: 0.8
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienceAnalyzerService,
        {
          provide: GeminiClient,
          useValue: mockGeminiClient
        }
      ],
    }).compile();

    service = module.get<ExperienceAnalyzerService>(ExperienceAnalyzerService);
    geminiClient = module.get(GeminiClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeExperience', () => {
    it('should calculate total experience correctly', async () => {
      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements, 'Technology');

      expect(result.analysis.totalYears).toBeCloseTo(7, 1); // Approximately 7 years
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should analyze leadership experience', async () => {
      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements, 'Technology');

      expect(result.analysis.leadershipExperience.hasLeadership).toBe(true);
      expect(result.analysis.leadershipExperience.leadershipYears).toBeGreaterThan(0);
      expect(result.analysis.leadershipExperience.teamSizeManaged).toBeGreaterThan(0);
      expect(result.analysis.leadershipExperience.leadershipEvidence.length).toBeGreaterThan(0);
    });

    it('should assess career progression', async () => {
      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements, 'Technology');

      expect(result.analysis.careerProgression.score).toBeGreaterThan(50);
      expect(result.analysis.careerProgression.trend).toBe('ascending');
      expect(result.analysis.careerProgression.promotions).toBeGreaterThan(0);
    });

    it('should calculate recency weighting', async () => {
      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements, 'Technology');

      expect(result.analysis.recentYears).toBeGreaterThan(0);
      expect(result.weightingFactors.recencyWeight).toBeGreaterThan(0);
    });

    it('should apply leadership bonus for leadership-required positions', async () => {
      const leadershipRequiredJob: JobRequirements = {
        ...mockJobRequirements,
        leadershipRequired: true
      };

      const noLeadershipJob: JobRequirements = {
        ...mockJobRequirements,
        leadershipRequired: false
      };

      const resultWithLeadership = await service.analyzeExperience(mockWorkExperience, leadershipRequiredJob);
      const resultWithoutLeadership = await service.analyzeExperience(mockWorkExperience, noLeadershipJob);

      expect(resultWithLeadership.weightingFactors.leadershipBonus).toBeGreaterThan(resultWithoutLeadership.weightingFactors.leadershipBonus);
    });

    it('should handle career gaps', async () => {
      const workExperienceWithGaps: ResumeDTO['workExperience'] = [
        {
          company: 'Company A',
          position: 'Developer',
          startDate: '2015-01-01',
          endDate: '2016-12-31',
          summary: 'Worked as a developer'
        },
        {
          company: 'Company B',
          position: 'Senior Developer',
          startDate: '2019-01-01',
          endDate: 'present',
          summary: 'Currently working as senior developer'
        }
      ];

      const result = await service.analyzeExperience(workExperienceWithGaps, mockJobRequirements);

      expect(result.analysis.gaps.hasGaps).toBe(true);
      expect(result.analysis.gaps.gapMonths).toBeGreaterThan(12);
      expect(result.analysis.gaps.gapExplanations.length).toBeGreaterThan(0);
    });

    it('should adjust scoring based on seniority level', async () => {
      const seniorJob: JobRequirements = { ...mockJobRequirements, seniority: 'senior' };
      const juniorJob: JobRequirements = { ...mockJobRequirements, seniority: 'junior' };

      const seniorResult = await service.analyzeExperience(mockWorkExperience, seniorJob);
      const juniorResult = await service.analyzeExperience(mockWorkExperience, juniorJob);

      expect(seniorResult.weightingFactors.recencyWeight).toBeGreaterThan(juniorResult.weightingFactors.recencyWeight);
    });

    it('should classify industry experience', async () => {
      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements, 'Technology');

      expect(result.analysis.industryExperience).toBeDefined();
      expect(Object.keys(result.analysis.industryExperience).length).toBeGreaterThan(0);
    });

    it('should handle empty work experience', async () => {
      const result = await service.analyzeExperience([], mockJobRequirements);

      expect(result.analysis.totalYears).toBe(0);
      expect(result.overallScore).toBeLessThan(50);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should apply progression bonus for ascending careers', async () => {
      const ascendingAnalysis = {
        ...mockAIAnalysisResponse,
        data: {
          ...mockAIAnalysisResponse.data,
          careerProgression: {
            score: 85,
            trend: 'ascending' as const,
            evidence: 'Clear upward progression',
            promotions: 3
          }
        }
      };

      const stableAnalysis = {
        ...mockAIAnalysisResponse,
        data: {
          ...mockAIAnalysisResponse.data,
          careerProgression: {
            score: 60,
            trend: 'stable' as const,
            evidence: 'Consistent role level',
            promotions: 0
          }
        }
      };

      geminiClient.generateStructuredResponse.mockResolvedValueOnce(ascendingAnalysis);
      const ascendingResult = await service.analyzeExperience(mockWorkExperience, mockJobRequirements);

      geminiClient.generateStructuredResponse.mockResolvedValueOnce(stableAnalysis);
      const stableResult = await service.analyzeExperience(mockWorkExperience, mockJobRequirements);

      expect(ascendingResult.weightingFactors.progressionBonus).toBeGreaterThan(stableResult.weightingFactors.progressionBonus);
      expect(ascendingResult.overallScore).toBeGreaterThan(stableResult.overallScore);
    });
  });

  describe('error handling', () => {
    it('should fallback gracefully when AI analysis fails', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.9); // Should indicate fallback was used
    });

    it('should handle invalid work experience data', async () => {
      const invalidWorkExperience = [
        {
          company: '',
          position: '',
          startDate: 'invalid-date',
          endDate: 'invalid-date',
          summary: ''
        }
      ];

      const result = await service.analyzeExperience(invalidWorkExperience, mockJobRequirements);

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should handle missing job requirements gracefully', async () => {
      const minimalJobRequirements: JobRequirements = {
        experienceYears: { min: 0, max: 10 },
        seniority: 'mid'
      };

      const result = await service.analyzeExperience(mockWorkExperience, minimalJobRequirements);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
    });
  });

  describe('performance metrics', () => {
    it('should track processing time', async () => {
      const startTime = Date.now();
      await service.analyzeExperience(mockWorkExperience, mockJobRequirements);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain high accuracy with sufficient data', async () => {
      const result = await service.analyzeExperience(mockWorkExperience, mockJobRequirements, 'Technology');

      // With good data, confidence should be high
      expect(result.confidence).toBeGreaterThan(0.8);
      
      // Score should be reasonable for a qualified candidate
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.overallScore).toBeLessThan(100);
    });
  });
});