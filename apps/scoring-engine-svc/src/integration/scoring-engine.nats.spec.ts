import { Test } from '@nestjs/testing';
import { ScoringEventsController } from '../app/scoring-events.controller';
import { ScoringEngineNatsService } from '../services/scoring-engine-nats.service';
import { ScoringEngineService } from '../scoring.service';
import type { AnalysisJdExtractedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { AnalysisResumeParsedEvent } from '@ai-recruitment-clerk/resume-processing-domain';

interface ScoringServiceStub {
  handleJdExtractedEvent: jest.Mock;
  handleResumeParsedEvent: jest.Mock;
}

class ScoringEngineNatsServiceStub {
  public jdExtractedHandler?: (event: AnalysisJdExtractedEvent) => Promise<void>;
  public resumeParsedHandler?: (event: AnalysisResumeParsedEvent) => Promise<void>;

  public subscribeToJdExtracted = jest.fn(async (handler: (event: AnalysisJdExtractedEvent) => Promise<void>) => {
    this.jdExtractedHandler = handler;
  });

  public subscribeToResumeParsed = jest.fn(async (handler: (event: AnalysisResumeParsedEvent) => Promise<void>) => {
    this.resumeParsedHandler = handler;
  });

  public publishScoringError = jest
    .fn()
    .mockResolvedValue({ success: true });
}

describe('ScoringEventsController NATS integration', () => {
  let controller: ScoringEventsController;
  let natsStub: ScoringEngineNatsServiceStub;
  let scoringServiceStub: ScoringServiceStub;

  beforeEach(async () => {
    natsStub = new ScoringEngineNatsServiceStub();
    scoringServiceStub = {
      handleJdExtractedEvent: jest.fn(),
      handleResumeParsedEvent: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ScoringEventsController],
      providers: [
        { provide: ScoringEngineNatsService, useValue: natsStub },
        { provide: ScoringEngineService, useValue: scoringServiceStub },
      ],
    }).compile();

    controller = moduleRef.get(ScoringEventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to NATS events and forwards JD payloads to the scoring engine', async () => {
    await controller.onModuleInit();

    expect(natsStub.subscribeToJdExtracted).toHaveBeenCalledTimes(1);
    expect(natsStub.jdExtractedHandler).toBeDefined();

    const jdEvent: AnalysisJdExtractedEvent = {
      jobId: 'job-001',
      extractedData: {
        requirements: {
          technical: ['TypeScript'],
          soft: ['Collaboration'],
          experience: '3+ years',
          education: 'Bachelor',
        },
        responsibilities: ['Build scalable services'],
        benefits: ['Remote'],
        company: {
          name: 'Tech Corp',
          industry: 'Software',
          size: 'Mid',
        },
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: 1200,
    };

    await natsStub.jdExtractedHandler!(jdEvent);

    expect(scoringServiceStub.handleJdExtractedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-001',
        jdDto: expect.objectContaining({ requiredSkills: expect.any(Array) }),
      }),
    );
  });

  it('processes resume parsed events without emitting errors on success', async () => {
    await controller.onModuleInit();

    const resumeEvent: AnalysisResumeParsedEvent = {
      jobId: 'job-001',
      resumeId: 'resume-123',
      resumeDto: {
        contactInfo: { name: 'Candidate', email: 'candidate@example.com', phone: null },
        skills: ['TypeScript'],
        workExperience: [
          {
            company: 'Example Co',
            position: 'Developer',
            startDate: '2022-01-01',
            endDate: '2023-12-31',
            summary: 'Developed APIs',
          },
        ],
        education: [
          {
            school: 'State University',
            degree: 'BSc',
            major: 'Computer Science',
          },
        ],
        certifications: [],
        languages: ['English'],
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: 450,
    };

    await natsStub.resumeParsedHandler!(resumeEvent);

    expect(scoringServiceStub.handleResumeParsedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-001',
        resumeId: 'resume-123',
      }),
    );
    expect(natsStub.publishScoringError).not.toHaveBeenCalled();
  });

  it('publishes scoring error when resume processing fails', async () => {
    await controller.onModuleInit();

    const failure = new Error('scoring failure');
    scoringServiceStub.handleResumeParsedEvent.mockRejectedValueOnce(failure);

    const resumeEvent: AnalysisResumeParsedEvent = {
      jobId: 'job-err',
      resumeId: 'resume-err',
      resumeDto: {
        contactInfo: { name: 'Candidate', email: 'candidate@example.com', phone: null },
        skills: ['TypeScript'],
        workExperience: [],
        education: [],
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: 200,
    };

    await expect(natsStub.resumeParsedHandler!(resumeEvent)).rejects.toThrow(
      'scoring failure',
    );

    expect(natsStub.publishScoringError).toHaveBeenCalledWith(
      'job-err',
      'resume-err',
      failure,
      expect.objectContaining({ stage: 'resume-scoring' }),
    );
  });
});
