import { Injectable, Logger } from '@nestjs/common';
<<<<<<< Updated upstream
import { LlmService } from './llm.service';
import { NatsClient } from './nats.client';

interface JobJdSubmittedPayload {
  jobId: string;
  jdText: string;
}
=======
import { LlmService } from '../llm/llm.service';
import { NatsClient } from '../nats/nats.client';
import { JobJdSubmittedEvent, AnalysisJdExtractedEvent } from '../dto/events.dto';
import { JdDTO } from '../dto/jd.dto';
>>>>>>> Stashed changes

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly natsClient: NatsClient,
  ) {}

<<<<<<< Updated upstream
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
=======
  async handleJobJdSubmitted(event: JobJdSubmittedEvent): Promise<void> {
    // TODO: Implement core event handling logic
    throw new Error('ExtractionService.handleJobJdSubmitted not implemented');
  }

  async processJobDescription(jobId: string, jdText: string, jobTitle: string): Promise<AnalysisJdExtractedEvent> {
    // TODO: Implement job description processing
    throw new Error('ExtractionService.processJobDescription not implemented');
  }

  async publishAnalysisResult(result: AnalysisJdExtractedEvent): Promise<void> {
    // TODO: Implement result publishing
    throw new Error('ExtractionService.publishAnalysisResult not implemented');
  }

  async handleProcessingError(error: Error, jobId: string): Promise<void> {
    // TODO: Implement error handling
    throw new Error('ExtractionService.handleProcessingError not implemented');
  }
}
>>>>>>> Stashed changes
