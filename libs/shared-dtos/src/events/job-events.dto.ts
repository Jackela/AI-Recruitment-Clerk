/**
 * @description NATS 事件: job.jd.submitted
 */
export interface JobJdSubmittedEvent {
  jobId: string;
  jobTitle: string;
  jdText: string;
  timestamp: string;
}

import { JdDTO } from '../dto/jd.dto';

/**
 * @description NATS 事件: analysis.jd.extracted
 */
export interface AnalysisJdExtractedEvent {
  jobId: string;
  extractedData: JdDTO;
  timestamp: string;
  processingTimeMs: number;
}
