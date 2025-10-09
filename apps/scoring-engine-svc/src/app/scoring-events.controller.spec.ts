import { Test } from '@nestjs/testing';
import { ScoringEventsController } from './scoring-events.controller';
import { Logger } from '@nestjs/common';
import type { AnalysisJdExtractedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { AnalysisResumeParsedEvent } from '@ai-recruitment-clerk/resume-processing-domain';

describe('ScoringEventsController', () => {
  let controller: ScoringEventsController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ScoringEventsController],
    }).compile();
    controller = moduleRef.get(ScoringEventsController);
  });

  it('logs jobId on jd extracted', async () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const payload: AnalysisJdExtractedEvent = {
      jobId: 'job1',
      extractedData: {
        requirements: {
          technical: [],
          soft: [],
          experience: '',
          education: '',
        },
        responsibilities: [],
        benefits: [],
        company: {},
      } as any,
      timestamp: new Date().toISOString(),
      processingTimeMs: 1,
    };
    await controller.handleJdExtracted(payload);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs resumeId on resume parsed', async () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const payload: AnalysisResumeParsedEvent = {
      jobId: 'job1',
      resumeId: 'res1',
      resumeDto: {
        contactInfo: { name: '', email: '', phone: '' },
        skills: [],
        workExperience: [],
        education: [],
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: 1,
    };
    await controller.handleResumeParsed(payload);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
