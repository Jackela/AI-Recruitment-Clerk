import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

interface JdExtractedPayload {
  jobId: string;
  jdDto: unknown;
}

interface ResumeParsedPayload {
  jobId: string;
  resumeId: string;
  resumeDto: unknown;
}

@Controller()
export class ScoringEventsController {
  @EventPattern('analysis.jd.extracted')
  handleJdExtracted(@Payload() payload: JdExtractedPayload) {
    console.log(
      `[SCORING-ENGINE] Received JD data for jobId: ${payload.jobId}`,
    );
  }

  @EventPattern('analysis.resume.parsed')
  handleResumeParsed(@Payload() payload: ResumeParsedPayload) {
    console.log(
      `[SCORING-ENGINE] Received resume data for resumeId: ${payload.resumeId}`,
    );
  }
}
