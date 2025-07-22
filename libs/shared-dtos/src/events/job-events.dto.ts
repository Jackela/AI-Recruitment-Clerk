/**
 * @description NATS 事件: job.jd.submitted
 */
export interface JobJdSubmittedEvent {
  jobId: string;
  jobTitle: string;
  jdText: string;
  timestamp: string;
}

/**
 * @description Job Description DTO
 */
export interface JdDTO {
  requirements: {
    technical: string[];
    soft: string[];
    experience: string;
    education: string;
  };
  responsibilities: string[];
  benefits: string[];
  company: {
    name?: string;
    industry?: string;
    size?: string;
  };
}

/**
 * @description NATS 事件: analysis.jd.extracted
 */
export interface AnalysisJdExtractedEvent {
  jobId: string;
  extractedData: JdDTO;
  timestamp: string;
  processingTimeMs: number;
}