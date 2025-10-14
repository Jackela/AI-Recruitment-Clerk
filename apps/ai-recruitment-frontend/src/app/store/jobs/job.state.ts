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
  // WebSocket-related state
  webSocketConnected: boolean;
  webSocketStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  jobProgress: {
    [jobId: string]: {
      step: string;
      progress: number;
      message?: string;
      estimatedTimeRemaining?: number;
      timestamp: Date;
    };
  };
}

export const initialJobState: JobState = {
  jobs: [],
  selectedJob: null,
  loading: false,
  error: null,
  creating: false,
  // WebSocket-related initial state
  webSocketConnected: false,
  webSocketStatus: 'disconnected',
  jobProgress: {},
};
