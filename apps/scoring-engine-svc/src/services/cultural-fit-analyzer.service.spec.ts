import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type {
  CompanyProfile,
  CulturalFitIndicators,
  SoftSkillsAssessment} from './cultural-fit-analyzer.service';
import {
  CulturalFitAnalyzerService
} from './cultural-fit-analyzer.service';
import { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type { JobRequirements } from './experience-analyzer.service';

describe('CulturalFitAnalyzerService', () => {
  let service: CulturalFitAnalyzerService;
  let geminiClient: jest.Mocked<GeminiClient>;

  const mockCompanyProfile: CompanyProfile = {
    size: 'scaleup',
    culture: {
      values: ['innovation', 'collaboration', 'customer-focus'],
      workStyle: 'hybrid',
      decisionMaking: 'collaborative',
      innovation: 'high',
      growthStage: 'growth',
    },
    teamStructure: {
      teamSize: 15,
      managementLayers: 2,
      collaborationStyle: 'cross-functional',
    },
  };

  const mockJobRequirements: JobRequirements = {
    experienceYears: { min: 3, max: 7 },
    requiredIndustries: ['fintech', 'e-commerce'],
    preferredIndustries: ['tech', 'saas'],
    leadershipRequired: false,
    specificRoles: ['Full Stack Developer', 'Senior Developer'],
    requiredTechnologies: ['JavaScript', 'React', 'Node.js'],
    seniority: 'senior',
  };

  const mockResume: ResumeDTO = {
    contactInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-0123',
    },
    workExperience: [
      {
        company: 'Tech Startup',
        position: 'Senior Full Stack Developer',
        startDate: '2020-01-01',
        endDate: 'present',
        summary:
          'Led development team of 5 engineers, implemented microservices architecture, mentored junior developers, conducted code reviews, and improved deployment pipeline reducing release time by 50%',
      },
      {
        company: 'Digital Agency',
        position: 'Full Stack Developer',
        startDate: '2018-01-01',
        endDate: '2020-01-01',
        summary:
          'Developed client-facing applications using React and Node.js, collaborated with cross-functional teams, participated in agile ceremonies, and contributed to technical documentation',
      },
    ],
    education: [
      {
        school: 'University of Technology',
        degree: 'Bachelor',
        major: 'Computer Science',
      },
    ],
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'AWS',
      'Docker',
      'Leadership',
      'Agile',
    ],
  };

  const mockCulturalIndicators: CulturalFitIndicators = {
    companySize: {
      preference: 'scaleup',
      confidence: 85,
      evidence: ['Worked at Tech Startup', 'Experience with growing teams'],
    },
    workStyle: {
      remoteReadiness: 85,
      collaborationStyle: 'collaborative',
      adaptabilityScore: 88,
      evidence: ['Cross-functional collaboration', 'Agile experience'],
    },
    communicationSkills: {
      writtenCommunication: 80,
      verbalCommunication: 75,
      presentationSkills: 70,
      evidence: ['Technical documentation', 'Code reviews', 'Mentorship'],
    },
    leadershipPotential: {
      score: 85,
      style: 'collaborative',
      mentorshipEvidence: ['Mentored junior developers'],
      teamBuildingEvidence: ['Led development team of 5 engineers'],
    },
    innovationMindset: {
      score: 82,
      creativityIndicators: ['Implemented microservices architecture', 'Improved deployment pipeline'],
      problemSolvingApproach: 'systematic',
    },
    professionalMaturity: {
      score: 88,
      reliabilityIndicators: ['Consistent work history', 'Progressive responsibility'],
      accountability: 85,
      continuousLearning: 80,
    },
  };

  const mockSoftSkills: SoftSkillsAssessment = {
    technicalCommunication: 82,
    problemSolving: 88,
    adaptability: 85,
    teamwork: 90,
    leadership: 85,
    timeManagement: 80,
    criticalThinking: 84,
    emotionalIntelligence: 78,
    evidence: {
      technicalCommunication: ['Technical documentation', 'Code reviews'],
      problemSolving: ['Improved deployment pipeline', 'Implemented microservices'],
      adaptability: ['Agile ceremonies', 'Cross-functional teams'],
      teamwork: ['Collaborated with teams', 'Led team of 5'],
      leadership: ['Mentored junior developers', 'Led development team'],
      timeManagement: ['Reduced release time by 50%'],
      criticalThinking: ['Architecture decisions', 'Technical reviews'],
      emotionalIntelligence: ['Mentorship', 'Team collaboration'],
    },
  };

  beforeEach(async () => {
    geminiClient = {
      generateStructuredResponse: jest.fn(),
    } as unknown as jest.Mocked<GeminiClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CulturalFitAnalyzerService,
        {
          provide: GeminiClient,
          useValue: geminiClient,
        },
      ],
    }).compile();

    service = module.get<CulturalFitAnalyzerService>(CulturalFitAnalyzerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have a logger instance', () => {
      expect(service['logger']).toBeDefined();
    });

    it('should have geminiClient injected', () => {
      expect(service['geminiClient']).toBeDefined();
    });
  });

  describe('analyzeCulturalFit', () => {
    it('should perform complete cultural fit analysis successfully', async () => {
      geminiClient.generateStructuredResponse
        .mockResolvedValueOnce({ data: mockCulturalIndicators, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: mockSoftSkills, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({
          data: {
            strengths: ['Strong technical leadership', 'Excellent collaboration skills'],
            concerns: ['Limited enterprise experience'],
            developmentAreas: ['Public speaking', 'Strategic planning'],
          },
          processingTimeMs: 100,
          confidence: 0.9,
        });

      const result = await service.analyzeCulturalFit(mockResume, mockCompanyProfile, mockJobRequirements);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.indicators).toBeDefined();
      expect(result.softSkills).toBeDefined();
      expect(result.alignmentScores).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.recommendations).toBeDefined();
    });

    it('should call AI services with proper prompts', async () => {
      geminiClient.generateStructuredResponse
        .mockResolvedValueOnce({ data: mockCulturalIndicators, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: mockSoftSkills, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({
          data: {
            strengths: ['Strong skills'],
            concerns: [],
            developmentAreas: ['Communication'],
          },
          processingTimeMs: 100,
          confidence: 0.9,
        });

      await service.analyzeCulturalFit(mockResume, mockCompanyProfile, mockJobRequirements);

      expect(geminiClient.generateStructuredResponse).toHaveBeenCalledTimes(3);
      expect(geminiClient.generateStructuredResponse).toHaveBeenCalledWith(
        expect.stringContaining('WORK EXPERIENCE'),
        expect.any(String),
      );
    });

    it('should handle AI service failures gracefully', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.analyzeCulturalFit(mockResume, mockCompanyProfile, mockJobRequirements);

      expect(result).toBeDefined();
      expect(result.overallScore).toBe(60);
      expect(result.confidence).toBe(0.6);
      expect(result.recommendations.concerns).toContain('Limited analysis data');
    });

    it('should calculate alignment scores correctly', async () => {
      geminiClient.generateStructuredResponse
        .mockResolvedValueOnce({ data: mockCulturalIndicators, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: mockSoftSkills, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({
          data: {
            strengths: ['Good fit'],
            concerns: [],
            developmentAreas: [],
          },
          processingTimeMs: 100,
          confidence: 0.9,
        });

      const result = await service.analyzeCulturalFit(mockResume, mockCompanyProfile, mockJobRequirements);

      expect(result.alignmentScores.companySizeAlignment).toBeDefined();
      expect(result.alignmentScores.workStyleAlignment).toBeDefined();
      expect(result.alignmentScores.leadershipAlignment).toBeDefined();
      expect(result.alignmentScores.innovationAlignment).toBeDefined();
      expect(result.alignmentScores.communicationAlignment).toBeDefined();
    });
  });

  describe('Company Size Alignment', () => {
    it('should give perfect match for matching company size preference', () => {
      const alignment = service['calculateCompanySizeAlignment']('scaleup', 'scaleup');
      expect(alignment).toBe(100);
    });

    it('should give lower score for startup preference at enterprise', () => {
      const alignment = service['calculateCompanySizeAlignment']('startup', 'enterprise');
      expect(alignment).toBe(30);
    });

    it('should give high score for mixed preference', () => {
      const startupAlignment = service['calculateCompanySizeAlignment']('mixed', 'startup');
      const scaleupAlignment = service['calculateCompanySizeAlignment']('mixed', 'scaleup');
      const enterpriseAlignment = service['calculateCompanySizeAlignment']('mixed', 'enterprise');

      expect(startupAlignment).toBeGreaterThanOrEqual(85);
      expect(scaleupAlignment).toBeGreaterThanOrEqual(85);
      expect(enterpriseAlignment).toBeGreaterThanOrEqual(85);
    });

    it('should handle unknown preference with neutral score', () => {
      const alignment = service['calculateCompanySizeAlignment']('unknown', 'scaleup');
      expect(alignment).toBe(60);
    });

    it('should give reasonable cross-match scores', () => {
      const alignment = service['calculateCompanySizeAlignment']('scaleup', 'enterprise');
      expect(alignment).toBe(80);
    });
  });

  describe('Work Style Alignment', () => {
    it('should score high for remote-ready candidate and remote culture', () => {
      const workStyle: CulturalFitIndicators['workStyle'] = {
        remoteReadiness: 95,
        collaborationStyle: 'collaborative',
        adaptabilityScore: 90,
        evidence: [],
      };

      const culture: CompanyProfile['culture'] = {
        values: [],
        workStyle: 'remote',
        decisionMaking: 'collaborative',
        innovation: 'high',
        growthStage: 'growth',
      };

      const alignment = service['calculateWorkStyleAlignment'](workStyle, culture);
      expect(alignment).toBeGreaterThan(80);
    });

    it('should score well for low remote readiness with on-site culture', () => {
      const workStyle: CulturalFitIndicators['workStyle'] = {
        remoteReadiness: 30,
        collaborationStyle: 'independent',
        adaptabilityScore: 70,
        evidence: [],
      };

      const culture: CompanyProfile['culture'] = {
        values: [],
        workStyle: 'on-site',
        decisionMaking: 'autonomous',
        innovation: 'medium',
        growthStage: 'mature',
      };

      const alignment = service['calculateWorkStyleAlignment'](workStyle, culture);
      expect(alignment).toBeGreaterThan(70);
    });

    it('should boost score for matching collaboration styles', () => {
      const workStyle: CulturalFitIndicators['workStyle'] = {
        remoteReadiness: 70,
        collaborationStyle: 'collaborative',
        adaptabilityScore: 80,
        evidence: [],
      };

      const culture: CompanyProfile['culture'] = {
        values: [],
        workStyle: 'hybrid',
        decisionMaking: 'collaborative',
        innovation: 'medium',
        growthStage: 'growth',
      };

      const alignment = service['calculateWorkStyleAlignment'](workStyle, culture);
      expect(alignment).toBeGreaterThan(85);
    });

    it('should handle hybrid work style neutrally', () => {
      const workStyle: CulturalFitIndicators['workStyle'] = {
        remoteReadiness: 50,
        collaborationStyle: 'hybrid',
        adaptabilityScore: 70,
        evidence: [],
      };

      const culture: CompanyProfile['culture'] = {
        values: [],
        workStyle: 'hybrid',
        decisionMaking: 'hierarchical',
        innovation: 'low',
        growthStage: 'mature',
      };

      const alignment = service['calculateWorkStyleAlignment'](workStyle, culture);
      expect(alignment).toBeGreaterThanOrEqual(70);
    });

    it('should clamp scores to 0-100 range', () => {
      const workStyle: CulturalFitIndicators['workStyle'] = {
        remoteReadiness: 100,
        collaborationStyle: 'collaborative',
        adaptabilityScore: 100,
        evidence: [],
      };

      const culture: CompanyProfile['culture'] = {
        values: [],
        workStyle: 'remote',
        decisionMaking: 'collaborative',
        innovation: 'high',
        growthStage: 'growth',
      };

      const alignment = service['calculateWorkStyleAlignment'](workStyle, culture);
      expect(alignment).toBeLessThanOrEqual(100);
      expect(alignment).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Leadership Alignment', () => {
    it('should boost score for directive leadership in hierarchical structure', () => {
      const leadership: CulturalFitIndicators['leadershipPotential'] = {
        score: 80,
        style: 'directive',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      };

      const alignment = service['calculateLeadershipAlignment'](leadership, 4);
      expect(alignment).toBe(90);
    });

    it('should boost score for collaborative leadership in flat structure', () => {
      const leadership: CulturalFitIndicators['leadershipPotential'] = {
        score: 75,
        style: 'collaborative',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      };

      const alignment = service['calculateLeadershipAlignment'](leadership, 2);
      expect(alignment).toBe(90);
    });

    it('should boost score for servant leadership in minimal hierarchy', () => {
      const leadership: CulturalFitIndicators['leadershipPotential'] = {
        score: 70,
        style: 'servant',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      };

      const alignment = service['calculateLeadershipAlignment'](leadership, 1);
      expect(alignment).toBe(80);
    });

    it('should use base score when no style match', () => {
      const leadership: CulturalFitIndicators['leadershipPotential'] = {
        score: 65,
        style: 'transformational',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      };

      const alignment = service['calculateLeadershipAlignment'](leadership, 2);
      expect(alignment).toBe(65);
    });

    it('should clamp alignment scores to 0-100', () => {
      const highLeadership: CulturalFitIndicators['leadershipPotential'] = {
        score: 95,
        style: 'collaborative',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      };

      const alignment = service['calculateLeadershipAlignment'](highLeadership, 2);
      expect(alignment).toBeLessThanOrEqual(100);
    });
  });

  describe('Innovation Alignment', () => {
    it('should score perfectly when innovation matches high requirement', () => {
      const alignment = service['calculateInnovationAlignment'](85, 'high');
      expect(alignment).toBeGreaterThan(100);
    });

    it('should score well for medium innovation requirement', () => {
      const alignment = service['calculateInnovationAlignment'](65, 'medium');
      expect(alignment).toBeGreaterThan(100);
    });

    it('should score well for low innovation requirement', () => {
      const alignment = service['calculateInnovationAlignment'](45, 'low');
      expect(alignment).toBeGreaterThan(100);
    });

    it('should penalize low innovation score for high requirement', () => {
      const alignment = service['calculateInnovationAlignment'](40, 'high');
      expect(alignment).toBeLessThan(60);
    });

    it('should clamp score to maximum 100', () => {
      const alignment = service['calculateInnovationAlignment'](95, 'low');
      expect(alignment).toBe(100);
    });
  });

  describe('Communication Alignment', () => {
    it('should calculate base score from written and verbal communication', () => {
      const communication: CulturalFitIndicators['communicationSkills'] = {
        writtenCommunication: 80,
        verbalCommunication: 70,
        presentationSkills: 60,
        evidence: [],
      };

      const alignment = service['calculateCommunicationAlignment'](communication, 'siloed');
      expect(alignment).toBe(75); // (80 + 70) / 2
    });

    it('should boost score for high presentation skills in cross-functional teams', () => {
      const communication: CulturalFitIndicators['communicationSkills'] = {
        writtenCommunication: 70,
        verbalCommunication: 70,
        presentationSkills: 85,
        evidence: [],
      };

      const alignment = service['calculateCommunicationAlignment'](communication, 'cross-functional');
      expect(alignment).toBe(80); // (70 + 70) / 2 + 10
    });

    it('should boost score for high verbal skills in matrix organization', () => {
      const communication: CulturalFitIndicators['communicationSkills'] = {
        writtenCommunication: 70,
        verbalCommunication: 85,
        presentationSkills: 60,
        evidence: [],
      };

      const alignment = service['calculateCommunicationAlignment'](communication, 'matrix');
      expect(alignment).toBeGreaterThan(77);
    });

    it('should clamp score to maximum 100', () => {
      const communication: CulturalFitIndicators['communicationSkills'] = {
        writtenCommunication: 95,
        verbalCommunication: 95,
        presentationSkills: 95,
        evidence: [],
      };

      const alignment = service['calculateCommunicationAlignment'](communication, 'cross-functional');
      expect(alignment).toBe(100);
    });
  });

  describe('Overall Cultural Fit Score', () => {
    it('should calculate weighted average of alignment and soft skills', () => {
      const alignmentScores = {
        companySizeAlignment: 90,
        workStyleAlignment: 85,
        leadershipAlignment: 88,
        innovationAlignment: 92,
        communicationAlignment: 86,
      };

      const softSkills: SoftSkillsAssessment = {
        technicalCommunication: 80,
        problemSolving: 85,
        adaptability: 82,
        teamwork: 88,
        leadership: 84,
        timeManagement: 80,
        criticalThinking: 86,
        emotionalIntelligence: 78,
        evidence: {},
      };

      const overallScore = service['calculateOverallCulturalFitScore'](alignmentScores, softSkills);

      expect(overallScore).toBeGreaterThanOrEqual(0);
      expect(overallScore).toBeLessThanOrEqual(100);
      expect(overallScore).toBeGreaterThan(80);
    });

    it('should weight alignment more than soft skills (60-40 split)', () => {
      const highAlignment = {
        companySizeAlignment: 95,
        workStyleAlignment: 95,
        leadershipAlignment: 95,
        innovationAlignment: 95,
        communicationAlignment: 95,
      };

      const lowSoftSkills: SoftSkillsAssessment = {
        technicalCommunication: 40,
        problemSolving: 40,
        adaptability: 40,
        teamwork: 40,
        leadership: 40,
        timeManagement: 40,
        criticalThinking: 40,
        emotionalIntelligence: 40,
        evidence: {},
      };

      const score = service['calculateOverallCulturalFitScore'](highAlignment, lowSoftSkills);

      expect(score).toBeGreaterThan(60); // Should be closer to alignment due to 60% weight
    });

    it('should handle perfect scores correctly', () => {
      const perfectAlignment = {
        companySizeAlignment: 100,
        workStyleAlignment: 100,
        leadershipAlignment: 100,
        innovationAlignment: 100,
        communicationAlignment: 100,
      };

      const perfectSoftSkills: SoftSkillsAssessment = {
        technicalCommunication: 100,
        problemSolving: 100,
        adaptability: 100,
        teamwork: 100,
        leadership: 100,
        timeManagement: 100,
        criticalThinking: 100,
        emotionalIntelligence: 100,
        evidence: {},
      };

      const score = service['calculateOverallCulturalFitScore'](perfectAlignment, perfectSoftSkills);

      expect(score).toBe(100);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate base confidence of 0.8 for good resume', () => {
      const confidence = service['calculateCulturalFitConfidence'](
        mockCulturalIndicators,
        mockSoftSkills,
        mockResume,
      );

      expect(confidence).toBeGreaterThanOrEqual(0.7);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should reduce confidence for limited work experience', () => {
      const limitedResume: ResumeDTO = {
        ...mockResume,
        workExperience: [mockResume.workExperience[0]],
      };

      const confidence = service['calculateCulturalFitConfidence'](
        mockCulturalIndicators,
        mockSoftSkills,
        limitedResume,
      );

      expect(confidence).toBeLessThan(0.8);
    });

    it('should reduce confidence for missing job descriptions', () => {
      const noDescriptionResume: ResumeDTO = {
        ...mockResume,
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: '',
          },
          {
            company: 'Another Corp',
            position: 'Engineer',
            startDate: '2018-01-01',
            endDate: '2020-01-01',
            summary: 'Short',
          },
        ],
      };

      const confidence = service['calculateCulturalFitConfidence'](
        mockCulturalIndicators,
        mockSoftSkills,
        noDescriptionResume,
      );

      expect(confidence).toBeLessThan(0.7);
    });

    it('should increase confidence for strong evidence base', () => {
      const richEvidence: SoftSkillsAssessment = {
        ...mockSoftSkills,
        evidence: {
          technicalCommunication: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
          problemSolving: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
          adaptability: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
          teamwork: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
          leadership: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
          timeManagement: ['Evidence 1', 'Evidence 2'],
          criticalThinking: ['Evidence 1', 'Evidence 2'],
          emotionalIntelligence: ['Evidence 1', 'Evidence 2'],
        },
      };

      const confidence = service['calculateCulturalFitConfidence'](
        mockCulturalIndicators,
        richEvidence,
        mockResume,
      );

      expect(confidence).toBeGreaterThan(0.8);
    });

    it('should increase confidence for high company size confidence', () => {
      const highConfidenceIndicators: CulturalFitIndicators = {
        ...mockCulturalIndicators,
        companySize: {
          preference: 'scaleup',
          confidence: 95,
          evidence: ['Strong evidence'],
        },
      };

      const confidence = service['calculateCulturalFitConfidence'](
        highConfidenceIndicators,
        mockSoftSkills,
        mockResume,
      );

      expect(confidence).toBeGreaterThan(0.8);
    });

    it('should enforce minimum confidence of 0.4', () => {
      const minimalResume: ResumeDTO = {
        contactInfo: {
          name: 'Test',
          email: 'test@example.com',
          phone: '',
        },
        workExperience: [
          {
            company: 'Company',
            position: 'Position',
            startDate: '2023-01-01',
            endDate: '2023-06-01',
            summary: 'Short',
          },
        ],
        education: [],
        skills: [],
      };

      const minimalEvidence: SoftSkillsAssessment = {
        technicalCommunication: 50,
        problemSolving: 50,
        adaptability: 50,
        teamwork: 50,
        leadership: 50,
        timeManagement: 50,
        criticalThinking: 50,
        emotionalIntelligence: 50,
        evidence: {},
      };

      const confidence = service['calculateCulturalFitConfidence'](
        mockCulturalIndicators,
        minimalEvidence,
        minimalResume,
      );

      expect(confidence).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should provide fallback cultural indicators', () => {
      const fallback = service['fallbackCulturalIndicators'](mockResume);

      expect(fallback.companySize.preference).toBe('mixed');
      expect(fallback.companySize.confidence).toBe(50);
      expect(fallback.workStyle.collaborationStyle).toBe('hybrid');
      expect(fallback.leadershipPotential.style).toBe('collaborative');
    });

    it('should provide fallback soft skills assessment', () => {
      const fallback = service['fallbackSoftSkillsAssessment'](mockResume);

      expect(fallback.technicalCommunication).toBe(60);
      expect(fallback.problemSolving).toBe(60);
      expect(fallback.leadership).toBe(50);
      expect(fallback.evidence).toBeDefined();
      expect(Object.keys(fallback.evidence).length).toBe(8);
    });

    it('should provide complete fallback cultural fit analysis', () => {
      const fallback = service['fallbackCulturalFitAnalysis'](mockResume, mockCompanyProfile);

      expect(fallback.overallScore).toBe(60);
      expect(fallback.confidence).toBe(0.6);
      expect(fallback.alignmentScores.companySizeAlignment).toBe(60);
      expect(fallback.recommendations.strengths).toContain('Professional background');
      expect(fallback.recommendations.concerns).toContain('Limited analysis data');
    });
  });

  describe('AI Recommendations Generation', () => {
    it('should generate recommendations using AI', async () => {
      const mockRecommendations = {
        strengths: ['Strong technical skills', 'Leadership experience'],
        concerns: ['Limited enterprise exposure'],
        developmentAreas: ['Strategic thinking', 'Public speaking'],
      };

      geminiClient.generateStructuredResponse.mockResolvedValueOnce({
        data: mockRecommendations,
        processingTimeMs: 100,
        confidence: 0.9,
      });

      const alignmentScores = {
        companySizeAlignment: 85,
        workStyleAlignment: 90,
        leadershipAlignment: 88,
        innovationAlignment: 80,
        communicationAlignment: 85,
      };

      const recommendations = await service['generateRecommendations'](
        mockCulturalIndicators,
        mockSoftSkills,
        mockCompanyProfile,
        alignmentScores,
      );

      expect(recommendations.strengths).toHaveLength(2);
      expect(recommendations.concerns).toHaveLength(1);
      expect(recommendations.developmentAreas).toHaveLength(2);
    });

    it('should use fallback recommendations on AI failure', async () => {
      geminiClient.generateStructuredResponse.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const alignmentScores = {
        companySizeAlignment: 85,
        workStyleAlignment: 90,
        leadershipAlignment: 88,
        innovationAlignment: 80,
        communicationAlignment: 85,
      };

      const recommendations = await service['generateRecommendations'](
        mockCulturalIndicators,
        mockSoftSkills,
        mockCompanyProfile,
        alignmentScores,
      );

      expect(recommendations.strengths).toContain('Strong technical background');
      expect(recommendations.concerns).toContain('Limited cultural fit data');
      expect(recommendations.developmentAreas).toContain('Communication skills');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty work experience gracefully', async () => {
      const emptyResume: ResumeDTO = {
        ...mockResume,
        workExperience: [],
      };

      geminiClient.generateStructuredResponse.mockRejectedValue(new Error('No data'));

      const result = await service.analyzeCulturalFit(
        emptyResume,
        mockCompanyProfile,
        mockJobRequirements,
      );

      expect(result).toBeDefined();
      expect(result.overallScore).toBe(60);
    });

    it('should handle missing skills array', async () => {
      const noSkillsResume: ResumeDTO = {
        ...mockResume,
        skills: [],
      };

      geminiClient.generateStructuredResponse
        .mockResolvedValueOnce({ data: mockCulturalIndicators, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: mockSoftSkills, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({
          data: {
            strengths: ['Professional'],
            concerns: [],
            developmentAreas: [],
          },
          processingTimeMs: 100,
          confidence: 0.9,
        });

      const result = await service.analyzeCulturalFit(
        noSkillsResume,
        mockCompanyProfile,
        mockJobRequirements,
      );

      expect(result).toBeDefined();
    });

    it('should handle invalid AI responses gracefully', async () => {
      geminiClient.generateStructuredResponse
        .mockResolvedValueOnce({ data: null, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: undefined, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: {}, processingTimeMs: 100, confidence: 0.9 });

      const result = await service.analyzeCulturalFit(mockResume, mockCompanyProfile, mockJobRequirements);

      expect(result).toBeDefined();
      expect(result.overallScore).toBe(60);
    });

    it('should handle all alignment calculations with edge values', () => {
      const extremeAlignmentScores = {
        companySizeAlignment: 0,
        workStyleAlignment: 100,
        leadershipAlignment: 50,
        innovationAlignment: 0,
        communicationAlignment: 100,
      };

      const extremeSoftSkills: SoftSkillsAssessment = {
        technicalCommunication: 0,
        problemSolving: 100,
        adaptability: 50,
        teamwork: 0,
        leadership: 100,
        timeManagement: 50,
        criticalThinking: 0,
        emotionalIntelligence: 100,
        evidence: {},
      };

      const score = service['calculateOverallCulturalFitScore'](
        extremeAlignmentScores,
        extremeSoftSkills,
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle company profiles with different configurations', async () => {
      const startupProfile: CompanyProfile = {
        size: 'startup',
        culture: {
          values: ['agility', 'ownership'],
          workStyle: 'remote',
          decisionMaking: 'autonomous',
          innovation: 'high',
          growthStage: 'early',
        },
        teamStructure: {
          teamSize: 5,
          managementLayers: 1,
          collaborationStyle: 'cross-functional',
        },
      };

      geminiClient.generateStructuredResponse
        .mockResolvedValueOnce({ data: mockCulturalIndicators, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({ data: mockSoftSkills, processingTimeMs: 100, confidence: 0.9 })
        .mockResolvedValueOnce({
          data: {
            strengths: ['Startup fit'],
            concerns: [],
            developmentAreas: [],
          },
          processingTimeMs: 100,
          confidence: 0.9,
        });

      const result = await service.analyzeCulturalFit(mockResume, startupProfile, mockJobRequirements);

      expect(result).toBeDefined();
      expect(result.alignmentScores).toBeDefined();
    });

    it('should enforce confidence bounds between 0.4 and 1.0', () => {
      const extremeResume: ResumeDTO = {
        contactInfo: {
          name: 'Test',
          email: '',
          phone: '',
        },
        workExperience: [],
        education: [],
        skills: [],
      };

      const extremeEvidence: SoftSkillsAssessment = {
        technicalCommunication: 0,
        problemSolving: 0,
        adaptability: 0,
        teamwork: 0,
        leadership: 0,
        timeManagement: 0,
        criticalThinking: 0,
        emotionalIntelligence: 0,
        evidence: {},
      };

      const confidence = service['calculateCulturalFitConfidence'](
        mockCulturalIndicators,
        extremeEvidence,
        extremeResume,
      );

      expect(confidence).toBeGreaterThanOrEqual(0.4);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });
});
