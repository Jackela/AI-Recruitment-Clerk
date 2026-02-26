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
const dateParserMock = jest.requireMock('./date-parser').DateParser;
const experienceCalculatorMock = jest.requireMock('./experience-calculator').ExperienceCalculator;

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

  it('normalizes with validation and reports mapping confidence', async () => {
    const rawOutput = {
      contactInfo: { name: '', email: 'not-an-email', phone: '123' },
      skills: [' TypeScript ', '', 42, 'TypeScript'],
      workExperience: [{ company: '', position: '', startDate: 'bad', endDate: 'bad' }],
      education: [{ school: '', degree: '' }],
    };

    const result = await service.normalizeWithValidation(rawOutput as unknown as Record<string, unknown>);

    expect(result.resumeDto.skills).toEqual(['TypeScript']);
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.mappingConfidence).toBeGreaterThanOrEqual(0);
    expect(result.mappingConfidence).toBeLessThanOrEqual(1);
  });

  it('maps contact info and sanitizes invalid fields', async () => {
    const contactInfo = await service.mapContactInfo({
      name: '1',
      email: ' JANE@EXAMPLE.COM ',
      phone: '123',
    });

    expect(contactInfo).toEqual({
      name: null,
      email: 'jane@example.com',
      phone: null,
    });
  });

  it('maps and sorts work experience while filtering invalid entries', async () => {
    dateParserMock.parseDate.mockImplementation((value: string) => {
      if (value === '2022-01-01') {
        return { date: new Date('2022-01-01T00:00:00.000Z'), isPresent: false, confidence: 1 };
      }
      if (value === '2018-01-01') {
        return { date: new Date('2018-01-01T00:00:00.000Z'), isPresent: false, confidence: 1 };
      }
      return { date: null, isPresent: false, confidence: 0 };
    });
    dateParserMock.normalizeToISO.mockImplementation((value: string) => value);

    const workExperience = await service.mapWorkExperience([
      { company: 'Old Co', position: 'Engineer', startDate: '2018-01-01', endDate: '2019-01-01' },
      { company: '', position: 'Ignored', startDate: '2020-01-01', endDate: '2021-01-01' },
      { company: 'New Co', position: 'Senior Engineer', startDate: '2022-01-01', endDate: 'present' },
    ]);

    expect(workExperience).toHaveLength(2);
    expect(workExperience[0]?.company).toBe('New Co');
    expect(workExperience[1]?.company).toBe('Old Co');
  });

  it('maps education and normalizes degree aliases', async () => {
    const education = await service.mapEducation([
      { institution: 'Tech University', degree: 'bsc', field: 'Computer Science' },
      { school: '', degree: '' },
    ]);

    expect(education).toEqual([
      {
        school: 'Tech University',
        degree: 'Bachelor of Science',
        major: 'Computer Science',
      },
    ]);
  });

  it('normalizes skills, de-duplicates and sorts by weight', async () => {
    skillsTaxonomyMock.normalizeSkill.mockImplementation((skill: string) => skill.trim());
    skillsTaxonomyMock.getSkillInfo.mockImplementation((skill: string) => {
      const metadata: Record<string, { category: string; weight: number }> = {
        TypeScript: { category: 'Programming', weight: 80 },
        JavaScript: { category: 'Programming', weight: 70 },
      };
      return metadata[skill] ?? null;
    });

    const normalized = await service.normalizeSkills(
      [' TypeScript ', 'JavaScript', 'TypeScript', '', 'x'.repeat(101)] as unknown[],
    );

    expect(normalized).toEqual(['TypeScript', 'JavaScript']);
  });

  it('normalizes dates and returns empty string for invalid input', async () => {
    dateParserMock.normalizeToISO.mockImplementation((value: string) => value);
    await expect(service.normalizeDates(' 2020-01-01 ')).resolves.toBe('2020-01-01');
    await expect(service.normalizeDates('')).resolves.toBe('');
  });

  it('returns fallback values when experience calculation fails', async () => {
    experienceCalculatorMock.analyzeExperience.mockImplementation(() => {
      throw new Error('calculation failed');
    });

    const result = await service.calculateExperience([
      {
        company: 'Acme',
        position: 'Engineer',
        startDate: '2020-01-01',
        endDate: '2021-01-01',
        summary: '',
      },
    ]);

    expect(result).toEqual({
      totalYears: 0,
      relevantYears: 0,
      seniorityLevel: 'Entry',
      confidenceScore: 0,
    });
  });

  it('extracts date ranges from text', async () => {
    dateParserMock.normalizeToISO.mockImplementation((value: string) => value.toLowerCase());
    dateParserMock.parseDate.mockImplementation(() => ({
      date: new Date('2020-01-01T00:00:00.000Z'),
      isPresent: false,
      confidence: 0.9,
    }));

    const result = await service.extractDates('Worked from 2020-01-01 - 2021-01-01 on backend systems.');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual({
      startDate: '2020-01-01',
      endDate: '2021-01-01',
      confidence: 0.9,
    });
  });

  it('validates resume data with detailed field-level errors', async () => {
    dateParserMock.parseDate.mockImplementation(() => ({
      date: null,
      isPresent: false,
      confidence: 0,
    }));

    const errors = await service.validateResumeData({
      contactInfo: { name: ' ', email: 'bad-email', phone: 'abc' },
      skills: ['', 'TypeScript'],
      workExperience: [
        {
          company: '',
          position: '',
          startDate: 'bad-date',
          endDate: 'bad-date',
          summary: '',
        },
      ],
      education: [{ school: '', degree: '', major: '' }],
    } as never);

    expect(errors).toEqual(expect.arrayContaining([
      'Contact name is missing or empty',
      'Email format is invalid',
      'Phone number format is invalid',
      'Skill at index 0 is invalid or empty',
      'Work experience 0: Company name is missing',
      'Work experience 0: Position title is missing',
      'Work experience 0: Invalid start date format',
      'Work experience 0: Invalid end date format',
      'Education 0: School name is missing',
      'Education 0: Degree is missing',
    ]));
  });

  it('returns validation error when unexpected exception occurs', async () => {
    const badResume = {};
    Object.defineProperty(badResume, 'contactInfo', {
      get() {
        throw new Error('unexpected failure');
      },
    });

    const errors = await service.validateResumeData(badResume as never);
    expect(errors).toEqual(['Validation error: unexpected failure']);
  });

  it('wraps errors in normalizeWithValidation when normalization fails', async () => {
    const badRawOutput = {};
    Object.defineProperty(badRawOutput, 'contactInfo', {
      get() {
        throw new Error('broken payload');
      },
    });

    await expect(
      service.normalizeWithValidation(badRawOutput as unknown as Record<string, unknown>),
    ).rejects.toThrow('Normalization with validation failed');
  });

  it('handles mapContactInfo fallback paths', async () => {
    await expect(service.mapContactInfo(null as unknown as Record<string, unknown>)).resolves.toEqual({
      name: null,
      email: null,
      phone: null,
    });

    const badContact = {};
    Object.defineProperty(badContact, 'name', {
      get() {
        throw new Error('bad contact');
      },
    });
    await expect(service.mapContactInfo(badContact as Record<string, unknown>)).resolves.toEqual({
      name: null,
      email: null,
      phone: null,
    });
  });

  it('handles mapWorkExperience fallback paths', async () => {
    await expect(service.mapWorkExperience(null as unknown as Record<string, unknown>[])).resolves.toEqual([]);

    const normalizeDatesSpy = jest.spyOn(service, 'normalizeDates').mockRejectedValue(new Error('failed date'));
    await expect(
      service.mapWorkExperience([{ company: 'Acme', position: 'Dev', startDate: '2020', endDate: '2021' }]),
    ).resolves.toEqual([]);
    normalizeDatesSpy.mockRestore();
  });

  it('handles mapEducation fallback paths and degree normalization branches', async () => {
    await expect(service.mapEducation(null as unknown as Record<string, unknown>[])).resolves.toEqual([]);

    const mapped = await service.mapEducation([
      { school: 'Institute', degree: 'doctor', fieldOfStudy: 'AI' },
      { school: 'Academy', degree: 'space law', fieldOfStudy: 'Law' },
    ]);
    expect(mapped).toEqual([
      { school: 'Institute', degree: 'Doctor of Philosophy', major: 'AI' },
      { school: 'Academy', degree: 'Space Law', major: 'Law' },
    ]);

    const badEducation = [{}];
    Object.defineProperty(badEducation[0], 'degree', {
      get() {
        throw new Error('bad degree');
      },
    });
    await expect(service.mapEducation(badEducation)).resolves.toEqual([]);
  });

  it('normalizes skills from string inputs and handles invalid skill containers', async () => {
    skillsTaxonomyMock.getSkillInfo.mockReturnValue({ category: 'Programming', weight: 50 });

    const fromString = await service.normalizeSkills(
      'TypeScript, JavaScript;Node.js' as unknown as unknown[],
    );
    expect(fromString).toEqual(['JavaScript', 'Node.js', 'TypeScript']);

    const fromInvalidInput = await service.normalizeSkills({ bad: true } as unknown as unknown[]);
    expect(fromInvalidInput).toEqual([]);
  });

  it('returns empty skills when taxonomy throws', async () => {
    skillsTaxonomyMock.normalizeSkill.mockImplementation(() => {
      throw new Error('taxonomy down');
    });

    await expect(service.normalizeSkills(['TypeScript'])).resolves.toEqual([]);
  });

  it('returns empty date when date parser throws', async () => {
    dateParserMock.normalizeToISO.mockImplementation(() => {
      throw new Error('date parsing error');
    });

    await expect(service.normalizeDates('2020-01-01')).resolves.toBe('');
  });

  it('returns calculated experience details on successful analysis', async () => {
    experienceCalculatorMock.analyzeExperience.mockImplementation(() => ({
      totalExperienceYears: 6,
      relevantExperienceYears: 4,
      seniorityLevel: 'Senior',
      confidenceScore: 0.95,
      overlappingPositions: [],
      experienceDetails: { totalPositions: 2 },
    }));

    const result = await service.calculateExperience([
      {
        company: 'Acme',
        position: 'Senior Engineer',
        startDate: '2018-01-01',
        endDate: 'present',
        summary: 'Led backend systems',
      },
    ], ['TypeScript']);

    expect(result).toEqual({
      totalYears: 6,
      relevantYears: 4,
      seniorityLevel: 'Senior',
      confidenceScore: 0.95,
    });
  });

  it('handles extractDates fallback paths', async () => {
    await expect(service.extractDates('' as unknown as string)).resolves.toEqual([]);

    const normalizeDatesSpy = jest.spyOn(service, 'normalizeDates').mockRejectedValue(new Error('extract failed'));
    await expect(service.extractDates('2020-01-01 - 2021-01-01')).resolves.toEqual([]);
    normalizeDatesSpy.mockRestore();
  });
});
