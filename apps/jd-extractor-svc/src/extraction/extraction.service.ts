import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { NatsClient } from './nats.client';

interface JobJdSubmittedPayload {
  jobId: string;
  jdText: string;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly natsClient: NatsClient,
  ) {}

  async handleJobJdSubmitted(payload: JobJdSubmittedPayload): Promise<void> {
    this.logger.log(`Handling job.jd.submitted for ${payload.jobId}`);
    const jdDto = await this.llmService.extractJd(payload.jdText);
    await this.natsClient.publish('analysis.jd.extracted', {
      jobId: payload.jobId,
      jdDto,
    });
    this.logger.log(`Published analysis.jd.extracted for ${payload.jobId}`);
  }
}
