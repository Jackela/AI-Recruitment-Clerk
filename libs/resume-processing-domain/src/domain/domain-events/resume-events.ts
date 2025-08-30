/**
 * Resume Processing Domain - Domain Events
 * Moved from libs/shared-dtos/src/events/resume-events.dto.ts
 */

import { ResumeDTO } from '../../application/dtos/resume.dto.js';

/**
 * @description NATS Event: job.resume.submitted
 */
export interface ResumeSubmittedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  tempGridFsUrl: string; // 用于内部服务访问的临时URL
}

/**
 * @description NATS Event: analysis.resume.parsed
 */
export interface AnalysisResumeParsedEvent {
  jobId: string;
  resumeId: string;
  resumeDto: ResumeDTO;
  timestamp: string;
  processingTimeMs: number;
}

/**
 * @description NATS Event: job.resume.failed
 */
export interface JobResumeFailedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  error: string;
  retryCount: number;
  timestamp: string;
}