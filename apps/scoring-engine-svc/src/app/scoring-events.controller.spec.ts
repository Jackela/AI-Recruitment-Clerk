import { Test } from '@nestjs/testing';
import { ScoringEventsController } from './scoring-events.controller';

describe('ScoringEventsController', () => {
  let controller: ScoringEventsController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ScoringEventsController],
    }).compile();
    controller = moduleRef.get(ScoringEventsController);
  });

  it('logs jobId on jd extracted', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    controller.handleJdExtracted({ jobId: 'job1', jdDto: {} });
    expect(spy).toHaveBeenCalledWith(
      '[SCORING-ENGINE] Received JD data for jobId: job1',
    );
    spy.mockRestore();
  });

  it('logs resumeId on resume parsed', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    controller.handleResumeParsed({
      jobId: 'job1',
      resumeId: 'res1',
      resumeDto: {},
    });
    expect(spy).toHaveBeenCalledWith(
      '[SCORING-ENGINE] Received resume data for resumeId: res1',
    );
    spy.mockRestore();
  });
});
