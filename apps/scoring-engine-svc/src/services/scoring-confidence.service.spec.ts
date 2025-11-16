import { ScoringConfidenceService, ComponentScores } from './scoring-confidence.service';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ScoringConfidenceService', () => {
  let service: ScoringConfidenceService;

  const resume: ResumeDTO = {
    contactInfo: { name: 'Alex Analyst', email: 'alex@example.com', phone: '111-222-3333' },
    summary: 'Product-minded engineer with leadership background',
    skills: ['JavaScript', 'Leadership', 'Agile', 'Communication', 'DevOps'],
    workExperience: [
      {
        company: 'Growth Corp',
        position: 'Senior Engineer',
        startDate: '2018-01-01',
        endDate: '2021-06-01',
        summary: 'Shipped core features and mentored teammates extensively.',
      },
      {
        company: 'ScaleUp Labs',
        position: 'Engineering Lead',
        startDate: '2021-07-01',
        endDate: '2023-12-01',
        summary: 'Led cross-functional squads and improved delivery processes.',
      },
    ],
    education: [
      { school: 'Tech University', degree: 'BS', major: 'Computer Science' },
      { school: 'Leadership Institute', degree: 'Certificate', major: 'Management' },
    ],
    certifications: ['AWS Architect'],
    languages: ['English'],
  };

  const componentScores: ComponentScores = {
    skills: { score: 88, confidence: 0.92, evidenceStrength: 0.85 },
    experience: { score: 84, confidence: 0.9, evidenceStrength: 0.8 },
    culturalFit: { score: 79, confidence: 0.85, evidenceStrength: 0.75 },
  };

  const processingMetrics = {
    aiResponseTimes: [120, 140, 110],
    fallbackUsed: [false, false, false],
    errorRates: [0.01, 0.02],
  };

  beforeEach(() => {
    service = new ScoringConfidenceService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('produces a structured confidence report for complete resumes', () => {
    const report = service.generateConfidenceReport(
      componentScores,
      resume,
      processingMetrics,
    );

    expect(report.overallConfidence).toBeGreaterThan(0);
    expect(report.overallConfidence).toBeLessThanOrEqual(100);
    expect(report.reliabilityBand.minScore).toBeLessThan(
      report.reliabilityBand.maxScore,
    );
    expect(report.recommendations.actionItems.length).toBeGreaterThan(0);
    expect(report.confidenceMetrics.dataQuality.issues).toEqual(
      expect.any(Array),
    );
  });

  it('falls back to the predefined report when analysis fails', () => {
    jest.spyOn(service as any, 'assessDataQuality').mockImplementation(() => {
      throw new Error('boom');
    });

    const report = service.generateConfidenceReport(
      componentScores,
      resume,
      processingMetrics,
    );

    expect(report.overallConfidence).toBe(50);
    expect(report.recommendations.actionItems).toContain(
      'Manual review recommended',
    );
  });
});
