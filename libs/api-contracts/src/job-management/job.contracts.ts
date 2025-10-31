/**
 * Job Management API Contracts
 * Shared contract definitions between frontend and backend
 */

export namespace JobContracts {
  /**
   * Standardized job status enum - must be kept in sync between frontend and backend
   */
  export type JobStatus =
    | 'draft'
    | 'active'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'closed';

  /**
   * Base job interface with common fields
   */
  export interface JobBase {
    id: string;
    title: string;
    status: JobStatus;
    createdAt: Date;
    resumeCount: number;
  }

  /**
   * Detailed job information including job description
   */
  export interface JobDetail extends JobBase {
    jdText: string;
  }

  /**
   * Job list item for table/grid displays
   */
  export interface JobListItem extends JobBase {}

  /**
   * Request payload for creating new jobs
   */
  export interface CreateJobRequest {
    jobTitle: string;
    jdText: string;
  }

  /**
   * Response payload after job creation
   */
  export interface CreateJobResponse {
    jobId: string;
  }
}
