/**
 * Tests for ExperienceCalculator - Overlap Detection
 *
 * This file contains tests for overlap detection:
 * - Overlapping positions with same dates
 * - Non-overlapping and boundary-adjacent positions
 * - Partial overlap scenarios
 * - Edge cases with null dates
 * - Overlap with different date formats
 *
 * For basic tests, see experience-calculator-basic.spec.ts
 * For gap detection, see experience-calculator-gap.spec.ts
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

describe('ExperienceCalculator - Overlap Detection', () => {
  describe('Overlapping positions with same dates', () => {
    it('should detect overlap when positions have identical dates', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Full-time role'),
        createWorkExperience('Company B', 'Consultant', '2020-01-01', '2022-01-01', 'Consulting role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
      expect(result.overlappingPositions[0].start.date).toEqual(
        result.overlappingPositions[1].start.date,
      );
    });

    it('should detect overlap when one position starts during another', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2023-01-01', 'Main role'),
        createWorkExperience('Company B', 'Consultant', '2021-06-01', '2022-06-01', 'Mid-term consulting'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should detect overlap when one position ends during another', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2019-01-01', '2022-01-01', 'Long-term role'),
        createWorkExperience('Company B', 'Freelancer', '2018-01-01', '2020-06-01', 'Early freelance work'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should detect overlap with "present" end date', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Past role'),
        createWorkExperience('Company B', 'Senior Developer', '2021-01-01', 'present', 'Current role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should detect overlap when both positions have "present" end date', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', 'present', 'Current full-time'),
        createWorkExperience('Company B', 'Consultant', '2021-01-01', 'present', 'Current side gig'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });
  });

  describe('Non-overlapping and boundary-adjacent positions', () => {
    it('should detect overlap for sequential positions with same boundary date', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2018-01-01', '2020-01-01', 'First role'),
        createWorkExperience('Company B', 'Senior Developer', '2020-01-01', '2022-01-01', 'Second role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      // Implementation uses `start1 <= end2 && start2 <= end1`
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should not detect overlap for positions with gaps', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2018-01-01', '2019-01-01', 'First role'),
        createWorkExperience('Company B', 'Senior Developer', '2020-01-01', '2022-01-01', 'Second role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
      expect(result.experienceGaps.length).toBeGreaterThan(0);
    });

    it('should not detect overlap when positions are clearly separated', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2021-01-01', 'Earlier role'),
        createWorkExperience('Company B', 'Senior Developer', '2022-01-01', '2023-01-01', 'Later role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
    });

    it('should handle single position without overlap detection', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Only role'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
    });
  });

  describe('Partial overlap scenarios', () => {
    it('should detect partial overlap at start of position', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2023-01-01', 'Long role'),
        createWorkExperience('Company B', 'Consultant', '2019-01-01', '2020-06-01', 'Overlaps first 6 months'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should detect partial overlap at end of position', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2019-01-01', '2022-01-01', 'Role ending earlier'),
        createWorkExperience('Company B', 'Consultant', '2021-06-01', '2023-01-01', 'Overlaps last 6 months'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should detect overlap when one position contains another', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2018-01-01', '2024-01-01', 'Long-term role'),
        createWorkExperience('Company B', 'Freelancer', '2020-01-01', '2022-01-01', 'Short-term gig'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });

    it('should detect multiple overlapping positions among three positions', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2023-01-01', 'Main role'),
        createWorkExperience('Company B', 'Consultant', '2021-01-01', '2022-01-01', 'First overlap'),
        createWorkExperience('Company C', 'Freelancer', '2021-06-01', '2022-06-01', 'Second overlap'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle complex overlap chain', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Role A', '2020-01-01', '2021-06-01', 'First role'),
        createWorkExperience('Company B', 'Role B', '2021-01-01', '2022-06-01', 'Overlaps A'),
        createWorkExperience('Company C', 'Role C', '2022-01-01', '2023-06-01', 'Overlaps B'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge cases with null dates', () => {
    it('should not detect overlap when start date is null', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Valid role'),
        createWorkExperience('Company B', 'Consultant', '', '2022-01-01', 'Invalid start'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
    });

    it('should not detect overlap when end date is null (non-present)', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Valid role'),
        createWorkExperience('Company B', 'Consultant', '2021-01-01', '', 'Invalid end'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
    });

    it('should handle positions with both dates null', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Valid role'),
        createWorkExperience('Company B', 'Consultant', '', '', 'Invalid dates'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
    });

    it('should not detect overlap with invalid date format', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', '2022-01-01', 'Valid role'),
        createWorkExperience('Company B', 'Consultant', 'invalid-date', '2022-01-01', 'Invalid start'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(0);
    });

    it('should handle present keyword correctly in overlap detection', () => {
      const workExperience = [
        createWorkExperience('Company A', 'Developer', '2020-01-01', 'present', 'Current role'),
        createWorkExperience('Company B', 'Consultant', '2022-01-01', 'present', 'Also current'),
      ];
      const result = ExperienceCalculator.analyzeExperience(workExperience);
      expect(result.overlappingPositions.length).toBe(2);
    });
  });

  describe('Overlap with different date formats', () => {
    it('should detect overlap with various date formats', () => {
      // year-month format
      const yearMonth = [
        createWorkExperience('Company A', 'Dev', '2020-01', '2023-01', 'Main role'),
        createWorkExperience('Company B', 'Consultant', '2022-01', '2024-01', 'Overlap'),
      ];
      expect(ExperienceCalculator.analyzeExperience(yearMonth).overlappingPositions.length).toBe(2);

      // year-only format
      const yearOnly = [
        createWorkExperience('Company A', 'Dev', '2020', '2023', 'Main role'),
        createWorkExperience('Company B', 'Consultant', '2022', '2024', 'Overlap'),
      ];
      expect(ExperienceCalculator.analyzeExperience(yearOnly).overlappingPositions.length).toBe(2);

      // mixed formats
      const mixed = [
        createWorkExperience('Company A', 'Dev', '2020-01-01', '2023-01-01', 'Full date'),
        createWorkExperience('Company B', 'Consultant', '2022', '2024', 'Year only'),
      ];
      expect(ExperienceCalculator.analyzeExperience(mixed).overlappingPositions.length).toBe(2);
    });
  });
});
