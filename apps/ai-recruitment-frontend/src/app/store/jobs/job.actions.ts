import { createAction, props } from '@ngrx/store';
import {
  Job,
  JobListItem,
  CreateJobRequest,
  CreateJobResponse,
} from './job.model';

// Load Jobs
export const loadJobs = createAction('[Job] Load Jobs');

export const loadJobsSuccess = createAction(
  '[Job] Load Jobs Success',
  props<{ jobs: JobListItem[] }>(),
);

export const loadJobsFailure = createAction(
  '[Job] Load Jobs Failure',
  props<{ error: string }>(),
);

// Load Single Job
export const loadJob = createAction(
  '[Job] Load Job',
  props<{ jobId: string }>(),
);

export const loadJobSuccess = createAction(
  '[Job] Load Job Success',
  props<{ job: Job }>(),
);

export const loadJobFailure = createAction(
  '[Job] Load Job Failure',
  props<{ error: string }>(),
);

// Create Job
export const createJob = createAction(
  '[Job] Create Job',
  props<{ request: CreateJobRequest }>(),
);

export const createJobSuccess = createAction(
  '[Job] Create Job Success',
  props<{ response: CreateJobResponse }>(),
);

export const createJobFailure = createAction(
  '[Job] Create Job Failure',
  props<{ error: string }>(),
);

// Clear Selected Job
export const clearSelectedJob = createAction('[Job] Clear Selected Job');

// Clear Error
export const clearJobError = createAction('[Job] Clear Error');

// WebSocket Job Updates
export const jobUpdatedViaWebSocket = createAction(
  '[Job] Job Updated via WebSocket',
  props<{
    jobId: string;
    title: string;
    status:
      | 'processing'
      | 'completed'
      | 'failed'
      | 'active'
      | 'draft'
      | 'closed';
    timestamp: Date;
    organizationId?: string;
    metadata?: {
      confidence?: number;
      extractedKeywords?: string[];
      processingTime?: number;
      errorMessage?: string;
    };
  }>(),
);

export const jobProgressViaWebSocket = createAction(
  '[Job] Job Progress via WebSocket',
  props<{
    jobId: string;
    step: string;
    progress: number;
    message?: string;
    estimatedTimeRemaining?: number;
    timestamp: Date;
  }>(),
);

// WebSocket Connection Management
export const initializeWebSocketConnection = createAction(
  '[Job] Initialize WebSocket Connection',
  props<{ sessionId: string; organizationId?: string }>(),
);

export const subscribeToJobUpdates = createAction(
  '[Job] Subscribe to Job Updates',
  props<{ jobId: string; organizationId?: string }>(),
);

export const unsubscribeFromJobUpdates = createAction(
  '[Job] Unsubscribe from Job Updates',
  props<{ jobId: string }>(),
);

export const webSocketConnectionStatusChanged = createAction(
  '[Job] WebSocket Connection Status Changed',
  props<{ status: 'connecting' | 'connected' | 'disconnected' | 'error' }>(),
);
