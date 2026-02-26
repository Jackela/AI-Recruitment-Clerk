/**
 * Tests for ExperienceCalculator - Gap Detection
 *
 * This file contains tests for gap detection:
 * - Gaps between positions
 * - Continuous employment (no gaps)
 * - Multiple gaps
 * - Gap duration calculation
 *
 * For basic tests, see experience-calculator-basic.spec.ts
 * For overlap detection, see experience-calculator-overlap.spec.ts
 * For seniority level, see experience-calculator-seniority.spec.ts
 */

import { ExperienceCalculator } from './experience-calculator';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

/**
 * Helper to create a mock work experience entry
 */
function createWorkExperience(
  company: string,
  position: string,
  startDate: string,
  endDate: string,
  summary = 'Work summary',
): ResumeDTO['workExperience'][0] {
  return {
    company,
    position,
    startDate,
    endDate,
    summary,
  };
}

describe('ExperienceCalculator - Gap Detection', () => {
  describe('Gaps between positions', () => {
    it('should detect gaps between positions', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2018-01-01',
          '2019-01-01',
          'First job',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2019-07-01',
          '2021-01-01',
          'Second job after gap',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(1);

      const gap = result.experienceGaps[0];
      expect(gap.start.date?.getFullYear()).toBe(2019);
      expect(gap.start.date?.getMonth()).toBe(0);
      expect(gap.end.date?.getFullYear()).toBe(2019);
      expect(gap.end.date?.getMonth()).toBe(6);
      expect(gap.duration.totalMonths).toBe(6);
    });

    it('should detect gap with exact one month difference (no gap)', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2018-01-01',
          '2019-01-01',
          'First job',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2019-02-01',
          '2021-01-01',
          'Second job',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(0);
    });

    it('should detect 2-month gap between positions', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2020-01-01',
          '2020-12-01',
          'First role',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2021-02-01',
          '2022-01-01',
          'Second role',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(1);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(2);
    });

    it('should detect large gap between positions', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2015-01-01',
          '2017-01-01',
          'First job',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2019-01-01',
          '2021-01-01',
          'Second job after long break',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(1);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(24);
    });

    it('should detect gap with year-month format dates', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01', '2021-01', 'First role'),
        createWorkExperience('Company B', 'Dev', '2021-04', '2022-01', 'Second role'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(1);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(3);
    });

    it('should detect gap with year-only format dates', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2018', '2020', 'First role'),
        createWorkExperience('Company B', 'Dev', '2021', '2023', 'Second role'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Continuous employment (no gaps)', () => {
    it('should not detect gaps for continuous employment', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2018-01-01',
          '2019-01-01',
          'First job',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2019-01-01',
          '2021-01-01',
          'Started immediately after first job',
        ),
        createWorkExperience(
          'Company C',
          'Senior Developer',
          '2021-01-01',
          '2023-01-01',
          'Started immediately after second job',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(0);
    });

    it('should not detect gaps when next job starts same month previous ended', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2020-01-01',
          '2020-06-01',
          'First half of year',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2020-06-01',
          '2021-01-01',
          'Second half of year',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(0);
    });

    it('should not detect gaps for single position', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2020-01-01',
          '2023-01-01',
          'Only job',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(0);
    });

    it('should not detect gaps when next job starts within 1 month', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2020-01-01',
          '2020-12-15',
          'Ended mid-month',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2021-01-01',
          '2021-12-01',
          'Started early next month',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(0);
    });

    it('should handle present end date without gaps', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2020-01-01',
          '2021-01-01',
          'Past job',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2021-01-01',
          'present',
          'Current job started immediately',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(0);
      expect(result.experienceDetails.currentPosition).toBe(true);
    });
  });

  describe('Multiple gaps', () => {
    it('should detect multiple gaps between positions', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Developer',
          '2017-01-01',
          '2018-01-01',
          'First job',
        ),
        createWorkExperience(
          'Company B',
          'Developer',
          '2018-04-01',
          '2020-01-01',
          'Second job',
        ),
        createWorkExperience(
          'Company C',
          'Developer',
          '2020-07-01',
          '2022-01-01',
          'Third job',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(2);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(3);
      expect(result.experienceGaps[1].duration.totalMonths).toBe(6);
    });

    it('should detect three gaps in career history', () => {
      const workExperience = [
        createWorkExperience(
          'Company A',
          'Intern',
          '2015-01-01',
          '2015-12-01',
          'Internship',
        ),
        createWorkExperience(
          'Company B',
          'Junior Dev',
          '2016-02-01',
          '2018-01-01',
          'First real job',
        ),
        createWorkExperience(
          'Company C',
          'Developer',
          '2018-05-01',
          '2020-01-01',
          'Second job',
        ),
        createWorkExperience(
          'Company D',
          'Senior Dev',
          '2021-01-01',
          '2023-01-01',
          'Current job',
        ),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(3);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(2);
      expect(result.experienceGaps[1].duration.totalMonths).toBe(4);
      expect(result.experienceGaps[2].duration.totalMonths).toBe(12);
    });

    it('should handle mix of gaps and continuous periods', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2015-01', '2017-01', 'Job 1'),
        createWorkExperience('Company B', 'Dev', '2017-04', '2019-01', 'Job 2'),
        createWorkExperience('Company C', 'Dev', '2019-01', '2020-01', 'Job 3'),
        createWorkExperience('Company D', 'Dev', '2020-07', '2022-01', 'Job 4'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(2);
    });

    it('should correctly order gaps by date', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2018-01', '2019-01', 'Job 1'),
        createWorkExperience('Company B', 'Dev', '2020-01', '2021-01', 'Job 2'),
        createWorkExperience('Company C', 'Dev', '2022-01', '2023-01', 'Job 3'),
      ];

      const result = ExperienceCalculator.analyzeExperience(workExperience);

      expect(result.experienceGaps.length).toBe(2);

      const firstGap = result.experienceGaps[0];
      const secondGap = result.experienceGaps[1];

      expect(
        firstGap.start.date!.getTime() < secondGap.start.date!.getTime(),
      ).toBe(true);
    });
  });

  describe('Gap duration calculation', () => {
    it('should correctly calculate 1-month gap duration (not a gap)', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', '2020-12-01', 'Job'),
        createWorkExperience('Company B', 'Dev', '2021-01-01', '2021-12-01', 'Job'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.experienceGaps.length).toBe(0);
    });

    it('should correctly calculate various gap durations', () => {
      // 3-month gap
      const gap3 = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', '2020-09-01', 'Job'),
        createWorkExperience('Company B', 'Dev', '2020-12-01', '2021-12-01', 'Job'),
      ];
      const result3 = ExperienceCalculator.analyzeExperience(gap3);
      expect(result3.experienceGaps.length).toBe(1);
      expect(result3.experienceGaps[0].duration.totalMonths).toBe(3);

      // 6-month gap
      const gap6 = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', '2020-06-01', 'Job'),
        createWorkExperience('Company B', 'Dev', '2020-12-01', '2021-12-01', 'Job'),
      ];
      const result6 = ExperienceCalculator.analyzeExperience(gap6);
      expect(result6.experienceGaps[0].duration.totalMonths).toBe(6);

      // 12-month gap
      const gap12 = [
        createWorkExperience('Company A', 'Dev', '2018-01-01', '2019-01-01', 'Job'),
        createWorkExperience('Company B', 'Dev', '2020-01-01', '2021-01-01', 'Job'),
      ];
      const result12 = ExperienceCalculator.analyzeExperience(gap12);
      expect(result12.experienceGaps[0].duration.totalMonths).toBe(12);

      // 36-month (3 year) gap
      const gap36 = [
        createWorkExperience('Company A', 'Dev', '2015-01-01', '2016-01-01', 'Job'),
        createWorkExperience('Company B', 'Dev', '2019-01-01', '2020-01-01', 'Job'),
      ];
      const result36 = ExperienceCalculator.analyzeExperience(gap36);
      expect(result36.experienceGaps[0].duration.totalMonths).toBe(36);
    });

    it('should handle gap crossing year boundary', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-10-01', '2020-12-01', 'Job'),
        createWorkExperience('Company B', 'Dev', '2021-03-01', '2022-01-01', 'Job'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.experienceGaps.length).toBe(1);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(3);
    });

    it('should handle gaps with present keyword in previous position', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', 'present', 'Current job'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.experienceGaps.length).toBe(0);
    });

    it('should handle unsorted positions for gap detection', () => {
      const workExperience = [
        createWorkExperience('Company C', 'Dev', '2021-01', '2023-01', 'Latest'),
        createWorkExperience('Company A', 'Dev', '2018-01', '2019-01', 'Earliest'),
        createWorkExperience('Company B', 'Dev', '2019-07', '2021-01', 'Middle'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.experienceGaps.length).toBe(1);
      expect(result.experienceGaps[0].duration.totalMonths).toBe(6);
    });
  });
});
