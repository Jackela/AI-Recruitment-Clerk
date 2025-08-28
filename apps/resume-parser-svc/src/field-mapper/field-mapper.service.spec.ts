import { Test, TestingModule } from '@nestjs/testing';
import { FieldMapperService } from './field-mapper.service';
import { SkillsTaxonomy } from '../../../../libs/shared-dtos/src/skills/skills-taxonomy';
import { DateParser } from './date-parser';
import { ExperienceCalculator } from './experience-calculator';
import { ResumeDTO } from '../../../../libs/shared-dtos/src';

describe('FieldMapperService', () => {
  let service: FieldMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldMapperService],
    }).compile();

    service = module.get<FieldMapperService>(FieldMapperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeToResumeDto', () => {
    it('should normalize valid raw LLM output', async () => {
      const rawInput = {
        contactInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-123-4567'
        },
        skills: ['JavaScript', 'Python', 'React', 'Node.js'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Software Engineer',
            startDate: '2020-01',
            endDate: 'present',
            summary: 'Developed web applications using React and Node.js'
          }
        ],
        education: [
          {
            school: 'University of Technology',
            degree: 'Bachelor of Science',
            major: 'Computer Science'
          }
        ]
      };

      const result = await service.normalizeToResumeDto(rawInput);

      expect(result.contactInfo.name).toBe('John Doe');
      expect(result.contactInfo.email).toBe('john.doe@example.com');
      expect(result.skills).toContain('JavaScript');
      expect(result.skills).toContain('Python');
      expect(result.skills).toContain('React');
      expect(result.skills).toContain('Node.js');
      expect(result.workExperience).toHaveLength(1);
      expect(result.workExperience[0].company).toBe('Tech Corp');
      expect(result.workExperience[0].endDate).toBe('present');
      expect(result.education).toHaveLength(1);
      expect(result.education[0].degree).toBe('Bachelor of Science');
    });

    it('should handle missing or invalid input gracefully', async () => {
      const result = await service.normalizeToResumeDto({});

      expect(result.contactInfo).toEqual({ name: null, email: null, phone: null });
      expect(result.skills).toEqual([]);
      expect(result.workExperience).toEqual([]);
      expect(result.education).toEqual([]);
    });

    it('should throw error for invalid input', async () => {
      await expect(service.normalizeToResumeDto(null)).rejects.toThrow();
      await expect(service.normalizeToResumeDto('invalid')).rejects.toThrow();
    });
  });

  describe('normalizeWithValidation', () => {
    it('should return validation result with confidence score', async () => {
      const rawInput = {
        contactInfo: { name: 'Jane Smith', email: 'jane@example.com' },
        skills: ['JavaScript', 'React'],
        workExperience: [
          {
            company: 'StartupXYZ',
            position: 'Frontend Developer',
            startDate: '2021-03',
            endDate: '2023-12'
          }
        ],
        education: []
      };

      const result = await service.normalizeWithValidation(rawInput);

      expect(result.resumeDto).toBeDefined();
      expect(result.validationErrors).toBeDefined();
      expect(result.mappingConfidence).toBeGreaterThan(0);
      expect(result.mappingConfidence).toBeLessThanOrEqual(1);
    });

    it('should identify validation errors', async () => {
      const rawInput = {
        contactInfo: { email: 'invalid-email' },
        skills: [],
        workExperience: [
          {
            company: '',
            position: 'Developer'
          }
        ],
        education: []
      };

      const result = await service.normalizeWithValidation(rawInput);

      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.validationErrors.some(err => err.includes('name is missing'))).toBe(true);
      expect(result.validationErrors.some(err => err.includes('Email format is invalid'))).toBe(true);
      expect(result.validationErrors.some(err => err.includes('No skills found'))).toBe(true);
      expect(result.mappingConfidence).toBeLessThan(0.8);
    });
  });

  describe('mapContactInfo', () => {
    it('should normalize valid contact info', async () => {
      const rawContact = {
        name: '  John   Doe  ',
        email: '  JOHN.DOE@EXAMPLE.COM  ',
        phone: '(555) 123-4567'
      };

      const result = await service.mapContactInfo(rawContact);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('(555) 123-4567');
    });

    it('should handle invalid contact data', async () => {
      const rawContact = {
        name: 'X', // Too short
        email: 'invalid-email',
        phone: '123' // Too short
      };

      const result = await service.mapContactInfo(rawContact);

      expect(result.name).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('should handle missing contact data', async () => {
      const result = await service.mapContactInfo(null);

      expect(result.name).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });
  });

  describe('mapWorkExperience', () => {
    it('should map and sort work experience by date', async () => {
      const rawExperience = [
        {
          company: 'Company A',
          position: 'Junior Dev',
          startDate: '2019-01',
          endDate: '2021-01'
        },
        {
          company: 'Company B',
          position: 'Senior Dev',
          startDate: '2021-02',
          endDate: 'present'
        }
      ];

      const result = await service.mapWorkExperience(rawExperience);

      expect(result).toHaveLength(2);
      expect(result[0].company).toBe('Company B'); // More recent first
      expect(result[1].company).toBe('Company A');
    });

    it('should filter out incomplete experience entries', async () => {
      const rawExperience = [
        {
          company: 'Company A',
          position: 'Developer'
        },
        {
          company: '', // Missing company
          position: 'Developer'
        },
        {
          position: 'Developer' // Missing company
        }
      ];

      const result = await service.mapWorkExperience(rawExperience);

      expect(result).toHaveLength(1);
      expect(result[0].company).toBe('Company A');
    });

    it('should handle non-array input', async () => {
      const result = await service.mapWorkExperience('not an array' as any);
      expect(result).toEqual([]);
    });
  });

  describe('mapEducation', () => {
    it('should map education data', async () => {
      const rawEducation = [
        {
          school: 'MIT',
          degree: 'BS',
          major: 'Computer Science'
        },
        {
          institution: 'Stanford', // Alternative field name
          degree: 'Masters',
          field: 'Machine Learning' // Alternative field name
        }
      ];

      const result = await service.mapEducation(rawEducation);

      expect(result).toHaveLength(2);
      expect(result[0].school).toBe('MIT');
      expect(result[0].degree).toBe('Bachelor of Science'); // Normalized
      expect(result[1].school).toBe('Stanford');
      expect(result[1].major).toBe('Machine Learning');
    });

    it('should filter out incomplete education entries', async () => {
      const rawEducation = [
        {
          school: 'MIT',
          degree: 'BS'
        },
        {
          school: '', // Missing school
          degree: 'MS'
        },
        {
          school: 'Stanford'
          // Missing degree
        }
      ];

      const result = await service.mapEducation(rawEducation);

      expect(result).toHaveLength(1);
      expect(result[0].school).toBe('MIT');
    });
  });

  describe('normalizeSkills', () => {
    it('should normalize and deduplicate skills', async () => {
      const rawSkills = ['JavaScript', 'js', 'React', 'reactjs', 'Python', 'python'];

      const result = await service.normalizeSkills(rawSkills);

      expect(result).toContain('JavaScript');
      expect(result).toContain('React');
      expect(result).toContain('Python');
      expect(result.length).toBeLessThan(rawSkills.length); // Should deduplicate
    });

    it('should handle string input by splitting', async () => {
      const rawSkills = 'JavaScript, Python, React, Node.js';

      const result = await service.normalizeSkills(rawSkills as any);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit skills to reasonable number', async () => {
      const rawSkills = Array.from({ length: 100 }, (_, i) => `Skill${i}`);

      const result = await service.normalizeSkills(rawSkills);

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle non-array input', async () => {
      const result = await service.normalizeSkills(123 as any);
      expect(result).toEqual([]);
    });

    it('should filter out empty and overly long skills', async () => {
      const rawSkills = [
        'JavaScript',
        '',
        '   ',
        'A'.repeat(150), // Too long
        'Python'
      ];

      const result = await service.normalizeSkills(rawSkills);

      expect(result).toContain('JavaScript');
      expect(result).toContain('Python');
      expect(result.length).toBe(2);
    });
  });

  describe('normalizeDates', () => {
    it('should normalize various date formats', async () => {
      expect(await service.normalizeDates('2023-01-15')).toBe('2023-01-15');
      expect(await service.normalizeDates('01/15/2023')).toBe('2023-01-15');
      expect(await service.normalizeDates('January 2023')).toBe('2023-01-01');
      expect(await service.normalizeDates('present')).toBe('present');
      expect(await service.normalizeDates('current')).toBe('present');
    });

    it('should handle invalid dates', async () => {
      expect(await service.normalizeDates('')).toBe('');
      expect(await service.normalizeDates('invalid-date')).toBe('');
      expect(await service.normalizeDates(null as any)).toBe('');
    });
  });

  describe('calculateExperience', () => {
    it('should calculate experience from work history', async () => {
      const workExperience: ResumeDTO['workExperience'] = [
        {
          company: 'Company A',
          position: 'Junior Developer',
          startDate: '2020-01-01',
          endDate: '2022-01-01',
          summary: 'Worked with JavaScript and React'
        },
        {
          company: 'Company B',
          position: 'Senior Developer',
          startDate: '2022-02-01',
          endDate: 'present',
          summary: 'Leading development team'
        }
      ];

      const result = await service.calculateExperience(workExperience, ['JavaScript', 'React']);

      expect(result.totalYears).toBeGreaterThan(0);
      expect(result.seniorityLevel).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should handle empty work experience', async () => {
      const result = await service.calculateExperience([]);

      expect(result.totalYears).toBe(0);
      expect(result.seniorityLevel).toBe('Entry');
      expect(result.confidenceScore).toBe(0);
    });
  });

  describe('extractDates', () => {
    it('should extract date ranges from text', async () => {
      const text = 'Worked at Company A from 2020-01 to 2022-12 and then at Company B from 2023-01 to present.';

      const result = await service.extractDates(text);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('startDate');
        expect(result[0]).toHaveProperty('endDate');
        expect(result[0]).toHaveProperty('confidence');
      }
    });

    it('should handle empty or invalid text', async () => {
      expect(await service.extractDates('')).toEqual([]);
      expect(await service.extractDates(null as any)).toEqual([]);
    });
  });

  describe('validateResumeData', () => {
    it('should pass validation for complete resume data', async () => {
      const validResume: ResumeDTO = {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1-555-123-4567'
        },
        skills: ['JavaScript', 'Python'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: '2023-01-01',
            summary: 'Software development'
          }
        ],
        education: [
          {
            school: 'University',
            degree: 'Bachelor of Science',
            major: 'Computer Science'
          }
        ]
      };

      const errors = await service.validateResumeData(validResume);

      expect(errors).toHaveLength(0);
    });

    it('should identify missing required fields', async () => {
      const incompleteResume: ResumeDTO = {
        contactInfo: {
          name: null,
          email: 'invalid-email',
          phone: null
        },
        skills: [],
        workExperience: [
          {
            company: '',
            position: '',
            startDate: '',
            endDate: '',
            summary: ''
          }
        ],
        education: []
      };

      const errors = await service.validateResumeData(incompleteResume);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(err => err.includes('name is missing'))).toBe(true);
      expect(errors.some(err => err.includes('Email format is invalid'))).toBe(true);
      expect(errors.some(err => err.includes('No skills found'))).toBe(true);
    });

    it('should validate date formats', async () => {
      const resumeWithInvalidDates: ResumeDTO = {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: null
        },
        skills: ['JavaScript'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: 'invalid-date',
            endDate: 'another-invalid-date',
            summary: 'Software development'
          }
        ],
        education: []
      };

      const errors = await service.validateResumeData(resumeWithInvalidDates);

      expect(errors.some(err => err.includes('Invalid start date format'))).toBe(true);
      expect(errors.some(err => err.includes('Invalid end date format'))).toBe(true);
    });
  });
});

describe('SkillsTaxonomy', () => {
  describe('normalizeSkill', () => {
    it('should normalize known skills', () => {
      expect(SkillsTaxonomy.normalizeSkill('javascript')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('JS')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('reactjs')).toBe('React');
      expect(SkillsTaxonomy.normalizeSkill('nodejs')).toBe('Node.js');
    });

    it('should handle unknown skills', () => {
      const unknownSkill = 'UnknownFramework';
      const normalized = SkillsTaxonomy.normalizeSkill(unknownSkill);
      expect(normalized).toBe(unknownSkill);
    });

    it('should perform fuzzy matching', () => {
      const fuzzyMatch = SkillsTaxonomy.fuzzyMatchSkill('Javasript'); // Typo
      expect(fuzzyMatch).toBe('JavaScript');
    });

    it('should handle empty or invalid input', () => {
      expect(SkillsTaxonomy.normalizeSkill('')).toBe('');
      expect(SkillsTaxonomy.normalizeSkill(null as any)).toBe('');
      expect(SkillsTaxonomy.normalizeSkill(undefined as any)).toBe('');
    });
  });

  describe('getSkillInfo', () => {
    it('should return skill information', () => {
      const skillInfo = SkillsTaxonomy.getSkillInfo('JavaScript');
      expect(skillInfo).toBeDefined();
      expect(skillInfo?.category).toBe('Programming Languages');
      expect(skillInfo?.weight).toBeGreaterThan(0);
    });

    it('should return null for unknown skills', () => {
      const skillInfo = SkillsTaxonomy.getSkillInfo('UnknownSkill');
      expect(skillInfo).toBeNull();
    });
  });

  describe('calculateSkillScore', () => {
    it('should calculate skill scores', () => {
      const skills = ['JavaScript', 'Python', 'React', 'Node.js'];
      const score = SkillsTaxonomy.calculateSkillScore(skills);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for empty skills', () => {
      expect(SkillsTaxonomy.calculateSkillScore([])).toBe(0);
      expect(SkillsTaxonomy.calculateSkillScore(null as any)).toBe(0);
    });
  });

  describe('groupSkillsByCategory', () => {
    it('should group skills by category', () => {
      const skills = ['JavaScript', 'Python', 'React', 'PostgreSQL'];
      const grouped = SkillsTaxonomy.groupSkillsByCategory(skills);
      
      expect(grouped['Programming Languages']).toBeDefined();
      expect(grouped['Frameworks & Libraries']).toBeDefined();
      expect(grouped['Databases']).toBeDefined();
    });
  });

  describe('getRelatedSkills', () => {
    it('should return related skills', () => {
      const related = SkillsTaxonomy.getRelatedSkills('JavaScript');
      expect(Array.isArray(related)).toBe(true);
      expect(related.length).toBeGreaterThan(0);
    });
  });
});

describe('DateParser', () => {
  describe('parseDate', () => {
    it('should parse various date formats', () => {
      const isoDate = DateParser.parseDate('2023-01-15');
      expect(isoDate.date).toBeInstanceOf(Date);
      expect(isoDate.confidence).toBeGreaterThan(0.9);

      const usDate = DateParser.parseDate('01/15/2023');
      expect(usDate.date).toBeInstanceOf(Date);

      const monthYear = DateParser.parseDate('January 2023');
      expect(monthYear.date).toBeInstanceOf(Date);

      const present = DateParser.parseDate('present');
      expect(present.isPresent).toBe(true);
    });

    it('should handle invalid dates', () => {
      const invalid = DateParser.parseDate('invalid-date');
      expect(invalid.date).toBeNull();
      expect(invalid.confidence).toBe(0);
    });

    it('should handle empty or null input', () => {
      const empty = DateParser.parseDate('');
      expect(empty.date).toBeNull();
      expect(empty.confidence).toBe(0);

      const nullInput = DateParser.parseDate(null as any);
      expect(nullInput.date).toBeNull();
      expect(nullInput.confidence).toBe(0);
    });
  });

  describe('normalizeToISO', () => {
    it('should normalize dates to ISO format', () => {
      expect(DateParser.normalizeToISO('01/15/2023')).toBe('2023-01-15');
      expect(DateParser.normalizeToISO('present')).toBe('present');
      expect(DateParser.normalizeToISO('January 2023')).toBe('2023-01-01');
    });

    it('should handle invalid dates', () => {
      expect(DateParser.normalizeToISO('invalid-date')).toBe('');
      expect(DateParser.normalizeToISO('')).toBe('');
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration between dates', () => {
      const startDate = DateParser.parseDate('2020-01-01');
      const endDate = DateParser.parseDate('2023-01-01');
      
      const duration = DateParser.calculateDuration(startDate, endDate);
      
      expect(duration.years).toBe(3);
      expect(duration.months).toBe(0);
      expect(duration.totalMonths).toBe(36);
    });

    it('should handle present end date', () => {
      const startDate = DateParser.parseDate('2020-01-01');
      const endDate = DateParser.parseDate('present');
      
      const duration = DateParser.calculateDuration(startDate, endDate);
      
      expect(duration.totalMonths).toBeGreaterThan(0);
    });
  });

  describe('isReasonableDate', () => {
    it('should validate reasonable dates', () => {
      const validDate = DateParser.parseDate('2020-01-01');
      expect(DateParser.isReasonableDate(validDate)).toBe(true);

      const presentDate = DateParser.parseDate('present');
      expect(DateParser.isReasonableDate(presentDate)).toBe(true);

      const oldDate = DateParser.parseDate('1940-01-01');
      expect(DateParser.isReasonableDate(oldDate)).toBe(false);

      const futureDate = DateParser.parseDate('2030-01-01');
      expect(DateParser.isReasonableDate(futureDate)).toBe(false);
    });
  });
});

describe('ExperienceCalculator', () => {
  describe('analyzeExperience', () => {
    it('should analyze work experience', () => {
      const workExperience: ResumeDTO['workExperience'] = [
        {
          company: 'Tech Corp',
          position: 'Senior Software Engineer',
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          summary: 'Led development of web applications using React and Node.js'
        },
        {
          company: 'StartupXYZ',
          position: 'Full Stack Developer',
          startDate: '2018-06-01',
          endDate: '2019-12-01',
          summary: 'Developed and maintained web applications'
        }
      ];

      const analysis = ExperienceCalculator.analyzeExperience(workExperience, ['React', 'Node.js']);

      expect(analysis.totalExperienceYears).toBeGreaterThan(0);
      expect(analysis.seniorityLevel).toBeDefined();
      expect(['Entry', 'Mid', 'Senior', 'Expert']).toContain(analysis.seniorityLevel);
      expect(analysis.confidenceScore).toBeGreaterThan(0);
      expect(analysis.experienceDetails.totalPositions).toBe(2);
    });

    it('should handle empty experience', () => {
      const analysis = ExperienceCalculator.analyzeExperience([]);

      expect(analysis.totalExperienceYears).toBe(0);
      expect(analysis.seniorityLevel).toBe('Entry');
      expect(analysis.experienceDetails.totalPositions).toBe(0);
    });

    it('should detect overlapping positions', () => {
      const overlappingExperience: ResumeDTO['workExperience'] = [
        {
          company: 'Company A',
          position: 'Developer',
          startDate: '2020-01-01',
          endDate: '2021-06-01',
          summary: 'Full-time role'
        },
        {
          company: 'Company B',
          position: 'Consultant',
          startDate: '2021-03-01', // Overlaps with Company A
          endDate: '2021-12-01',
          summary: 'Part-time consulting'
        }
      ];

      const analysis = ExperienceCalculator.analyzeExperience(overlappingExperience);

      expect(analysis.overlappingPositions.length).toBeGreaterThan(0);
    });
  });

  describe('getExperienceSummary', () => {
    it('should generate experience summary', () => {
      const analysis = ExperienceCalculator.analyzeExperience([
        {
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: '2020-01-01',
          endDate: 'present',
          summary: 'Software development'
        }
      ]);

      const summary = ExperienceCalculator.getExperienceSummary(analysis);

      expect(summary).toContain('years total experience');
      expect(summary).toContain('level');
      expect(typeof summary).toBe('string');
    });

    it('should handle no experience', () => {
      const analysis = ExperienceCalculator.analyzeExperience([]);
      const summary = ExperienceCalculator.getExperienceSummary(analysis);

      expect(summary).toBe('No work experience found');
    });
  });
});