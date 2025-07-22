import { Test } from '@nestjs/testing';
import { JdEventsController } from './jd-events.controller';

describe('JdEventsController', () => {
  let controller: JdEventsController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [JdEventsController],
    }).compile();
    controller = moduleRef.get(JdEventsController);
  });

  it('logs received jobId', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    controller.handleJobSubmitted({ jobId: '123', jdText: 'text' });
    expect(spy).toHaveBeenCalledWith(
      '[JD-EXTRACTOR-SVC] Received event for jobId: 123',
    );
    spy.mockRestore();
  });
});
