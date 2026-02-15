/**
 * Defines the possible job status values.
 */
export type JobStatus =
  | 'draft'
  | 'active'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'archived'
  | 'closed';

/**
 * Defines the shape of the job.
 */
export interface Job {
  id: string;
  title: string;
  jdText: string;
  status: JobStatus;
  createdAt: Date;
  resumeCount: number;
}

/**
 * Defines the shape of the job list item.
 */
export interface JobListItem {
  id: string;
  title: string;
  status: JobStatus;
  createdAt: Date;
  resumeCount: number;
}

/**
 * Defines the shape of the create job request.
 */
export interface CreateJobRequest {
  jobTitle: string;
  jdText: string;
}

/**
 * Defines the shape of the create job response.
 */
export interface CreateJobResponse {
  jobId: string;
}
