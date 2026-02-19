/**
 * Resume Event DTOs - NATS event contracts
 *
 * Contains all Resume-related NATS event DTOs.
 */

import type { ResumeDTO } from './resume.dto';

/**
 * File metadata for resume uploads
 */
export interface FileMetadata {
  mimeType?: string;
  size?: number;
  encoding?: string;
}

/**
 * @description NATS Event: job.resume.submitted
 */
export interface ResumeSubmittedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  tempGridFsUrl: string; // 用于内部服务访问的临时URL
  organizationId?: string;
  fileMetadata?: FileMetadata;
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
