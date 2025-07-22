import { Test, TestingModule } from '@nestjs/testing';
import { ScoringEngineService, JdDTO, ScoreDTO } from './scoring.service';
import { NatsClient } from './nats/nats.client';
import { ResumeDTO } from '../../../libs/shared-dtos/src/models/resume.dto';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;
  let natsClient: jest.Mocked<NatsClient>;

  const jdPayload: JdDTO = {
    requiredSkills: [
      { name: 'typescript', weight: 1 },
      { name: 'node', weight: 1 },
    ],
    experienceYears: { min: 2, max: 5 },
    educationLevel: 'bachelor',
    softSkills: ['teamwork'],
  };

  const resumePayload: ResumeDTO = {
    contactInfo: { name: 'John Doe', email: 'a@b.com', phone: '1' },
    skills: ['TypeScript', 'Node'],
    workExperience: [
      {
        company: 'A',
        position: 'Dev',
        startDate: '2019-01-01',
        endDate: '2020-01-01',
        summary: 'work',
      },
    ],
    education: [
      { school: 'X', degree: 'bachelor', major: 'CS' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringEngineService,
        { provide: NatsClient, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(ScoringEngineService);
    natsClient = module.get(NatsClient);
  });

  it('invokes score calculation and emits event', async () => {
    service.handleJdExtractedEvent({ jobId: 'job-123', jdDto: jdPayload });

    const spy = jest.spyOn<any, any>(service as any, '_calculateMatchScore');

    await service.handleResumeParsedEvent({
      jobId: 'job-123',
      resumeId: 'res-1',
      resumeDto: resumePayload,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(natsClient.emit).toHaveBeenCalledWith(
      'analysis.match.scored',
      expect.objectContaining({
        jobId: 'job-123',
        resumeId: 'res-1',
        scoreDto: expect.any(Object),
      }),
    );

    const emitted = (natsClient.emit as jest.Mock).mock.calls[0][1] as {
      scoreDto: ScoreDTO;
    };
    expect(emitted.scoreDto).toEqual(
      expect.objectContaining({
        overallScore: expect.any(Number),
        skillScore: expect.any(Object),
        experienceScore: expect.any(Object),
        educationScore: expect.any(Object),
      }),
    );
  });

  describe('_calculateMatchScore', () => {
    it('calculates weighted score correctly', () => {
      const result = (service as any)._calculateMatchScore(jdPayload, resumePayload);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
