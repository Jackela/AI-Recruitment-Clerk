import { Test } from '@nestjs/testing';
import { JdEventsController } from './jd-events.controller';
import { Logger } from '@nestjs/common';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';

describe('JdEventsController', () => {
  let controller: JdEventsController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [JdEventsController],
      providers: [
        {
          provide: JdExtractorNatsService,
          useValue: {
            subscribeToJobSubmissions: jest.fn(),
            publishAnalysisJdExtracted: jest.fn().mockResolvedValue({ success: true }),
            publishProcessingError: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();
    controller = moduleRef.get(JdEventsController);
  });

  it('logs received jobId', async () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    await controller.handleJobSubmitted({ jobId: '123', jdText: 'text' });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('jobId: 123'),
    );
    spy.mockRestore();
  });
});
