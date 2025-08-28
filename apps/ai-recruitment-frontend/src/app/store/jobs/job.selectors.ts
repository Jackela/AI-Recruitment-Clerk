import { createFeatureSelector, createSelector } from '@ngrx/store';
import { JobState } from './job.state';
import { JobListItem, Job } from './job.model';

// Feature selector for the job state
export const selectJobState = createFeatureSelector<JobState>('jobs');

// Basic state selectors
export const selectAllJobs = createSelector(
  selectJobState,
  (state: JobState): JobListItem[] => state.jobs
);

export const selectSelectedJob = createSelector(
  selectJobState,
  (state: JobState): Job | null => state.selectedJob
);

export const selectJobsLoading = createSelector(
  selectJobState,
  (state: JobState): boolean => state.loading
);

export const selectJobsError = createSelector(
  selectJobState,
  (state: JobState): string | null => state.error
);

export const selectJobsCreating = createSelector(
  selectJobState,
  (state: JobState): boolean => state.creating
);

// Derived selectors
export const selectJobsCount = createSelector(
  selectAllJobs,
  (jobs: JobListItem[]): number => jobs.length
);

export const selectActiveJobs = createSelector(
  selectAllJobs,
  (jobs: JobListItem[]): JobListItem[] => 
    jobs.filter(job => job.status === 'active')
);

export const selectJobById = (jobId: string) => createSelector(
  selectAllJobs,
  (jobs: JobListItem[]): JobListItem | undefined => 
    jobs.find(job => job.id === jobId)
);

export const selectJobsByStatus = (status: string) => createSelector(
  selectAllJobs,
  (jobs: JobListItem[]): JobListItem[] =>
    jobs.filter(job => job.status === status)
);

// UI state selectors
export const selectJobsLoadingState = createSelector(
  selectJobsLoading,
  selectJobsCreating,
  (loading: boolean, creating: boolean) => ({
    loading,
    creating,
    isLoading: loading || creating
  })
);

export const selectJobsWithError = createSelector(
  selectJobsError,
  selectJobsLoading,
  (error: string | null, loading: boolean) => ({
    error,
    hasError: !!error && !loading
  })
);

// Complex derived selectors
export const selectJobsStatistics = createSelector(
  selectAllJobs,
  (jobs: JobListItem[]) => {
    const total = jobs.length;
    const active = jobs.filter(job => job.status === 'active').length;
    const draft = jobs.filter(job => job.status === 'draft').length;
    const closed = jobs.filter(job => job.status === 'closed').length;
    
    return {
      total,
      active,
      draft,
      closed,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }
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
    hasJobs: state.jobs.length > 0
  })
);