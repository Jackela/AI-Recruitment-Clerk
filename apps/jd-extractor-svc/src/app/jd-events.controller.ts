import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JdDTO } from '@ai-recruitment-clerk/job-management-domain';
import { ErrorCorrelationManager } from '@app/shared-dtos';
import { JDExtractorException } from '@app/shared-dtos';
import { JDExtractorErrorCode } from '@app/shared-dtos';
import { JobJdSubmittedEvent } from '../dto/events.dto';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import { LlmService } from '../extraction/llm.service';

/**
 * Exposes endpoints for jd events.
 */
@Controller()
export class JdEventsController implements OnModuleInit {
  private readonly logger = new Logger(JdEventsController.name);

  /**
   * Initializes a new instance of the JD Events Controller.
   * @param natsService - The nats service.
   * @param llmService - The llm service.
   */
  constructor(
    private readonly natsService: JdExtractorNatsService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  async onModuleInit() {
    // Subscribe to job.jd.submitted events using the shared NATS client
    await this.natsService.subscribeToJobSubmissions(
      this.handleJobSubmitted.bind(this),
    );
  }

  /**
   * Handles job submitted.
   * @param payload - The payload.
   * @returns A promise that resolves when the operation completes.
   */
  @EventPattern('job.jd.submitted')
  async handleJobSubmitted(payload: any): Promise<void> {
    try {
      this.logger.log(
        `[JD-EXTRACTOR-SVC] Processing job.jd.submitted event for jobId: ${payload.jobId}`,
      );

      // Validate payload with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();

      if (!payload.jobId || !payload.jdText) {
        throw new JDExtractorException(
          JDExtractorErrorCode.JD_STRUCTURE_INVALID,
          {
            provided: {
              jobId: !!payload.jobId,
              jdText: !!payload.jdText,
            },
            correlationId: correlationContext?.traceId,
          },
        );
      }

      const startTime = Date.now();

      // ✅ FIXED: Use real AI-powered JD extraction
      const extractedData: JdDTO = await this.llmService.extractJobRequirements(
        payload.jdText,
      );

      const processingTimeMs = Date.now() - startTime;

      // Publish analysis.jd.extracted event using the shared NATS service
      await this.natsService.publishAnalysisJdExtracted({
        jobId: payload.jobId,
        extractedData,
        processingTimeMs,
        confidence: 0.95, // High confidence for Gemini AI extraction
        extractionMethod: 'gemini-ai',
      });

      this.logger.log(
        `[JD-EXTRACTOR-SVC] Successfully processed and published analysis.jd.extracted for jobId: ${payload.jobId} in ${processingTimeMs}ms`,
      );
    } catch (error) {
      this.logger.error(
        `[JD-EXTRACTOR-SVC] Error processing job.jd.submitted for jobId: ${payload.jobId}:`,
        error,
      );

      // Publish error event using the shared NATS service
      await this.natsService.publishProcessingError(
        payload.jobId,
        error as Error,
        {
          stage: 'jd-extraction',
          inputSize: payload.jdText?.length,
          retryAttempt: 1,
        },
      );
    }
  }

  // ✅ REMOVED: Mock implementation replaced with real AI processing
}
