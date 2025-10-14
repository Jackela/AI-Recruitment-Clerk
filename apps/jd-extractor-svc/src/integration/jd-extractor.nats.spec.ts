import { Test } from '@nestjs/testing';
import { JdEventsController } from '../app/jd-events.controller';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import { LlmService } from '../extraction/llm.service';

type JobSubmissionHandler = (event: {
  jobId: string;
  jdText: string;
}) => Promise<void>;

class JdExtractorNatsServiceStub {
  public jobSubmissionHandler?: JobSubmissionHandler;

  public subscribeToJobSubmissions = jest.fn(
    async (handler: JobSubmissionHandler) => {
      this.jobSubmissionHandler = handler;
    },
  );

  public publishAnalysisJdExtracted = jest
    .fn()
    .mockResolvedValue({ success: true });

  public publishProcessingError = jest
    .fn()
    .mockResolvedValue({ success: true });
}

describe('JD Extractor NATS integration', () => {
  let controller: JdEventsController;
  let natsStub: JdExtractorNatsServiceStub;
  let llmServiceMock: { extractJobRequirements: jest.Mock };

  beforeEach(async () => {
    natsStub = new JdExtractorNatsServiceStub();
    llmServiceMock = {
      extractJobRequirements: jest
        .fn()
        .mockResolvedValue({ summary: 'structured-result' }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [JdEventsController],
      providers: [
        { provide: JdExtractorNatsService, useValue: natsStub },
        { provide: LlmService, useValue: llmServiceMock },
      ],
    }).compile();

    controller = moduleRef.get(JdEventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to job submissions and publishes extracted event', async () => {
    await controller.onModuleInit();

    expect(natsStub.subscribeToJobSubmissions).toHaveBeenCalledTimes(1);
    expect(natsStub.jobSubmissionHandler).toBeDefined();

    await natsStub.jobSubmissionHandler!({
      jobId: 'job-123',
      jdText: 'Analyze this JD',
    });

    expect(llmServiceMock.extractJobRequirements).toHaveBeenCalledWith(
      'Analyze this JD',
    );
    expect(natsStub.publishAnalysisJdExtracted).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-123',
        processingTimeMs: expect.any(Number),
      }),
    );
    expect(natsStub.publishProcessingError).not.toHaveBeenCalled();
  });

  it('publishes processing error when extraction fails', async () => {
    await controller.onModuleInit();
    const failure = new Error('LLM offline');
    llmServiceMock.extractJobRequirements.mockRejectedValueOnce(failure);

    await natsStub.jobSubmissionHandler!({
      jobId: 'job-error',
      jdText: 'bad jd',
    });

    expect(natsStub.publishProcessingError).toHaveBeenCalledWith(
      'job-error',
      failure,
      expect.objectContaining({ stage: 'jd-extraction' }),
    );
    expect(natsStub.publishAnalysisJdExtracted).not.toHaveBeenCalled();
  });
});
