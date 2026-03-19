import { Test } from '@nestjs/testing';
import { DataQualityService } from './data-quality.service';
import type { ResumeDTO } from './confidence.types';

describe('DataQualityService', () => {
  let service: DataQualityService;

  const createMockResume = (overrides: Partial<ResumeDTO> = {}): ResumeDTO => ({
    contactInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
    },
    workExperience: [
      {
        company: 'Tech Corp',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: 'present',
        summary:
          'Led development of core platform features with extensive technical details and achievements',
      },
      {
        company: 'Startup Inc',
        position: 'Junior Developer',
        startDate: '2018-06-01',
        endDate: '2019-12-31',
        summary:
          'Developed frontend components using React and TypeScript with good documentation',
      },
    ],
    education: [
      {
        school: 'University of Technology',
        degree: "Bachelor's Degree",
        major: 'Computer Science',
      },
    ],
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'Python',
      'AWS',
      'Docker',
      'Kubernetes',
      'GraphQL',
      'PostgreSQL',
      'MongoDB',
      'Redis',
    ],
    ...overrides,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [DataQualityService],
    }).compile();

    service = module.get<DataQualityService>(DataQualityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('assessDataQuality', () => {
    it('should return complete assessment with score, factors, and issues', () => {
      const resume = createMockResume();

      const result = service.assessDataQuality(resume);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('issues');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate factors with completeness, consistency, recency, and detail', () => {
      const resume = createMockResume();

      const result = service.assessDataQuality(resume);

      expect(result.factors).toHaveProperty('completeness');
      expect(result.factors).toHaveProperty('consistency');
      expect(result.factors).toHaveProperty('recency');
      expect(result.factors).toHaveProperty('detail');
    });

    it('should calculate overall score with correct weights', () => {
      const resume = createMockResume();

      const result = service.assessDataQuality(resume);

      const expectedScore = Math.round(
        result.factors.completeness * 0.3 +
          result.factors.consistency * 0.25 +
          result.factors.recency * 0.2 +
          result.factors.detail * 0.25,
      );

      expect(result.score).toBe(expectedScore);
    });
  });

  describe('assessCompleteness', () => {
    it('should return 100 for complete resume', () => {
      const resume = createMockResume();

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(100);
    });

    it('should penalize missing name', () => {
      const resume = createMockResume({
        contactInfo: {
          name: '',
          email: 'john@example.com',
          phone: '123-456-7890',
        },
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(85); // 100 - 15
    });

    it('should penalize missing email', () => {
      const resume = createMockResume({
        contactInfo: {
          name: 'John Doe',
          email: '',
          phone: '123-456-7890',
        },
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(85); // 100 - 15
    });

    it('should penalize missing phone', () => {
      const resume = createMockResume({
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '',
        },
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(90); // 100 - 10
    });

    it('should penalize all missing contact info', () => {
      const resume = createMockResume({
        contactInfo: {
          name: '',
          email: '',
          phone: '',
        },
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(60); // 100 - 15 - 15 - 10
    });

    it('should penalize no work experience', () => {
      const resume = createMockResume({
        workExperience: [],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(70); // 100 - 30
    });

    it('should penalize incomplete work experience entries', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: '',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Some summary',
          },
        ],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(80); // 100 - 20 for incomplete entry
    });

    it('should penalize no education', () => {
      const resume = createMockResume({
        education: [],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(85); // 100 - 15
    });

    it('should penalize incomplete education entries', () => {
      const resume = createMockResume({
        education: [
          {
            school: '',
            degree: "Bachelor's Degree",
            major: 'Computer Science',
          },
        ],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(90); // 100 - 10
    });

    it('should penalize no skills', () => {
      const resume = createMockResume({
        skills: [],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(80); // 100 - 20
    });

    it('should penalize less than 5 skills', () => {
      const resume = createMockResume({
        skills: ['JavaScript', 'TypeScript', 'React'],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(90); // 100 - 10
    });

    it('should not go below 0 even with all missing', () => {
      const resume = createMockResume({
        contactInfo: { name: '', email: '', phone: '' },
        workExperience: [],
        education: [],
        skills: [],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(0);
    });

    it('should calculate completeness with partial work experience penalty', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: '',
          },
          {
            company: '',
            position: '',
            startDate: '',
            endDate: '',
            summary: '',
          },
        ],
      });

      const result = (service as any).assessCompleteness(resume);

      expect(result).toBe(80); // 100 - 20 for incomplete entries
    });
  });

  describe('assessConsistency', () => {
    it('should return 100 for consistent resume', () => {
      const resume = createMockResume();

      const result = (service as any).assessConsistency(resume);

      expect(result).toBe(100);
    });

    it('should detect date inconsistencies', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2022-01-01',
            endDate: '2020-12-31', // End before start
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBeLessThan(100);
    });

    it('should detect future start dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: futureDate.toISOString().split('T')[0],
            endDate: 'present',
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBeLessThan(100);
    });

    it('should detect overlapping positions', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
          {
            company: 'Another Corp',
            position: 'Developer',
            startDate: '2019-06-01',
            endDate: '2021-12-31', // Overlaps with Tech Corp
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBeLessThan(100);
    });

    it('should check skill consistency with work experience', () => {
      const resume = createMockResume({
        skills: ['JavaScript', 'TypeScript', 'COBOL', 'Fortran'], // Some not mentioned
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Worked with JavaScript and TypeScript',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBeLessThan(100);
    });

    it('should return 100 when all skills align with experience', () => {
      const resume = createMockResume({
        skills: ['JavaScript', 'TypeScript'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Worked extensively with JavaScript and TypeScript',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBe(100);
    });

    it('should return 100 for single work experience entry', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBe(100);
    });

    it('should handle invalid dates gracefully', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: 'invalid-date',
            endDate: 'present',
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBeLessThan(100);
    });

    it('should not go below 0', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2025-01-01',
            endDate: '2020-12-31',
            summary: 'Summary',
          },
          {
            company: 'Another Corp',
            position: 'Developer',
            startDate: '2026-01-01',
            endDate: '2021-12-31',
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessConsistency(resume);

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assessRecency', () => {
    it('should return 100 for current job (present)', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(100);
    });

    it('should return 100 for job ended within 3 months', () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: threeMonthsAgo.toISOString().split('T')[0],
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(100);
    });

    it('should return 90 for job ended 4-6 months ago', () => {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: fiveMonthsAgo.toISOString().split('T')[0],
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(90);
    });

    it('should return 80 for job ended 7-12 months ago', () => {
      const tenMonthsAgo = new Date();
      tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: tenMonthsAgo.toISOString().split('T')[0],
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(80);
    });

    it('should return 60 for job ended 13-24 months ago', () => {
      const eighteenMonthsAgo = new Date();
      eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: eighteenMonthsAgo.toISOString().split('T')[0],
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(60);
    });

    it('should return 40 for job ended more than 24 months ago', () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2015-01-01',
            endDate: threeYearsAgo.toISOString().split('T')[0],
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(40);
    });

    it('should return 50 for no work experience', () => {
      const resume = createMockResume({
        workExperience: [],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(50);
    });

    it('should use most recent job for calculation', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Old Corp',
            position: 'Developer',
            startDate: '2010-01-01',
            endDate: '2015-12-31',
            summary: 'Summary',
          },
          {
            company: 'Recent Corp',
            position: 'Senior Developer',
            startDate: '2016-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ],
      });

      const result = (service as any).assessRecency(resume);

      expect(result).toBe(100);
    });
  });

  describe('assessDetailLevel', () => {
    it('should calculate detail level based on work experience summaries', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'A'.repeat(100), // Long summary
          },
        ],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBeGreaterThan(0);
    });

    it('should give 25 points for summaries over 50 characters', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'A'.repeat(51),
          },
        ],
        education: [],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(25); // 25 / 1 item * 100
    });

    it('should give 15 points for summaries between 21-50 characters', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'A'.repeat(30),
          },
        ],
        education: [],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(15);
    });

    it('should give 5 points for summaries 20 characters or less', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Short',
          },
        ],
        education: [],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(5);
    });

    it('should give 0 points for missing summaries', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: '',
          },
        ],
        education: [],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(0);
    });

    it('should give 15 points for education with major', () => {
      const resume = createMockResume({
        workExperience: [],
        education: [
          {
            school: 'University',
            degree: "Bachelor's",
            major: 'Computer Science',
          },
        ],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(15);
    });

    it('should give 5 points for education without major', () => {
      const resume = createMockResume({
        workExperience: [],
        education: [
          {
            school: 'University',
            degree: "Bachelor's",
            major: '',
          },
        ],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(5);
    });

    it('should give 20 points for more than 10 skills', () => {
      const resume = createMockResume({
        workExperience: [],
        education: [],
        skills: Array(11).fill('skill'),
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(20);
    });

    it('should give 15 points for 6-10 skills', () => {
      const resume = createMockResume({
        workExperience: [],
        education: [],
        skills: Array(8).fill('skill'),
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(15);
    });

    it('should give 10 points for 1-5 skills', () => {
      const resume = createMockResume({
        workExperience: [],
        education: [],
        skills: ['skill1', 'skill2', 'skill3'],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(10);
    });

    it('should cap at 100 points', () => {
      const resume = createMockResume({
        workExperience: [
          {
            company: 'A',
            position: 'Dev',
            startDate: '2020-01',
            endDate: 'present',
            summary: 'A'.repeat(100),
          },
          {
            company: 'B',
            position: 'Dev',
            startDate: '2018-01',
            endDate: '2019-12',
            summary: 'B'.repeat(100),
          },
          {
            company: 'C',
            position: 'Dev',
            startDate: '2016-01',
            endDate: '2017-12',
            summary: 'C'.repeat(100),
          },
        ],
        education: [
          {
            school: 'Uni',
            degree: 'BS',
            major: 'CS',
          },
          {
            school: 'College',
            degree: 'AS',
            major: 'IT',
          },
        ],
        skills: Array(15).fill('skill'),
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(100);
    });

    it('should return 0 for empty resume', () => {
      const resume = createMockResume({
        workExperience: [],
        education: [],
        skills: [],
      });

      const result = (service as any).assessDetailLevel(resume);

      expect(result).toBe(0);
    });
  });

  describe('identifyDataQualityIssues', () => {
    it('should identify completeness issues', () => {
      const factors = {
        completeness: 60,
        consistency: 90,
        recency: 90,
        detail: 90,
      };
      const resume = createMockResume();

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain(
        'Missing critical information (contact, experience, or education)',
      );
    });

    it('should identify consistency issues', () => {
      const factors = {
        completeness: 90,
        consistency: 60,
        recency: 90,
        detail: 90,
      };
      const resume = createMockResume();

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain(
        'Inconsistencies in dates or career progression',
      );
    });

    it('should identify recency issues', () => {
      const factors = {
        completeness: 90,
        consistency: 90,
        recency: 60,
        detail: 90,
      };
      const resume = createMockResume();

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain('Resume may not reflect recent experience');
    });

    it('should identify detail issues', () => {
      const factors = {
        completeness: 90,
        consistency: 90,
        recency: 90,
        detail: 40,
      };
      const resume = createMockResume();

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain('Insufficient detail in job descriptions');
    });

    it('should identify no work experience', () => {
      const factors = {
        completeness: 90,
        consistency: 90,
        recency: 90,
        detail: 90,
      };
      const resume = createMockResume({ workExperience: [] });

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain('No work experience provided');
    });

    it('should identify very few skills', () => {
      const factors = {
        completeness: 90,
        consistency: 90,
        recency: 90,
        detail: 90,
      };
      const resume = createMockResume({ skills: ['skill1', 'skill2'] });

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain('Very few skills listed');
    });

    it('should return empty array when no issues', () => {
      const factors = {
        completeness: 90,
        consistency: 90,
        recency: 90,
        detail: 60,
      };
      const resume = createMockResume({
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ],
        skills: ['skill1', 'skill2', 'skill3', 'skill4'],
      });

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toHaveLength(0);
    });

    it('should identify multiple issues', () => {
      const factors = {
        completeness: 60,
        consistency: 60,
        recency: 60,
        detail: 40,
      };
      const resume = createMockResume({
        workExperience: [],
        skills: ['skill1'],
      });

      const result = (service as any).identifyDataQualityIssues(
        factors,
        resume,
      );

      expect(result).toContain(
        'Missing critical information (contact, experience, or education)',
      );
      expect(result).toContain(
        'Inconsistencies in dates or career progression',
      );
      expect(result).toContain('Resume may not reflect recent experience');
      expect(result).toContain('Insufficient detail in job descriptions');
      expect(result).toContain('No work experience provided');
      expect(result).toContain('Very few skills listed');
    });
  });

  describe('private helper methods', () => {
    describe('checkDateConsistency', () => {
      it('should return 0 for valid dates', () => {
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkDateConsistency(workExperience);

        expect(result).toBe(0);
      });

      it('should count start date after end date as inconsistency', () => {
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2022-01-01',
            endDate: '2020-12-31',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkDateConsistency(workExperience);

        expect(result).toBe(1);
      });

      it('should count future start date as inconsistency', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: futureDate.toISOString().split('T')[0],
            endDate: 'present',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkDateConsistency(workExperience);

        expect(result).toBe(1);
      });

      it('should handle invalid dates', () => {
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: 'invalid',
            endDate: 'present',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkDateConsistency(workExperience);

        expect(result).toBe(1);
      });
    });

    describe('checkProgressionConsistency', () => {
      it('should return 0 for single entry', () => {
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkProgressionConsistency(
          workExperience,
        );

        expect(result).toBe(0);
      });

      it('should return 0 for non-overlapping positions', () => {
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2018-01-01',
            endDate: '2019-12-31',
            summary: 'Summary',
          },
          {
            company: 'Another Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkProgressionConsistency(
          workExperience,
        );

        expect(result).toBe(0);
      });

      it('should count overlapping positions', () => {
        const workExperience = [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2018-01-01',
            endDate: '2021-12-31',
            summary: 'Summary',
          },
          {
            company: 'Another Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkProgressionConsistency(
          workExperience,
        );

        expect(result).toBe(1);
      });

      it('should sort by start date before checking overlaps', () => {
        const workExperience = [
          {
            company: 'Another Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Summary',
          },
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2018-01-01',
            endDate: '2021-12-31',
            summary: 'Summary',
          },
        ];

        const result = (service as any).checkProgressionConsistency(
          workExperience,
        );

        expect(result).toBe(1);
      });
    });

    describe('checkSkillConsistency', () => {
      it('should return 100 when no skills', () => {
        const resume = createMockResume({ skills: [] });

        const result = (service as any).checkSkillConsistency(resume);

        expect(result).toBe(100);
      });

      it('should return 100 when all skills mentioned in experience', () => {
        const resume = createMockResume({
          skills: ['JavaScript', 'React'],
          workExperience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: 'present',
              summary: 'Worked with JavaScript and React',
            },
          ],
        });

        const result = (service as any).checkSkillConsistency(resume);

        expect(result).toBe(100);
      });

      it('should return lower score when some skills not mentioned', () => {
        const resume = createMockResume({
          skills: ['JavaScript', 'React', 'COBOL', 'Fortran'],
          workExperience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: 'present',
              summary: 'Worked with JavaScript and React',
            },
          ],
        });

        const result = (service as any).checkSkillConsistency(resume);

        expect(result).toBe(50); // 2/4 = 50%
      });

      it('should return 0 when no skills mentioned', () => {
        const resume = createMockResume({
          skills: ['JavaScript', 'React'],
          workExperience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: 'present',
              summary: 'General development work',
            },
          ],
        });

        const result = (service as any).checkSkillConsistency(resume);

        expect(result).toBe(0);
      });

      it('should handle skills with dots (e.g., Node.js)', () => {
        const resume = createMockResume({
          skills: ['Node.js', 'Express.js'],
          workExperience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: 'present',
              summary: 'Worked with Nodejs and Expressjs',
            },
          ],
        });

        const result = (service as any).checkSkillConsistency(resume);

        expect(result).toBe(100);
      });

      it('should be case insensitive', () => {
        const resume = createMockResume({
          skills: ['JAVASCRIPT', 'REACT'],
          workExperience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: 'present',
              summary: 'Worked with javascript and react',
            },
          ],
        });

        const result = (service as any).checkSkillConsistency(resume);

        expect(result).toBe(100);
      });
    });
  });
});
