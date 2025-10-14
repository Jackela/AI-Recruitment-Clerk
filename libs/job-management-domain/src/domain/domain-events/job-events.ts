/**
 * Job Management Domain - Domain Events
 * Moved from libs/shared-dtos/src/events/job-events.dto.ts
 */

import { JdDTO } from '../../application/dtos/job-description.dto.js';

/**
 * @description NATS Event: job.jd.submitted
 */
export interface JobJdSubmittedEvent {
  jobId: string;
  jobTitle: string;
  jdText: string;
  timestamp: string;
}

/**
 * @description NATS Event: analysis.jd.extracted
 */
export interface AnalysisJdExtractedEvent {
  jobId: string;
  extractedData: JdDTO;
  timestamp: string;
  processingTimeMs: number;
}
