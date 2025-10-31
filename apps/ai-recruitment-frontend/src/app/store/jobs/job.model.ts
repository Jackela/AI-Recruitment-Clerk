import { JobContracts } from '@ai-recruitment-clerk/api-contracts';

/**
 * Defines the shape of the job.
 */
export interface Job {
  id: string;
  title: string;
  jdText: string;
  status: JobContracts.JobStatus;
  createdAt: Date;
  resumeCount: number;
}

/**
 * Defines the shape of the job list item.
 */
export interface JobListItem {
  id: string;
  title: string;
  status: JobContracts.JobStatus;
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
