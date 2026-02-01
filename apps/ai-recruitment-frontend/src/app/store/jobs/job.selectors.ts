import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { JobState } from './job.state';
import type { JobListItem, Job } from './job.model';

// Feature selector for the job state
export const selectJobState = createFeatureSelector<JobState>('jobs');

// Basic state selectors
export const selectAllJobs = createSelector(
  selectJobState,
  (state: JobState): JobListItem[] => state.jobs,
);

export const selectSelectedJob = createSelector(
  selectJobState,
  (state: JobState): Job | null => state.selectedJob,
);

export const selectJobsLoading = createSelector(
  selectJobState,
  (state: JobState): boolean => state.loading,
);

export const selectJobsError = createSelector(
  selectJobState,
  (state: JobState): string | null => state.error,
);

export const selectJobsCreating = createSelector(
  selectJobState,
  (state: JobState): boolean => state.creating,
);

// Derived selectors
export const selectJobsCount = createSelector(
  selectAllJobs,
  (jobs: JobListItem[]): number => jobs.length,
);

export const selectActiveJobs = createSelector(
  selectAllJobs,
  (jobs: JobListItem[]): JobListItem[] =>
    jobs.filter((job) => job.status === 'active'),
);

export const selectJobById = (jobId: string) =>
  createSelector(
    selectAllJobs,
    (jobs: JobListItem[]): JobListItem | undefined =>
      jobs.find((job) => job.id === jobId),
  );

export const selectJobsByStatus = (status: string) =>
  createSelector(selectAllJobs, (jobs: JobListItem[]): JobListItem[] =>
    jobs.filter((job) => job.status === status),
  );

// UI state selectors
export const selectJobsLoadingState = createSelector(
  selectJobsLoading,
  selectJobsCreating,
  (loading: boolean, creating: boolean) => ({
    loading,
    creating,
    isLoading: loading || creating,
  }),
);

export const selectJobsWithError = createSelector(
  selectJobsError,
  selectJobsLoading,
  (error: string | null, loading: boolean) => ({
    error,
    hasError: !!error && !loading,
  }),
);

// Complex derived selectors
export const selectJobsStatistics = createSelector(
  selectAllJobs,
  (jobs: JobListItem[]) => {
    const total = jobs.length;
    const active = jobs.filter((job) => job.status === 'active').length;
    const draft = jobs.filter((job) => job.status === 'draft').length;
    const closed = jobs.filter((job) => job.status === 'closed').length;
    const processing = jobs.filter((job) => job.status === 'processing').length;
    const totalApplicants = jobs.reduce(
      (sum, job) => sum + (job.resumeCount || 0),
      0,
    );
    const totalDaysSinceCreation = jobs.reduce((sum, job) => {
      const createdAt = new Date(job.createdAt).getTime();
      const now = Date.now();
      return createdAt ? sum + Math.max(0, now - createdAt) : sum;
    }, 0);
    const avgTimeToHire =
      total > 0
        ? Math.max(
            0,
            Math.round(totalDaysSinceCreation / total / (1000 * 60 * 60 * 24)),
          )
        : 0;

    return {
      total,
      active,
      draft,
      closed,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      totalJobs: total,
      activeJobs: active,
      draftJobs: draft,
      closedJobs: closed,
      processingJobs: processing,
      totalApplicants,
      avgTimeToHire,
    };
  },
);

// Feature selector for specific job operations
export const selectJobManagementState = createSelector(
  selectJobState,
  (state: JobState) => ({
    jobs: state.jobs,
    selectedJob: state.selectedJob,
    loading: state.loading,
    creating: state.creating,
    error: state.error,
    canCreateJob: !state.loading && !state.creating,
    hasJobs: state.jobs.length > 0,
  }),
);

// WebSocket-related selectors
export const selectWebSocketStatus = createSelector(
  selectJobState,
  (state: JobState): 'connecting' | 'connected' | 'disconnected' | 'error' =>
    state.webSocketStatus,
);

export const selectWebSocketConnected = createSelector(
  selectJobState,
  (state: JobState): boolean => state.webSocketConnected,
);

export const selectJobProgress = createSelector(
  selectJobState,
  (state: JobState) => state.jobProgress,
);

export const selectJobProgressById = (jobId: string) =>
  createSelector(
    selectJobProgress,
    (jobProgress) => jobProgress[jobId] || null,
  );

// Enhanced job management state with WebSocket info
export const selectJobManagementStateWithWebSocket = createSelector(
  selectJobState,
  (state: JobState) => ({
    jobs: state.jobs,
    selectedJob: state.selectedJob,
    loading: state.loading,
    creating: state.creating,
    error: state.error,
    canCreateJob: !state.loading && !state.creating,
    hasJobs: state.jobs.length > 0,
    webSocketConnected: state.webSocketConnected,
    webSocketStatus: state.webSocketStatus,
    jobProgress: state.jobProgress,
  }),
);

// Selector for jobs with their current progress
export const selectJobsWithProgress = createSelector(
  selectAllJobs,
  selectJobProgress,
  (jobs, jobProgress) =>
    jobs.map((job) => ({
      ...job,
      progress: jobProgress[job.id] || null,
    })),
);
