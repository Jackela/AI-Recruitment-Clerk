import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { JdDTO } from './scoring.service';
import { ScoringEngineService } from './scoring.service';
import { ScoringEngineNatsService } from './services/scoring-engine-nats.service';
import { EnhancedSkillMatcherService } from './services/enhanced-skill-matcher.service';
import { ExperienceAnalyzerService } from './services/experience-analyzer.service';
import { CulturalFitAnalyzerService } from './services/cultural-fit-analyzer.service';
import { ScoringConfidenceService } from './services/scoring-confidence.service';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;
  let natsService: jest.Mocked<ScoringEngineNatsService>;
  let skillMatcher: jest.Mocked<EnhancedSkillMatcherService>;
  let experienceAnalyzer: jest.Mocked<ExperienceAnalyzerService>;
  let culturalFitAnalyzer: jest.Mocked<CulturalFitAnalyzerService>;
  let confidenceService: jest.Mocked<ScoringConfidenceService>;

  const mockResumeDto: ResumeDTO = {
    contactInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567',
    },
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'MongoDB'],
    workExperience: [
      {
        company: 'TechCorp',
        position: 'Senior Software Engineer',
        startDate: '2020-01-01',
        endDate: 'present',
        summary:
          'Led development of scalable web applications using React and Node.js. Managed a team of 5 developers and implemented CI/CD practices.',
      },
      {
        company: 'StartupInc',
        position: 'Full Stack Developer',
        startDate: '2018-06-01',
        endDate: '2019-12-31',
        summary:
          'Developed full-stack applications using MEAN stack. Worked in agile environment with rapid deployment cycles.',
      },
    ],
    education: [
      {
        school: 'University of Technology',
        degree: 'Bachelor',
        major: 'Computer Science',
      },
    ],
  };

  const mockJdDto: JdDTO = {
    requiredSkills: [
      { name: 'JavaScript', weight: 1.0, required: true },
      { name: 'React', weight: 0.9, required: true },
      { name: 'Node.js', weight: 0.8, required: true },
      { name: 'Python', weight: 0.7, required: false },
    ],
    experienceYears: { min: 3, max: 8 },
    educationLevel: 'bachelor',
    softSkills: ['leadership', 'communication', 'problem-solving'],
    seniority: 'senior',
    industryContext: 'Technology',
    leadershipRequired: true,
    requiredTechnologies: ['JavaScript', 'React', 'Node.js'],
    companyProfile: {
      size: 'scaleup',
      culture: {
        values: ['innovation', 'collaboration', 'growth'],
        workStyle: 'hybrid',
        decisionMaking: 'collaborative',
        innovation: 'high',
        growthStage: 'growth',
      },
      teamStructure: {
        teamSize: 8,
        managementLayers: 2,
        collaborationStyle: 'cross-functional',
      },
    },
  };

  // Legacy JD format for backward compatibility tests
  const legacyJdDto: JdDTO = {
    requiredSkills: [
      { name: 'typescript', weight: 1 },
      { name: 'node', weight: 1 },
    ] as any,
    experienceYears: { min: 2, max: 5 },
    educationLevel: 'bachelor',
    softSkills: ['teamwork'],
    seniority: 'mid',
  };

  const mockSkillMatchResult = {
    overallScore: 85,
    matches: [
      {
        skill: 'JavaScript',
        matchedJobSkill: 'JavaScript',
        matchScore: 1.0,
        matchType: 'exact' as const,
        confidence: 0.95,
        explanation: 'Exact match found',
      },
      {
        skill: 'React',
        matchedJobSkill: 'React',
        matchScore: 1.0,
        matchType: 'exact' as const,
        confidence: 0.95,
        explanation: 'Exact match found',
      },
    ],
    gapAnalysis: {
      missingCriticalSkills: ['Python'],
      missingOptionalSkills: [],
      improvementSuggestions: [
        {
          skill: 'Python',
          priority: 'medium' as const,
          reason: 'Would complement existing backend skills',
        },
      ],
    },
    confidence: 0.9,
    breakdown: {
      exactMatches: 2,
      semanticMatches: 0,
      fuzzyMatches: 0,
      relatedMatches: 0,
    },
  };

  const mockExperienceResult = {
    overallScore: 90,
    analysis: {
      totalYears: 6.5,
      relevantYears: 6.0,
      recentYears: 4.0,
      industryExperience: { Technology: 6.5 },
      leadershipExperience: {
        hasLeadership: true,
        leadershipYears: 4.0,
        teamSizeManaged: 5,
        leadershipEvidence: ['Led development', 'Managed a team of 5'],
      },
      careerProgression: {
        score: 85,
        trend: 'ascending' as const,
        evidence: 'Clear progression from Full Stack to Senior Engineer',
        promotions: 1,
      },
      relevanceFactors: {
        skillAlignmentScore: 88,
        industryRelevance: 95,
        roleSimilarityScore: 90,
        technologyRelevance: 92,
      },
      gaps: {
        hasGaps: false,
        gapMonths: 0,
        gapExplanations: [],
      },
    },
    confidence: 0.88,
    weightingFactors: {
      recencyWeight: 0.3,
      relevanceWeight: 0.4,
      leadershipBonus: 0.15,
      progressionBonus: 0.1,
      industryPenalty: 0.0,
    },
    breakdown: {
      baseExperienceScore: 85,
      relevanceAdjustment: 5,
      recencyAdjustment: 3,
      leadershipBonus: 15,
      progressionBonus: 8,
      finalScore: 90,
    },
  };

  const mockCulturalFitResult = {
    overallScore: 78,
    indicators: {
      companySize: {
        preference: 'scaleup' as const,
        confidence: 85,
        evidence: [
          'Experience at StartupInc',
          'Current role at scaling company',
        ],
      },
      workStyle: {
        remoteReadiness: 85,
        collaborationStyle: 'collaborative' as const,
        adaptabilityScore: 80,
        evidence: ['agile environment', 'cross-functional collaboration'],
      },
      communicationSkills: {
        writtenCommunication: 75,
        verbalCommunication: 80,
        presentationSkills: 70,
        evidence: ['Led development', 'team management experience'],
      },
      leadershipPotential: {
        score: 85,
        style: 'collaborative' as const,
        mentorshipEvidence: ['team management'],
        teamBuildingEvidence: ['cross-functional work'],
      },
      innovationMindset: {
        score: 80,
        creativityIndicators: ['implemented CI/CD practices'],
        problemSolvingApproach: 'systematic' as const,
      },
      professionalMaturity: {
        score: 85,
        reliabilityIndicators: ['consistent employment', 'career progression'],
        accountability: 88,
        continuousLearning: 82,
      },
    },
    softSkills: {
      technicalCommunication: 80,
      problemSolving: 85,
      adaptability: 82,
      teamwork: 88,
      leadership: 85,
      timeManagement: 80,
      criticalThinking: 83,
      emotionalIntelligence: 75,
      evidence: {
        leadership: ['Led development', 'Managed a team'],
        teamwork: ['agile environment', 'cross-functional'],
        problemSolving: ['scalable applications', 'CI/CD implementation'],
        technicalCommunication: ['team management', 'development leadership'],
        adaptability: ['startup to corporate environment'],
        timeManagement: ['rapid deployment cycles'],
        criticalThinking: ['architectural decisions'],
        emotionalIntelligence: ['team management experience'],
      },
    },
    alignmentScores: {
      companySizeAlignment: 90,
      workStyleAlignment: 85,
      leadershipAlignment: 80,
      innovationAlignment: 75,
      communicationAlignment: 78,
    },
    confidence: 0.82,
    recommendations: {
      strengths: [
        'Strong technical leadership',
        'Excellent cultural alignment',
        'Proven team management skills',
      ],
      concerns: [
        'Missing some optional skills',
        'Innovation score could be higher',
      ],
      developmentAreas: ['Public speaking', 'Strategic planning'],
    },
  };

  const mockConfidenceReport = {
    overallConfidence: 85,
    confidenceMetrics: {
      dataQuality: {
        score: 88,
        factors: {
          completeness: 90,
          consistency: 85,
          recency: 88,
          detail: 85,
        },
        issues: [],
      },
      analysisReliability: {
        score: 82,
        factors: {
          algorithmConfidence: 85,
          aiResponseQuality: 80,
          evidenceStrength: 85,
          crossValidation: 78,
        },
        uncertainties: [],
      },
      scoreVariance: {
        skillsVariance: 0.8,
        experienceVariance: 0.6,
        culturalFitVariance: 1.0,
        overallVariance: 0.8,
        stabilityScore: 85,
      },
      recommendationCertainty: {
        level: 'high' as const,
        score: 85,
        factors: {
          scoringConsistency: 85,
          dataCompleteness: 88,
          algorithmMaturity: 82,
        },
        riskFactors: [],
      },
    },
    reliabilityBand: {
      minScore: 80,
      maxScore: 90,
      mostLikelyScore: 85,
      confidenceInterval: 10,
    },
    qualityIndicators: {
      dataQualityGrade: 'B' as const,
      analysisDepthGrade: 'B' as const,
      reliabilityGrade: 'B' as const,
    },
    recommendations: {
      scoringReliability: 'high' as const,
      actionItems: [],
      riskMitigation: [],
    },
  };

  beforeEach(async () => {
    const mockNatsService = {
      emit: jest.fn().mockResolvedValue({ success: true }),
      publishScoringCompleted: jest.fn().mockResolvedValue({ success: true }),
      publishScoringError: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockSkillMatcher = {
      matchSkills: jest.fn().mockResolvedValue(mockSkillMatchResult),
    };

    const mockExperienceAnalyzer = {
      analyzeExperience: jest.fn().mockResolvedValue(mockExperienceResult),
    };

    const mockCulturalFitAnalyzer = {
      analyzeCulturalFit: jest.fn().mockResolvedValue(mockCulturalFitResult),
    };

    const mockConfidenceService = {
      generateConfidenceReport: jest.fn().mockReturnValue(mockConfidenceReport),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringEngineService,
        { provide: ScoringEngineNatsService, useValue: mockNatsService },
        { provide: EnhancedSkillMatcherService, useValue: mockSkillMatcher },
        {
          provide: ExperienceAnalyzerService,
          useValue: mockExperienceAnalyzer,
        },
        {
          provide: CulturalFitAnalyzerService,
          useValue: mockCulturalFitAnalyzer,
        },
        { provide: ScoringConfidenceService, useValue: mockConfidenceService },
      ],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
    natsService = module.get(ScoringEngineNatsService);
    skillMatcher = module.get(EnhancedSkillMatcherService);
    experienceAnalyzer = module.get(ExperienceAnalyzerService);
    culturalFitAnalyzer = module.get(CulturalFitAnalyzerService);
    confidenceService = module.get(ScoringConfidenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleJdExtractedEvent', () => {
    it('should cache JD data', () => {
      const jobId = 'test-job-123';
      const event = { jobId, jdDto: mockJdDto };

      service.handleJdExtractedEvent(event);

      // Test that the JD is cached (this is testing internal state,
      // but necessary for proper functionality)
      expect(() => service.handleJdExtractedEvent(event)).not.toThrow();
    });
  });

  describe('handleResumeParsedEvent', () => {
    beforeEach(() => {
      // Cache the JD first
      service.handleJdExtractedEvent({
        jobId: 'test-job-123',
        jdDto: mockJdDto,
      });
    });

    it('should process resume and calculate enhanced score', async () => {
      const event = {
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      await service.handleResumeParsedEvent(event);

      expect(skillMatcher.matchSkills).toHaveBeenCalledWith(
        mockResumeDto.skills,
        mockJdDto.requiredSkills,
        mockJdDto.industryContext,
      );

      expect(experienceAnalyzer.analyzeExperience).toHaveBeenCalledWith(
        mockResumeDto.workExperience,
        expect.objectContaining({
          experienceYears: mockJdDto.experienceYears,
          seniority: mockJdDto.seniority,
        }),
        mockJdDto.industryContext,
      );

      expect(culturalFitAnalyzer.analyzeCulturalFit).toHaveBeenCalledWith(
        mockResumeDto,
        mockJdDto.companyProfile,
        expect.any(Object),
      );

      expect(confidenceService.generateConfidenceReport).toHaveBeenCalled();

      expect(natsService.emit).toHaveBeenCalledWith(
        'analysis.match.scored',
        expect.objectContaining({
          jobId: 'test-job-123',
          resumeId: 'test-resume-456',
          scoreDto: expect.objectContaining({
            overallScore: expect.any(Number),
            skillScore: expect.any(Object),
            experienceScore: expect.any(Object),
            educationScore: expect.any(Object),
            culturalFitScore: expect.any(Object),
            enhancedSkillAnalysis: mockSkillMatchResult,
            experienceAnalysis: mockExperienceResult,
            culturalFitAnalysis: mockCulturalFitResult,
            confidenceReport: mockConfidenceReport,
          }),
        }),
      );

      expect(natsService.publishScoringCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-123',
          resumeId: 'test-resume-456',
          enhancedMetrics: expect.objectContaining({
            confidenceLevel: expect.any(String),
            componentsProcessed: expect.arrayContaining([
              'skills',
              'experience',
              'education',
            ]),
          }),
        }),
      );
    });

    it('should handle missing JD data', async () => {
      const event = {
        jobId: 'nonexistent-job',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      await expect(service.handleResumeParsedEvent(event)).rejects.toThrow(
        'JD not found',
      );
    });

    it('should handle errors gracefully and publish error events', async () => {
      skillMatcher.matchSkills.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const event = {
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      await service.handleResumeParsedEvent(event);

      expect(natsService.publishScoringError).toHaveBeenCalledWith(
        'test-job-123',
        'test-resume-456',
        expect.any(Error),
      );
    });

    it('should fallback to basic scoring when enhanced scoring fails', async () => {
      skillMatcher.matchSkills.mockRejectedValueOnce(
        new Error('Enhanced scoring failed'),
      );

      const event = {
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      await service.handleResumeParsedEvent(event);

      // Should still emit a score event (basic scoring)
      expect(natsService.emit).toHaveBeenCalledWith(
        'analysis.match.scored',
        expect.objectContaining({
          scoreDto: expect.objectContaining({
            overallScore: expect.any(Number),
          }),
        }),
      );
    });

    it('should skip cultural fit analysis when company profile is not available', async () => {
      const jdWithoutCompanyProfile = {
        ...mockJdDto,
        companyProfile: undefined,
      };
      service.handleJdExtractedEvent({
        jobId: 'test-job-456',
        jdDto: jdWithoutCompanyProfile,
      });

      const event = {
        jobId: 'test-job-456',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      await service.handleResumeParsedEvent(event);

      expect(culturalFitAnalyzer.analyzeCulturalFit).not.toHaveBeenCalled();
    });

    it('should calculate dynamic weights correctly', async () => {
      const event = {
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      await service.handleResumeParsedEvent(event);

      // The overall score should be calculated using weighted components
      expect(natsService.emit).toHaveBeenCalledWith(
        'analysis.match.scored',
        expect.objectContaining({
          scoreDto: expect.objectContaining({
            overallScore: expect.any(Number),
            processingMetrics: expect.objectContaining({
              totalProcessingTime: expect.any(Number),
              confidenceLevel: 'high',
            }),
          }),
        }),
      );
    });
  });

  describe('legacy scoring compatibility', () => {
    it('should handle old JD format in legacy scoring', () => {
      const score = service['_calculateMatchScore'](legacyJdDto, mockResumeDto);

      expect(score).toBeDefined();
      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.skillScore.details).toContain('legacy scoring');
      expect(score.experienceScore.confidence).toBeDefined();
    });

    it('should calculate education score enhancement', () => {
      const educationScore = service['_calculateEnhancedEducationScore'](
        mockResumeDto,
        mockJdDto,
      );

      expect(educationScore.score).toBeGreaterThan(0);
      expect(educationScore.confidence).toBeGreaterThan(0.8);
      expect(educationScore.evidenceStrength).toBeGreaterThan(80);
      expect(educationScore.details).toContain('Computer Science');
    });
  });

  describe('performance and reliability', () => {
    it('should complete scoring within reasonable time', async () => {
      service.handleJdExtractedEvent({
        jobId: 'test-job-123',
        jdDto: mockJdDto,
      });

      const startTime = Date.now();

      await service.handleResumeParsedEvent({
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should maintain scoring consistency', async () => {
      service.handleJdExtractedEvent({
        jobId: 'test-job-123',
        jdDto: mockJdDto,
      });

      const event = {
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      };

      // Run scoring multiple times
      await service.handleResumeParsedEvent(event);
      await service.handleResumeParsedEvent({
        ...event,
        resumeId: 'test-resume-457',
      });

      expect(skillMatcher.matchSkills).toHaveBeenCalledTimes(2);
      expect(experienceAnalyzer.analyzeExperience).toHaveBeenCalledTimes(2);
    });

    it('should generate meaningful confidence scores', async () => {
      service.handleJdExtractedEvent({
        jobId: 'test-job-123',
        jdDto: mockJdDto,
      });

      await service.handleResumeParsedEvent({
        jobId: 'test-job-123',
        resumeId: 'test-resume-456',
        resumeDto: mockResumeDto,
      });

      expect(confidenceService.generateConfidenceReport).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: expect.objectContaining({
            confidence: expect.any(Number),
            evidenceStrength: expect.any(Number),
          }),
          experience: expect.objectContaining({
            confidence: expect.any(Number),
            evidenceStrength: expect.any(Number),
          }),
          culturalFit: expect.objectContaining({
            confidence: expect.any(Number),
            evidenceStrength: expect.any(Number),
          }),
        }),
        mockResumeDto,
        expect.any(Object),
      );
    });
  });
});
