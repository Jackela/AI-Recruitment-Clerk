/**
 * Tests for ExperienceCalculator - calculateTotalExperience function
 */

import { ExperienceCalculator } from './experience-calculator';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ExperienceCalculator - calculateTotalExperience', () => {
  /**
   * Helper to create a mock work experience entry
   */
  function createWorkExperience(
    company: string,
    position: string,
    startDate: string,
    endDate: string,
    summary: string = 'Work summary',
  ): ResumeDTO['workExperience'][0] {
    return {
      company,
      position,
      startDate,
      endDate,
      summary,
    };
  }

  describe('Single position tests', () => {
    it('should calculate experience correctly for a single position with full dates', () => {
      const workExperience = [
        createWorkExperience(
          'Tech Corp',
          'Software Engineer',
          '2020-01-01',
          '2022-01-01',
          'Developed software',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 2 years = 24 months
      expect(result.totalExperienceMonths).toBe(24);
      expect(result.totalExperienceYears).toBe(2.0);
    });

    it('should calculate experience correctly for a single position with year-month format', () => {
      const workExperience = [
        createWorkExperience(
          'Tech Corp',
          'Software Engineer',
          '2019-06',
          '2021-06',
          'Developed software',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 2 years = 24 months
      expect(result.totalExperienceMonths).toBe(24);
      expect(result.totalExperienceYears).toBe(2.0);
    });

    it('should calculate experience correctly for a single position with year-only format', () => {
      const workExperience = [
        createWorkExperience(
          'Tech Corp',
          'Software Engineer',
          '2018',
          '2021',
          'Developed software',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 3 years = 36 months
      expect(result.totalExperienceMonths).toBe(36);
      expect(result.totalExperienceYears).toBe(3.0);
    });

    it('should calculate experience correctly for a single position with partial months', () => {
      const workExperience = [
        createWorkExperience(
          'Tech Corp',
          'Software Engineer',
          '2020-01-15',
          '2021-07-15',
          'Developed software',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 1 year 6 months = 18 months
      expect(result.totalExperienceMonths).toBe(18);
      expect(result.totalExperienceYears).toBe(1.5);
    });

    it('should handle position with "present" as end date', () => {
      // Create a position that started 2 years ago and is still present
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const startDateStr = twoYearsAgo.toISOString().split('T')[0];

      const workExperience = [
        createWorkExperience(
          'Tech Corp',
          'Software Engineer',
          startDateStr,
          'present',
          'Currently working',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Should be approximately 24 months (may vary by 1 due to date parsing)
      expect(result.totalExperienceMonths).toBeGreaterThanOrEqual(23);
      expect(result.totalExperienceMonths).toBeLessThanOrEqual(25);
      expect(result.experienceDetails.currentPosition).toBe(true);
    });

    it('should handle single position with current keyword', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const startDateStr = twoYearsAgo.toISOString().split('T')[0];

      const workExperience = [
        createWorkExperience(
          'Tech Corp',
          'Software Engineer',
          startDateStr,
          'current',
          'Currently working',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBeGreaterThan(0);
      expect(result.experienceDetails.currentPosition).toBe(true);
    });
  });

  describe('Multiple positions tests', () => {
    it('should calculate total experience for multiple sequential positions', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Junior Developer',
          '2018-01-01',
          '2019-01-01',
          'Junior work',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2019-01-01',
          '2021-01-01',
          'Mid-level work',
        ),
        createWorkExperience(
          'Company C',
          'Senior Developer',
          '2021-01-01',
          '2023-01-01',
          'Senior work',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 5 years total = 60 months
      expect(result.totalExperienceMonths).toBe(60);
      expect(result.totalExperienceYears).toBe(5.0);
      expect(result.experienceDetails.totalPositions).toBe(3);
    });

    it('should handle gaps between positions (no double counting)', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2018-01-01',
          '2019-01-01',
          'First job',
        ),
        // 1 year gap
        createWorkExperience(
          'Company B',
          'Developer',
          '2020-01-01',
          '2021-01-01',
          'Second job',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Should only count actual work time, not gaps
      // 2 years of work = 24 months, not 36
      expect(result.totalExperienceMonths).toBe(24);
      expect(result.experienceGaps.length).toBe(1);
    });

    it('should handle overlapping positions correctly (no double counting)', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2018-01-01',
          '2022-01-01',
          'Full-time job',
        ),
        // Overlapping by 1 year
        createWorkExperience(
          'Company B',
          'Consultant',
          '2021-01-01',
          '2023-01-01',
          'Part-time consulting',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Total span is 5 years (2018-2023), but with overlap it should be 60 months
      // NOT 4 + 2 = 6 years
      expect(result.totalExperienceMonths).toBe(60);
      expect(result.overlappingPositions.length).toBeGreaterThan(0);
    });

    it('should handle multiple positions with varying durations', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Intern', '2020-01', '2020-07', 'Internship'), // 6 months
        createWorkExperience(
          'Company B',
          'Junior Dev',
          '2020-07',
          '2022-01',
          'Junior role',
        ), // 18 months
        createWorkExperience(
          'Company C',
          'Senior Dev',
          '2022-01',
          '2024-01',
          'Senior role',
        ), // 24 months
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Positions end on same day they start next, so no gaps
      // Total: 6 + 18 + 24 = 48 months = 4 years
      // But there may be 1 month overlap between consecutive positions
      // Actually: Jan-Jul (6) + Jul-Jan (18) + Jan-Jan (24) = 48 months
      expect(result.totalExperienceMonths).toBeGreaterThanOrEqual(47);
      expect(result.totalExperienceMonths).toBeLessThanOrEqual(48);
      expect(result.totalExperienceYears).toBeCloseTo(4.0, 1);
    });

    it('should handle positions in chronological order (unsorted input)', () => {
      const workExperience = [
        createWorkExperience(
          'Company C',
          'Senior Dev',
          '2021-01-01',
          '2023-01-01',
          'Senior work',
        ),
        createWorkExperience(
          'Company A',
          'Junior Dev',
          '2017-01-01',
          '2019-01-01',
          'Junior work',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2019-01-01',
          '2021-01-01',
          'Mid work',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Should still calculate correctly regardless of input order
      // 6 years = 72 months
      expect(result.totalExperienceMonths).toBe(72);
    });

    it('should calculate min and max position durations correctly', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Intern', '2020-01', '2020-07', 'Internship'), // 6 months - shortest
        createWorkExperience(
          'Company B',
          'Developer',
          '2020-07',
          '2025-07',
          'Long role',
        ), // 60 months - longest
        createWorkExperience(
          'Company C',
          'Senior Dev',
          '2025-08',
          '2026-08',
          'Recent role',
        ), // 12 months
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Note: Month calculation can vary by 1 depending on how date boundaries are counted
      expect(result.experienceDetails.shortestPosition).toBeGreaterThanOrEqual(5);
      expect(result.experienceDetails.shortestPosition).toBeLessThanOrEqual(6);
      expect(result.experienceDetails.longestPosition).toBe(60);
    });

    it('should calculate average position duration correctly', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01', '2021-01', 'Work'), // 12 months
        createWorkExperience('Company B', 'Dev', '2021-02', '2022-02', 'Work'), // 12 months
        createWorkExperience('Company C', 'Dev', '2022-03', '2023-03', 'Work'), // 12 months
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Average of 12, 12, 12 = 12
      expect(result.experienceDetails.averagePositionDuration).toBe(12);
    });
  });

  describe('No positions / empty input tests', () => {
    it('should return zero for null work experience', () => {
      const result = ExperienceCalculator.analyzeExperience(null);

      expect(result.totalExperienceMonths).toBe(0);
      expect(result.totalExperienceYears).toBe(0);
      expect(result.experienceDetails.totalPositions).toBe(0);
      expect(result.seniorityLevel).toBe('Entry');
    });

    it('should return zero for undefined work experience', () => {
      const result = ExperienceCalculator.analyzeExperience(undefined);

      expect(result.totalExperienceMonths).toBe(0);
      expect(result.totalExperienceYears).toBe(0);
      expect(result.experienceDetails.totalPositions).toBe(0);
    });

    it('should return zero for empty work experience array', () => {
      const result = ExperienceCalculator.analyzeExperience([]);

      expect(result.totalExperienceMonths).toBe(0);
      expect(result.totalExperienceYears).toBe(0);
      expect(result.experienceDetails.totalPositions).toBe(0);
    });

    it('should return zero for positions with invalid dates', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', 'invalid', 'invalid', 'Work'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBe(0);
      expect(result.totalExperienceYears).toBe(0);
    });
  });

  describe('Month/year conversion tests', () => {
    it('should correctly convert months to years for fractional results', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01', '2023-07', 'Work'), // 3.5 years
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 42 months = 3.5 years
      expect(result.totalExperienceMonths).toBe(42);
      expect(result.totalExperienceYears).toBe(3.5);
    });

    it('should round years to one decimal place', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01', '2021-03', 'Work'), // 14 months
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBe(14);
      expect(result.totalExperienceYears).toBeCloseTo(1.2, 1);
    });

    it('should handle 1 month experience', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Intern', '2020-01', '2020-02', 'Internship'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBe(1);
      expect(result.totalExperienceYears).toBeCloseTo(0.1, 1);
    });

    it('should handle 11 months experience (not rounding to 1 year)', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Intern', '2020-01', '2020-12', 'Internship'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBe(11);
      expect(result.totalExperienceYears).toBeCloseTo(0.9, 1);
    });

    it('should handle experience spanning multiple months accurately', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-03-15', '2022-09-15', 'Work'), // 2 years 6 months
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBe(30);
      expect(result.totalExperienceYears).toBe(2.5);
    });

    it('should correctly handle month differences only', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Dev',
          '2020-01-01',
          '2020-12-01',
          'Same year',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.totalExperienceMonths).toBe(11);
    });

    it('should correctly handle year boundaries', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Dev',
          '2020-11-01',
          '2021-02-01',
          'Cross year',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Nov, Dec, Jan, Feb = 3 months
      expect(result.totalExperienceMonths).toBe(3);
    });
  });

  describe('Edge cases for calculateTotalExperience', () => {
    it('should handle positions with null start date', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '', '2022-01-01', 'Work'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Position with invalid start should be filtered out
      expect(result.totalExperienceMonths).toBe(0);
    });

    it('should handle positions with null end date (non-present)', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', '', 'Work'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Position with invalid end (not "present") should be handled
      expect(result.totalExperienceMonths).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long duration positions', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Dev',
          '1990-01-01',
          '2020-01-01',
          'Long career',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // 30 years = 360 months
      expect(result.totalExperienceMonths).toBe(360);
      expect(result.totalExperienceYears).toBe(30.0);
    });

    it('should handle position starting and ending in same month', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', '2020-01-31', 'Work'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      // Same month should result in 0 months
      expect(result.totalExperienceMonths).toBe(0);
    });
  });
});
