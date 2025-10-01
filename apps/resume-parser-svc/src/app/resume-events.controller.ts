import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import {
  ResumeSubmittedEvent,
  ResumeDTO,
} from '@ai-recruitment-clerk/resume-processing-domain';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';

@Controller()
export class ResumeEventsController implements OnModuleInit {
  private readonly logger = new Logger(ResumeEventsController.name);

  constructor(
    private readonly natsService: ResumeParserNatsService,
    private readonly parsingService: ParsingService,
  ) {}

  async onModuleInit() {
    // Subscribe to job.resume.submitted events using the shared NATS service
    await this.natsService.subscribeToResumeSubmissions(
      this.handleResumeSubmitted.bind(this),
    );
  }

  @EventPattern('job.resume.submitted')
  async handleResumeSubmitted(payload: ResumeSubmittedEvent): Promise<void> {
    // ✅ FIXED: Use real AI-powered resume parsing service
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

  // ✅ REMOVED: All mock methods replaced with real AI-powered ParsingService
}
