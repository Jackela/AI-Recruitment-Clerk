import { CulturalFitAnalyzerService, CompanyProfile } from './cultural-fit-analyzer.service';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import { JobRequirements } from './experience-analyzer.service';

describe('CulturalFitAnalyzerService', () => {
  const resume: ResumeDTO = {
    contactInfo: { name: 'Jane Candidate', email: 'jane@example.com', phone: '555-5555' },
    summary: 'Senior engineer with leadership background',
    skills: ['JavaScript', 'Leadership', 'Agile', 'Communication'],
    workExperience: [
      {
        company: 'Alpha Tech',
        position: 'Engineer',
        startDate: '2019-01-01',
        endDate: '2021-01-01',
        summary: 'Built scalable services and mentored juniors',
      },
      {
        company: 'Beta Labs',
        position: 'Engineering Lead',
        startDate: '2021-02-01',
        endDate: '2023-12-01',
        summary: 'Led cross-functional teams and drove cultural change',
      },
    ],
    education: [{ school: 'Tech University', degree: 'BS', major: 'Computer Science' }],
    certifications: ['AWS Architect'],
    languages: ['English'],
  };

  const companyProfile: CompanyProfile = {
    size: 'scaleup',
    culture: {
      values: ['collaboration', 'innovation'],
      workStyle: 'hybrid',
      decisionMaking: 'collaborative',
      innovation: 'high',
      growthStage: 'growth',
    },
    teamStructure: {
      teamSize: 25,
      managementLayers: 2,
      collaborationStyle: 'cross-functional',
    },
  };

  const jobRequirements: JobRequirements = {
    experienceYears: { min: 3, max: 8 },
    leadershipRequired: true,
    specificRoles: ['Engineering Lead'],
    requiredTechnologies: ['JavaScript'],
    seniority: 'senior',
  };

  const buildService = (mock?: jest.Mock) => {
    const geminiClient = {
      generateStructuredResponse: mock ?? jest.fn(),
    };
    return {
      service: new CulturalFitAnalyzerService(geminiClient as any),
      geminiMock: geminiClient.generateStructuredResponse as jest.Mock,
    };
  };

  it('falls back to heuristic analysis when Gemini responses fail', async () => {
    const { service, geminiMock } = buildService(jest.fn().mockRejectedValue(new Error('Timeout')));

    const result = await service.analyzeCulturalFit(resume, companyProfile, jobRequirements);

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.recommendations.strengths).toContain('Professional background');
    expect(result.recommendations.concerns).toContain('Limited cultural fit data');
    expect(geminiMock).toHaveBeenCalled();
  });

  it('uses AI responses when structured data is available', async () => {
    const indicatorsMock = {
      companySize: { preference: 'scaleup', confidence: 90, evidence: ['Prefers scaleups'] },
      workStyle: {
        remoteReadiness: 85,
        collaborationStyle: 'hybrid',
        adaptabilityScore: 80,
        evidence: ['Hybrid projects'],
      },
      communicationSkills: {
        writtenCommunication: 80,
        verbalCommunication: 78,
        presentationSkills: 82,
        evidence: ['Presented at conferences'],
      },
      leadershipPotential: {
        score: 88,
        style: 'collaborative',
        mentorshipEvidence: ['Mentored engineers'],
        teamBuildingEvidence: ['Grew a new team'],
      },
      innovationMindset: {
        score: 75,
        creativityIndicators: ['Proposed new product ideas'],
        problemSolvingApproach: 'analytical',
      },
      professionalMaturity: {
        score: 82,
        reliabilityIndicators: ['Consistent promotions'],
        accountability: 84,
        continuousLearning: 76,
      },
    };

    const softSkillsMock = {
      technicalCommunication: 88,
      problemSolving: 90,
      adaptability: 82,
      teamwork: 86,
      leadership: 84,
      timeManagement: 80,
      criticalThinking: 87,
      emotionalIntelligence: 83,
      evidence: {
        technicalCommunication: ['Documented APIs'],
        problemSolving: ['Resolved incidents'],
        adaptability: ['Worked across functions'],
        teamwork: ['Led squads'],
        leadership: ['Managed reports'],
        timeManagement: ['Delivered projects early'],
        criticalThinking: ['Improved processes'],
        emotionalIntelligence: ['Coached peers'],
      },
    };

    const recommendationsMock = {
      strengths: ['Strong communicator'],
      concerns: ['Limited healthcare experience'],
      developmentAreas: ['Executive presence'],
    };

    const { service, geminiMock } = buildService();
    geminiMock
      .mockResolvedValueOnce({ data: indicatorsMock })
      .mockResolvedValueOnce({ data: softSkillsMock })
      .mockResolvedValueOnce({ data: recommendationsMock });

    const result = await service.analyzeCulturalFit(resume, companyProfile, jobRequirements);

    expect(result.indicators).toEqual(indicatorsMock);
    expect(result.softSkills).toEqual(softSkillsMock);
    expect(result.recommendations).toEqual(recommendationsMock);
    expect(geminiMock).toHaveBeenCalledTimes(3);
  });
});
