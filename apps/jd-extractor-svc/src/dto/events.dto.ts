import { JdDTO } from '@ai-recruitment-clerk/job-management-domain';

/**
 * Defines the shape of the job jd submitted event.
 */
export interface JobJdSubmittedEvent {
  jobId: string;
  jobTitle: string;
  jdText: string;
  timestamp: string;
}

/**
 * Defines the shape of the analysis jd extracted event.
 */
export interface AnalysisJdExtractedEvent {
  jobId: string;
  extractedData: JdDTO;
  timestamp: string;
  processingTimeMs: number;
}
