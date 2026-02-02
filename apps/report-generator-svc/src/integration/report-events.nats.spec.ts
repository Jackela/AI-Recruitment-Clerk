import { Test } from '@nestjs/testing';
import { ReportEventsController } from '../app/report-events.controller';
import type {
  ReportGenerationRequestedEvent} from '../services/report-generator-nats.service';
import {
  ReportGeneratorNatsService
} from '../services/report-generator-nats.service';
import type {
  MatchScoredEvent,
  ScoringData} from '../report-generator/report-generator.service';
import {
  ReportGeneratorService
} from '../report-generator/report-generator.service';

class ReportGeneratorNatsServiceStub {
  public matchScoredHandler?: (event: MatchScoredEvent) => Promise<void>;
  public reportRequestHandler?: (
    event: ReportGenerationRequestedEvent,
  ) => Promise<void>;

  public subscribeToMatchScored = jest.fn(
    async (handler: (event: MatchScoredEvent) => Promise<void>) => {
      this.matchScoredHandler = handler;
    },
  );

  public subscribeToReportGenerationRequested = jest.fn(
    async (
      handler: (event: ReportGenerationRequestedEvent) => Promise<void>,
    ) => {
      this.reportRequestHandler = handler;
    },
  );

  public publishReportGenerated = jest
    .fn()
    .mockResolvedValue({ success: true });

  public publishReportGenerationFailed = jest
    .fn()
    .mockResolvedValue({ success: true });
}

class ReportGeneratorServiceStub {
  public handleMatchScored = jest.fn().mockResolvedValue(undefined);
}

describe('ReportEventsController NATS integration', () => {
  let controller: ReportEventsController;
  let natsStub: ReportGeneratorNatsServiceStub;
  let reportServiceStub: ReportGeneratorServiceStub;

  beforeEach(async () => {
    natsStub = new ReportGeneratorNatsServiceStub();
    reportServiceStub = new ReportGeneratorServiceStub();

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportEventsController],
      providers: [
        { provide: ReportGeneratorNatsService, useValue: natsStub },
        { provide: ReportGeneratorService, useValue: reportServiceStub },
      ],
    }).compile();

    controller = moduleRef.get(ReportEventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildScoringData = (): ScoringData => ({
    resumeId: 'resume-101',
    jobId: 'job-101',
    overallScore: 0.86,
    skillsScore: 0.9,
    experienceScore: 0.8,
    educationScore: 0.75,
    culturalFitScore: 0.7,
    breakdown: {
      skillsMatch: 0.9,
      experienceMatch: 0.82,
      educationMatch: 0.78,
      overallFit: 0.84,
    },
    matchingSkills: [
      {
        skill: 'TypeScript',
        matchScore: 0.95,
        matchType: 'exact',
        explanation: 'Primary technology match',
      },
    ],
    recommendations: {
      decision: 'hire',
      reasoning: 'Strong alignment',
      strengths: ['Technical depth'],
      concerns: [],
      suggestions: [],
    },
    analysisConfidence: 0.93,
    processingTimeMs: 220,
    scoredAt: new Date(),
  });

  it('processes match scored events and publishes report generated events', async () => {
    await controller.onModuleInit();

    expect(natsStub.subscribeToMatchScored).toHaveBeenCalledTimes(1);
    expect(natsStub.matchScoredHandler).toBeDefined();

    const event: MatchScoredEvent = {
      jobId: 'job-101',
      resumeId: 'resume-101',
      scoreDto: buildScoringData(),
    };

    await natsStub.matchScoredHandler!(event);

    expect(reportServiceStub.handleMatchScored).toHaveBeenCalledWith(event);
    expect(natsStub.publishReportGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-101',
        resumeId: 'resume-101',
        reportType: 'match-analysis',
      }),
    );
    expect(natsStub.publishReportGenerationFailed).not.toHaveBeenCalled();
  });

  it('publishes report generation failed when report creation throws', async () => {
    await controller.onModuleInit();

    reportServiceStub.handleMatchScored.mockRejectedValueOnce(
      new Error('db down'),
    );

    const event: MatchScoredEvent = {
      jobId: 'job-err',
      resumeId: 'resume-err',
      scoreDto: buildScoringData(),
    };

    await natsStub.matchScoredHandler!(event);

    expect(natsStub.publishReportGenerationFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-err',
        resumeId: 'resume-err',
        reportType: 'match-analysis',
        error: 'db down',
      }),
    );
    expect(natsStub.publishReportGenerated).not.toHaveBeenCalled();
  });

  it('handles manual report generation requests via NATS', async () => {
    await controller.onModuleInit();

    expect(natsStub.subscribeToReportGenerationRequested).toHaveBeenCalledTimes(
      1,
    );
    expect(natsStub.reportRequestHandler).toBeDefined();

    const request: ReportGenerationRequestedEvent = {
      jobId: 'job-202',
      resumeId: 'resume-202',
      reportType: 'candidate-summary',
      timestamp: new Date().toISOString(),
      requestedBy: 'tester',
    };

    await natsStub.reportRequestHandler!(request);

    expect(natsStub.publishReportGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-202',
        resumeId: 'resume-202',
        reportType: 'candidate-summary',
      }),
    );
    expect(natsStub.publishReportGenerationFailed).not.toHaveBeenCalled();
  });
});
