import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ResumeSubmittedEvent } from '../../../../libs/shared-dtos/src';

@Controller()
export class ResumeEventsController {
  @EventPattern('job.resume.submitted')
  handleResumeSubmitted(@Payload() payload: ResumeSubmittedEvent) {
    console.log(
      `[RESUME-PARSER-SVC] Received event for resumeId: ${payload.resumeId} on jobId: ${payload.jobId}`,
    );
  }
}
