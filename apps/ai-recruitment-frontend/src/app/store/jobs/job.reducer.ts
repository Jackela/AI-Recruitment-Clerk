import { createReducer, on } from '@ngrx/store';
import { initialJobState } from './job.state';
import * as JobActions from './job.actions';

export const jobReducer = createReducer(
  initialJobState,

  // Load Jobs
  on(JobActions.loadJobs, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(JobActions.loadJobsSuccess, (state, { jobs }) => ({
    ...state,
    jobs,
    loading: false,
    error: null,
  })),

  on(JobActions.loadJobsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Load Single Job
  on(JobActions.loadJob, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(JobActions.loadJobSuccess, (state, { job }) => ({
    ...state,
    selectedJob: job,
    loading: false,
    error: null,
  })),

  on(JobActions.loadJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Create Job
  on(JobActions.createJob, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),

  on(JobActions.createJobSuccess, (state, { response: _ }) => ({
    ...state,
    creating: false,
    error: null,
    // Note: We'll reload the jobs list after creation
  })),

  on(JobActions.createJobFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),

  // Clear Selected Job
  on(JobActions.clearSelectedJob, (state) => ({
    ...state,
    selectedJob: null,
  })),

  // Clear Error
  on(JobActions.clearJobError, (state) => ({
    ...state,
    error: null,
  })),

  // WebSocket Job Updates
  on(
    JobActions.jobUpdatedViaWebSocket,
    (state, { jobId, title, status, timestamp, organizationId, metadata }) => {
      // Update the job in the jobs array
      const updatedJobs = state.jobs.map((job) => {
        if (job.id === jobId) {
          return {
            ...job,
            title,
            status,
            // Add any additional fields that might be updated
          };
        }
        return job;
      });

      // Update selected job if it matches
      const updatedSelectedJob =
        state.selectedJob?.id === jobId
          ? {
              ...state.selectedJob,
              title,
              status,
            }
          : state.selectedJob;

      return {
        ...state,
        jobs: updatedJobs,
        selectedJob: updatedSelectedJob,
        // Clear any previous errors when receiving updates
        error: null,
      };
    },
  ),

  on(
    JobActions.jobProgressViaWebSocket,
    (
      state,
      { jobId, step, progress, message, estimatedTimeRemaining, timestamp },
    ) => ({
      ...state,
      jobProgress: {
        ...state.jobProgress,
        [jobId]: {
          step,
          progress,
          message,
          estimatedTimeRemaining,
          timestamp,
        },
      },
    }),
  ),

  // WebSocket Connection Management
  on(JobActions.webSocketConnectionStatusChanged, (state, { status }) => ({
    ...state,
    webSocketStatus: status,
    webSocketConnected: status === 'connected',
  })),

  on(JobActions.initializeWebSocketConnection, (state) => ({
    ...state,
    webSocketStatus: 'connecting' as const,
  })),
);
