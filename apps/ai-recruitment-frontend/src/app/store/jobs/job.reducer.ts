import { createReducer, on } from '@ngrx/store';
import { initialJobState } from './job.state';
import * as JobActions from './job.actions';

export const jobReducer = createReducer(
  initialJobState,

  // Load Jobs
  on(JobActions.loadJobs, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.loadJobsSuccess, (state, { jobs }) => ({
    ...state,
    jobs,
    loading: false,
    error: null
  })),

  on(JobActions.loadJobsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Job
  on(JobActions.loadJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.loadJobSuccess, (state, { job }) => ({
    ...state,
    selectedJob: job,
    loading: false,
    error: null
  })),

  on(JobActions.loadJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Job
  on(JobActions.createJob, (state) => ({
    ...state,
    creating: true,
    error: null
  })),

  on(JobActions.createJobSuccess, (state, { response: _ }) => ({
    ...state,
    creating: false,
    error: null
    // Note: We'll reload the jobs list after creation
  })),

  on(JobActions.createJobFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error
  })),

  // Clear Selected Job
  on(JobActions.clearSelectedJob, (state) => ({
    ...state,
    selectedJob: null
  })),

  // Clear Error
  on(JobActions.clearJobError, (state) => ({
    ...state,
    error: null
  }))
);
