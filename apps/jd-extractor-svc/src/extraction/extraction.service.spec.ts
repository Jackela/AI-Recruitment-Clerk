import { Test } from '@nestjs/testing';
import { ExtractionService } from './extraction.service';
import { LlmService, JdDTO } from './llm.service';
import { NatsClient } from './nats.client';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let llmService: LlmService;
  let natsClient: NatsClient;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ExtractionService, LlmService, NatsClient],
    })
      .overrideProvider(LlmService)
      .useValue({ extractJd: jest.fn() })
      .overrideProvider(NatsClient)
      .useValue({ publish: jest.fn() })
      .compile();

    service = moduleRef.get(ExtractionService);
    llmService = moduleRef.get(LlmService);
    natsClient = moduleRef.get(NatsClient);
  });

  it('extracts jd text and publishes event', async () => {
    const jdDto: JdDTO = {
      requiredSkills: [],
      experienceYears: { min: 1, max: 3 },
      educationLevel: 'any',
      softSkills: [],
    };
    (llmService.extractJd as jest.Mock).mockResolvedValue(jdDto);

    await service.handleJobJdSubmitted({ jobId: 'job1', jdText: 'text' });

    expect(llmService.extractJd).toHaveBeenCalledWith('text');
    expect(natsClient.publish).toHaveBeenCalledWith('analysis.jd.extracted', {
      jobId: 'job1',
      jdDto,
    });
  });
});
