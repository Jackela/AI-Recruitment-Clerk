import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

interface JobJdSubmittedPayload {
  jobId: string;
  jdText: string;
}

@Controller()
export class JdEventsController {
  @EventPattern('job.jd.submitted')
  handleJobSubmitted(@Payload() payload: JobJdSubmittedPayload) {
    console.log(`[JD-EXTRACTOR-SVC] Received event for jobId: ${payload.jobId}`);
  }
}
