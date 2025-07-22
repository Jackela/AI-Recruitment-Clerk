import { Test } from '@nestjs/testing';
import { ResumeEventsController } from './resume-events.controller';
import { ResumeSubmittedEvent } from '../../../../libs/shared-dtos/src';

describe('ResumeEventsController', () => {
  let controller: ResumeEventsController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResumeEventsController],
    }).compile();
    controller = moduleRef.get(ResumeEventsController);
  });

  it('logs received resumeId and jobId', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const payload: ResumeSubmittedEvent = {
      jobId: 'job1',
      resumeId: 'res1',
      originalFilename: 'file.pdf',
      tempGridFsUrl: 'http://example.com',
    };
    controller.handleResumeSubmitted(payload);
    expect(spy).toHaveBeenCalledWith(
      '[RESUME-PARSER-SVC] Received event for resumeId: res1 on jobId: job1',
    );
    spy.mockRestore();
  });
});
