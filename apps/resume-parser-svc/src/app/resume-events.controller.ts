import type { OnModuleInit } from '@nestjs/common';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';

/**
 * Exposes endpoints for resume events.
 */
@Controller()
export class ResumeEventsController implements OnModuleInit {
  private readonly logger = new Logger(ResumeEventsController.name);

  /**
   * Initializes a new instance of the Resume Events Controller.
   * @param natsService - The nats service.
   * @param parsingService - The parsing service.
   */
  constructor(
    private readonly natsService: ResumeParserNatsService,
    private readonly parsingService: ParsingService,
  ) {}

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  public async onModuleInit(): Promise<void> {
    // Subscribe to job.resume.submitted events using the shared NATS service
    await this.natsService.subscribeToResumeSubmissions(
      this.handleResumeSubmitted.bind(this),
    );
  }

  /**
   * Handles resume submitted.
   * @param payload - The payload.
   * @returns A promise that resolves when the operation completes.
   */
  @EventPattern('job.resume.submitted')
  public async handleResumeSubmitted(payload: ResumeSubmittedEvent): Promise<void> {
    // FIXED: Use real AI-powered resume parsing service
    try {
      this.logger.log(
        `[RESUME-PARSER-SVC] Delegating job.resume.submitted event for resumeId: ${payload.resumeId} on jobId: ${payload.jobId} to ParsingService`,
      );

      // Delegate to the real parsing service which handles complete AI processing workflow
      await this.parsingService.handleResumeSubmitted(payload);

      this.logger.log(
        `[RESUME-PARSER-SVC] Successfully delegated resume processing for resumeId: ${payload.resumeId}`,
      );
    } catch (error) {
      this.logger.error(
        `[RESUME-PARSER-SVC] Error delegating resume processing for resumeId: ${payload.resumeId}:`,
        error,
      );
      // ParsingService handles its own error publishing
      throw error;
    }
  }

  // REMOVED: All mock methods replaced with real AI-powered ParsingService
}
