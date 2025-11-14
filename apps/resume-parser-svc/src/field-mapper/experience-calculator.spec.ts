import { ExperienceCalculator } from './experience-calculator';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ExperienceCalculator', () => {
  it('returns empty analysis when no work history is provided', () => {
    const analysis = ExperienceCalculator.analyzeExperience([]);

    expect(analysis.totalExperienceMonths).toBe(0);
    expect(analysis.seniorityLevel).toBe('Entry');
    expect(
      ExperienceCalculator.getExperienceSummary(analysis),
    ).toBe('No work experience found');
  });

  it('computes gaps, overlaps, and seniority for complex histories', () => {
    const currentYear = new Date().getFullYear();
    const makeDate = (year: number, month: number) =>
      `${year}-${String(month).padStart(2, '0')}-01`;

    const workExperience: ResumeDTO['workExperience'] = [
      {
        company: 'Alpha Tech',
        position: 'Senior Developer',
        startDate: makeDate(currentYear - 4, 1),
        endDate: makeDate(currentYear - 3, 1),
        summary: 'Built node.js services for cloud automation on AWS',
      },
      {
        company: 'Beta Industries',
        position: 'Lead Engineer',
        startDate: makeDate(currentYear - 3, 1),
        endDate: makeDate(currentYear - 2, 6),
        summary: 'Led engineering excellence programs and DevOps adoption',
      },
      {
        company: 'Gamma Labs',
        position: 'Senior Software Engineer',
        startDate: makeDate(currentYear - 2, 9),
        endDate: makeDate(currentYear - 1, 9),
        summary: 'Delivering Node.js and platform modernization efforts',
      },
    ];

    const analysis = ExperienceCalculator.analyzeExperience(
      workExperience,
      ['node.js', 'devops'],
    );

    expect(analysis.totalExperienceMonths).toBeGreaterThanOrEqual(24);
    expect(analysis.experienceGaps.length).toBeGreaterThanOrEqual(1);
    expect(analysis.overlappingPositions.length).toBeGreaterThanOrEqual(2);
    expect(['Senior', 'Expert']).toContain(analysis.seniorityLevel);
    expect(analysis.experienceDetails.totalPositions).toBe(3);
    expect(analysis.relevantExperienceMonths).toBeGreaterThan(0);

    const summary = ExperienceCalculator.getExperienceSummary(analysis);
    expect(summary).toContain(analysis.seniorityLevel);
    expect(summary).toContain('years total experience');
  });
});
