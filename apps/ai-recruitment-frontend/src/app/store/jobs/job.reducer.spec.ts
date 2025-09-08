import { jobReducer } from './job.reducer';
import { initialJobState, JobState } from './job.state';
import * as JobActions from './job.actions';
import {
  Job,
  JobListItem,
  CreateJobRequest,
  CreateJobResponse,
} from './job.model';

describe('Job Reducer', () => {
  const mockJobListItems: JobListItem[] = [
    {
      id: '1',
      title: '软件工程师',
      status: 'completed',
      createdAt: new Date('2024-01-01'),
      resumeCount: 5,
    },
    {
      id: '2',
      title: '产品经理',
      status: 'processing',
      createdAt: new Date('2024-01-02'),
      resumeCount: 2,
    },
  ];

  const mockJob: Job = {
    id: '1',
    title: '软件工程师',
    jdText: '招聘软件工程师...',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5,
  };

  const mockCreateJobResponse: CreateJobResponse = {
    jobId: 'new-job-id',
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const result = jobReducer(undefined, { type: 'Unknown' } as any);
      expect(result).toBe(initialJobState);
    });

    it('should have correct initial values', () => {
      expect(initialJobState.jobs).toEqual([]);
      expect(initialJobState.selectedJob).toBeNull();
      expect(initialJobState.loading).toBe(false);
      expect(initialJobState.error).toBeNull();
      expect(initialJobState.creating).toBe(false);
    });
  });

  describe('Load Jobs Actions', () => {
    it('should handle loadJobs', () => {
      const action = JobActions.loadJobs();
      const state = jobReducer(initialJobState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadJobsSuccess', () => {
      const loadingState: JobState = {
        ...initialJobState,
        loading: true,
      };
      const action = JobActions.loadJobsSuccess({ jobs: mockJobListItems });
      const state = jobReducer(loadingState, action);

      expect(state.jobs).toEqual(mockJobListItems);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadJobsFailure', () => {
      const loadingState: JobState = {
        ...initialJobState,
        loading: true,
      };
      const error = 'Failed to load jobs';
      const action = JobActions.loadJobsFailure({ error });
      const state = jobReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Load Single Job Actions', () => {
    it('should handle loadJob', () => {
      const action = JobActions.loadJob({ jobId: '1' });
      const state = jobReducer(initialJobState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadJobSuccess', () => {
      const loadingState: JobState = {
        ...initialJobState,
        loading: true,
      };
      const action = JobActions.loadJobSuccess({ job: mockJob });
      const state = jobReducer(loadingState, action);

      expect(state.selectedJob).toEqual(mockJob);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadJobFailure', () => {
      const loadingState: JobState = {
        ...initialJobState,
        loading: true,
      };
      const error = 'Failed to load job';
      const action = JobActions.loadJobFailure({ error });
      const state = jobReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Create Job Actions', () => {
    it('should handle createJob', () => {
      const request = {
        jobTitle: '新岗位',
        jdText: '新岗位描述',
      };
      const action = JobActions.createJob({ request });
      const state = jobReducer(initialJobState, action);

      expect(state.creating).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle createJobSuccess', () => {
      const creatingState: JobState = {
        ...initialJobState,
        creating: true,
      };
      const action = JobActions.createJobSuccess({
        response: mockCreateJobResponse,
      });
      const state = jobReducer(creatingState, action);

      expect(state.creating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle createJobFailure', () => {
      const creatingState: JobState = {
        ...initialJobState,
        creating: true,
      };
      const error = 'Failed to create job';
      const action = JobActions.createJobFailure({ error });
      const state = jobReducer(creatingState, action);

      expect(state.creating).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Utility Actions', () => {
    it('should handle clearSelectedJob', () => {
      const stateWithSelectedJob: JobState = {
        ...initialJobState,
        selectedJob: mockJob,
      };
      const action = JobActions.clearSelectedJob();
      const state = jobReducer(stateWithSelectedJob, action);

      expect(state.selectedJob).toBeNull();
    });

    it('should handle clearJobError', () => {
      const stateWithError: JobState = {
        ...initialJobState,
        error: 'Some error',
      };
      const action = JobActions.clearJobError();
      const state = jobReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = { ...initialJobState };
      const action = JobActions.loadJobs();
      const newState = jobReducer(initialJobState, action);

      expect(initialJobState).toEqual(originalState);
      expect(newState).not.toBe(initialJobState);
    });

    it('should preserve other state properties when updating specific ones', () => {
      const stateWithData: JobState = {
        ...initialJobState,
        jobs: mockJobListItems,
        selectedJob: mockJob,
      };
      const action = JobActions.loadJobs();
      const newState = jobReducer(stateWithData, action);

      expect(newState.jobs).toEqual(mockJobListItems);
      expect(newState.selectedJob).toEqual(mockJob);
      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });
});
