/**
 * Internal types for resume-parser-svc
 *
 * These types are used internally within the service and are not shared with other services.
 */

import type { ResumeDTO, FileMetadata } from '@ai-recruitment-clerk/resume-dto';

/**
 * Extended event data for resume submitted events with organization context
 */
export interface ResumeSubmittedEventData {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  tempGridFsUrl: string;
  organizationId?: string;
  fileMetadata?: FileMetadata;
}

/**
 * Result of a successful resume parsing operation
 */
export interface ResumeParseSuccessResult {
  jobId: string;
  resumeId: string;
  resumeDto: ResumeDTO;
  timestamp: string;
  processingTimeMs?: number;
}

/**
 * Original data for retry operations
 */
export interface RetryOriginalData {
  fileBuffer?: Buffer;
  fileName?: string;
  resumeText?: string;
}

/**
 * Health check details structure
 * Note: This is a flexible type to accommodate various health check scenarios
 */
 
export type HealthCheckDetails = {
  natsConnected?: boolean;
  natsConnectionInfo?: unknown;
  retryQueueSize?: number;
  activeProcessingCount?: number;
  activeRetries?: [string, number][];
  processingFiles?: Array<{
    key: string;
    age?: number;
    timestamp?: number;
    hash?: string;
    attempts: number;
  }>;
  securityStatus?: {
    encryptionEnabled: boolean;
    maxFileSize: number;
    allowedTypes: string[];
  };
  memoryUsage?: NodeJS.MemoryUsage;
  uptime?: number;
  error?: string;
};

/**
 * Resume status update data
 */
export interface ResumeStatusUpdateData {
  status: string;
  processedAt: Date;
  errorMessage?: string;
}

/**
 * MongoDB query filter for skills search
 */
export interface SkillsQueryFilter {
  skills: { $in: string[] };
  processingConfidence: { $gte: number };
  status?: string | { $in: string[] };
}

/**
 * MongoDB sort options - compatible with Mongoose Sort type
 */
export type SortOption = Record<string, 1 | -1 | 'asc' | 'desc'>;

/**
 * Experience metrics for quality calculation
 */
export interface ExperienceMetrics {
  totalYears: number;
  relevantYears: number;
  completenessScore: number;
}
