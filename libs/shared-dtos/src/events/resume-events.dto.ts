import { ResumeDTO } from '../models/resume.dto';

/**
 * @description NATS 事件: job.resume.submitted
 */
export interface ResumeSubmittedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  tempGridFsUrl: string; // 用于内部服务访问的临时URL
}

/**
 * @description NATS 事件: analysis.resume.parsed
 */
export interface AnalysisResumeParsedEvent {
  jobId: string;
  resumeId: string;
  resumeDto: ResumeDTO;
  timestamp: string;
  processingTimeMs: number;
}

/**
 * @description NATS 事件: job.resume.failed
 */
export interface JobResumeFailedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  error: string;
  retryCount: number;
  timestamp: string;
}