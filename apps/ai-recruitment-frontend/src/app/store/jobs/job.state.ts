import { Job, JobListItem } from './job.model';

/**
 * Defines the shape of the job state.
 */
export interface JobState {
  jobs: JobListItem[];
  selectedJob: Job | null;
  loading: boolean;
  error: string | null;
  creating: boolean;
}

export const initialJobState: JobState = {
  jobs: [],
  selectedJob: null,
  loading: false,
  error: null,
  creating: false,
};
