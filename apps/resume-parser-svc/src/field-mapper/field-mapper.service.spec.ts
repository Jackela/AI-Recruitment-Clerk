import { FieldMapperService } from './field-mapper.service';

jest.mock('@ai-recruitment-clerk/candidate-scoring-domain', () => {
  const mock = {
    normalizeSkill: jest.fn((skill: string) => skill.trim()),
    fuzzyMatchSkill: jest.fn((skill: string) => skill.trim()),
    categorize: jest.fn(() => 'General'),
    getSkillInfo: jest.fn(() => ({ name: 'Skill', category: 'General', weight: 10 })),
    calculateSkillScore: jest.fn(() => 50),
    groupSkillsByCategory: jest.fn(() => ({})),
    getRelatedSkills: jest.fn(() => []),
  };
  return { SkillsTaxonomy: mock };
});

jest.mock('./date-parser', () => {
  const mock = {
    parseDate: jest.fn(() => ({ date: new Date('2020-01-01'), isPresent: false, confidence: 1 })),
    normalizeToISO: jest.fn(() => '2020-01-01'),
    calculateDuration: jest.fn(() => ({ years: 1, months: 0, totalMonths: 12 })),
    isReasonableDate: jest.fn(() => true),
  };
  return { DateParser: mock };
});

jest.mock('./experience-calculator', () => {
  const mock = {
    analyzeExperience: jest.fn(() => ({
      totalExperienceYears: 1,
      seniorityLevel: 'Mid',
      confidenceScore: 0.8,
      overlappingPositions: [],
      experienceDetails: { totalPositions: 1 },
    })),
  };
  return { ExperienceCalculator: mock };
});

const skillsTaxonomyMock = jest.requireMock('@ai-recruitment-clerk/candidate-scoring-domain').SkillsTaxonomy;

describe('FieldMapperService (isolated)', () => {
  let service: FieldMapperService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FieldMapperService();
  });

  it('normalizes minimal resume content', async () => {
    const rawOutput = {
      contactInfo: { name: ' Jane Doe ', email: 'JANE@EXAMPLE.COM' },
      skills: [' JavaScript '],
      workExperience: [
        {
          company: ' ACME ',
          position: 'Developer',
          startDate: '2020-01-01',
          endDate: '2021-01-01',
        },
      ],
      education: [
        {
          school: 'State University',
          degree: 'BS',
          startDate: '2015',
          endDate: '2019',
        },
      ],
    };

    const result = await service.normalizeToResumeDto(rawOutput);

    expect(result.contactInfo.name).toBe('Jane Doe');
    expect(result.skills).toEqual(['JavaScript']);
    expect(result.workExperience).toHaveLength(1);
    expect(result.education).toHaveLength(1);
    expect(skillsTaxonomyMock.normalizeSkill).toHaveBeenCalled();
  });

  it('throws when raw output is not an object', async () => {
    await expect(service.normalizeToResumeDto(null)).rejects.toThrow(
      'Normalization failed: Invalid raw LLM output: must be an object',
    );
  });
});
