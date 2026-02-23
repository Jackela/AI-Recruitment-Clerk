/**
 * Tests for ExperienceCalculator - Entry and Mid Level Detection
 *
 * This file contains tests for Entry and Mid level seniority detection.
 * For Senior/Expert level tests, see experience-calculator-seniority-senior-expert.spec.ts
 */

import { ExperienceCalculator } from './experience-calculator';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

function createWorkExperience(
  company: string,
  position: string,
  startDate: string,
  endDate: string,
  summary = 'Work summary',
): ResumeDTO['workExperience'][0] {
  return { company, position, startDate, endDate, summary };
}

describe('ExperienceCalculator - Entry and Mid Level', () => {
  describe('Entry level detection', () => {
    it('should detect Entry level for positions with entry-level keywords', () => {
      const keywords = [
        { title: 'Junior Developer', desc: 'junior' },
        { title: 'Associate Engineer', desc: 'associate' },
        { title: 'Trainee Developer', desc: 'trainee' },
        { title: 'Software Intern', desc: 'intern' },
        { title: 'Graduate Developer', desc: 'graduate' },
        { title: 'Assistant Engineer', desc: 'assistant' },
        { title: 'Level 1 Developer', desc: 'level 1' },
        { title: 'Engineer I', desc: 'I' },
      ];

      keywords.forEach(({ title }) => {
        const workExperience = [createWorkExperience('Company A', title, '2020-01-01', '2022-01-01')];
        const result = ExperienceCalculator.analyzeExperience(workExperience);
        expect(result.seniorityLevel).toBe('Entry');
      });
    });

    it('should detect Entry level for positions with 2 years or less experience', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', '2 years experience'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Entry');
    });

    it('should detect Entry level for positions with 1 year experience', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Software Developer', '2021-01-01', '2022-01-01', '1 year'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Entry');
    });
  });

  describe('Mid level detection', () => {
    it('should detect Mid level for positions with 3-4 years experience (no indicators)', () => {
      // 3 years
      const exp3 = [createWorkExperience('Company A', 'Developer', '2019-01-01', '2022-01-01')];
      expect(ExperienceCalculator.analyzeExperience(exp3).seniorityLevel).toBe('Mid');

      // 4 years
      const exp4 = [createWorkExperience('Company A', 'Developer', '2018-01-01', '2022-01-01')];
      expect(ExperienceCalculator.analyzeExperience(exp4).seniorityLevel).toBe('Mid');
    });

    it('should detect Mid level for positions with mid-level keywords', () => {
      const keywords = [
        'Engineer', 'Business Analyst', 'QA Specialist', 'Consultant',
        'Level 2 Developer', 'Engineer II',
      ];

      keywords.forEach((title) => {
        const workExperience = [createWorkExperience('Company A', title, '2019-01-01', '2022-01-01')];
        const result = ExperienceCalculator.analyzeExperience(workExperience);
        expect(result.seniorityLevel).toBe('Mid');
      });
    });

    it('should detect Mid level when recent position has "mid level" in summary', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Software Developer', '2019-01-01', '2022-01-01', 'Mid level dev'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Mid');
    });

    it('should default to Mid level when no indicators and experience between 2-5 years', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Software Developer', '2019-01-01', '2022-01-01', 'Generic role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Mid');
    });
  });
});
