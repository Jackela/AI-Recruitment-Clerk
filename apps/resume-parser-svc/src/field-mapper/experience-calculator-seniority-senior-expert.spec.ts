/**
 * Tests for ExperienceCalculator - Senior and Expert Level Detection
 *
 * This file contains tests for Senior/Expert level seniority detection and edge cases.
 * For Entry/Mid level tests, see experience-calculator-seniority-entry-mid.spec.ts
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

describe('ExperienceCalculator - Senior and Expert Level', () => {
  describe('Senior level detection', () => {
    it('should detect Senior level for positions with senior keywords', () => {
      const keywords = ['Senior Developer', 'Team Lead', 'Principal Engineer', 'Sr. Developer', 'Level 3 Developer', 'Engineer III'];

      keywords.forEach((title) => {
        const workExperience = [createWorkExperience('Company A', title, '2018-01-01', '2023-01-01')];
        const result = ExperienceCalculator.analyzeExperience(workExperience);
        expect(result.seniorityLevel).toBe('Senior');
      });
    });

    it('should detect Senior level for positions with 5-6 years experience', () => {
      // 5 years
      const exp5 = [createWorkExperience('Company A', 'Developer', '2018-01-01', '2023-01-01')];
      expect(ExperienceCalculator.analyzeExperience(exp5).seniorityLevel).toBe('Senior');

      // 6 years
      const exp6 = [createWorkExperience('Company A', 'Developer', '2017-01-01', '2023-01-01')];
      expect(ExperienceCalculator.analyzeExperience(exp6).seniorityLevel).toBe('Senior');
    });

    it('should detect Senior level for positions with "experienced" in summary', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2018-01-01', '2023-01-01', 'Experienced dev'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Senior');
    });
  });

  describe('Expert level detection', () => {
    it('should detect Expert level for positions with expert keywords', () => {
      const keywords = [
        'Software Architect', 'Director of Engineering', 'Engineering Manager',
        'Head of Development', 'Chief Technology Officer', 'VP of Engineering',
        'Vice President of Technology', 'CTO', 'CIO', 'Level 4 Developer', 'Engineer IV',
        'Staff Engineer', 'Distinguished Engineer',
      ];

      keywords.forEach((title) => {
        const workExperience = [createWorkExperience('Company A', title, '2020-01-01', 'present')];
        const result = ExperienceCalculator.analyzeExperience(workExperience);
        expect(result.seniorityLevel).toBe('Expert');
      });
    });

    it('should detect Expert level for positions with 10+ years experience', () => {
      // 10 years
      const exp10 = [createWorkExperience('Company A', 'Developer', '2013-01-01', '2023-01-01')];
      expect(ExperienceCalculator.analyzeExperience(exp10).seniorityLevel).toBe('Expert');

      // 12 years
      const exp12 = [createWorkExperience('Company A', 'Developer', '2011-01-01', '2023-01-01')];
      expect(ExperienceCalculator.analyzeExperience(exp12).seniorityLevel).toBe('Expert');
    });

    it('should detect Expert by years of experience even without recent expert title', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2010-01-01', '2020-01-01'),
        createWorkExperience('Company B', 'Senior Developer', '2020-01-01', '2022-01-01'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Expert');
    });
  });

  describe('Seniority edge cases and complex scenarios', () => {
    it('should detect Expert by title when position is recent (within 2 years)', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 1);
      const endDateStr = twoYearsAgo.toISOString().split('T')[0];

      const workExperience = [
        createWorkExperience('Company A', 'Software Architect', '2021-01-01', endDateStr),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Expert');
    });

    it('should detect Senior when recent position has senior keyword', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 1);
      const endDateStr = twoYearsAgo.toISOString().split('T')[0];

      const workExperience = [
        createWorkExperience('Company A', 'Senior Developer', '2020-01-01', endDateStr),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Senior');
    });

    it('should use recent positions for seniority detection', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const workExperience = [
        createWorkExperience('Company A', 'Senior Developer', '2010-01-01', '2018-01-01'),
        createWorkExperience('Company B', 'Junior Developer', '2022-01-01', twoYearsAgo.toISOString().split('T')[0]),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      // 10+ years total -> Expert
      expect(result.seniorityLevel).toBe('Expert');
    });

    it('should handle empty/invalid work experience with Entry level default', () => {
      expect(ExperienceCalculator.analyzeExperience([]).seniorityLevel).toBe('Entry');
      expect(ExperienceCalculator.analyzeExperience(null).seniorityLevel).toBe('Entry');
    });

    it('should detect seniority from summary text, not just title', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2018-01-01', '2023-01-01', 'Senior dev'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Senior');
    });

    it('should be case-insensitive when detecting seniority keywords', () => {
      const workExperience = [
        createWorkExperience('Company A', 'SENIOR DEVELOPER', '2018-01-01', '2023-01-01'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Senior');
    });

    it('should handle career progression to Senior', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Junior Developer', '2015-01-01', '2017-01-01'),
        createWorkExperience('Company B', 'Developer', '2017-01-01', '2019-01-01'),
        createWorkExperience('Company C', 'Senior Developer', '2019-01-01', '2023-01-01'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Senior');
    });

    it('should handle career progression to Expert', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Junior Developer', '2010-01-01', '2013-01-01'),
        createWorkExperience('Company B', 'Developer', '2013-01-01', '2017-01-01'),
        createWorkExperience('Company C', 'Senior Developer', '2017-01-01', '2020-01-01'),
        createWorkExperience('Company D', 'Software Architect', '2020-01-01', '2023-01-01'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.seniorityLevel).toBe('Expert');
    });
  });
});
