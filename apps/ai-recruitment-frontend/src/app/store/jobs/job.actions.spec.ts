import * as JobActions from './job.actions';
import { Job, JobListItem, CreateJobRequest, CreateJobResponse } from './job.model';

describe('Job Actions', () => {
  const mockJobListItem: JobListItem = {
    id: '1',
    title: '软件工程师',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5
  };

  const mockJob: Job = {
    id: '1',
    title: '软件工程师',
    jdText: '招聘软件工程师...',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5
  };

  const mockCreateJobRequest: CreateJobRequest = {
    jobTitle: '新岗位',
    jdText: '这是一个新岗位的描述'
  };

  const mockCreateJobResponse: CreateJobResponse = {
    jobId: 'new-job-id'
  };

  describe('Load Jobs Actions', () => {
    it('should create loadJobs action', () => {
      const action = JobActions.loadJobs();
      expect(action.type).toBe('[Job] Load Jobs');
    });

    it('should create loadJobsSuccess action', () => {
      const jobs = [mockJobListItem];
      const action = JobActions.loadJobsSuccess({ jobs });
      expect(action.type).toBe('[Job] Load Jobs Success');
      expect(action.jobs).toEqual(jobs);
    });

    it('should create loadJobsFailure action', () => {
      const error = 'Failed to load jobs';
      const action = JobActions.loadJobsFailure({ error });
      expect(action.type).toBe('[Job] Load Jobs Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Load Single Job Actions', () => {
    it('should create loadJob action', () => {
      const jobId = '1';
      const action = JobActions.loadJob({ jobId });
      expect(action.type).toBe('[Job] Load Job');
      expect(action.jobId).toBe(jobId);
    });

    it('should create loadJobSuccess action', () => {
      const action = JobActions.loadJobSuccess({ job: mockJob });
      expect(action.type).toBe('[Job] Load Job Success');
      expect(action.job).toEqual(mockJob);
    });

    it('should create loadJobFailure action', () => {
      const error = 'Failed to load job';
      const action = JobActions.loadJobFailure({ error });
      expect(action.type).toBe('[Job] Load Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Create Job Actions', () => {
    it('should create createJob action', () => {
      const action = JobActions.createJob({ request: mockCreateJobRequest });
      expect(action.type).toBe('[Job] Create Job');
      expect(action.request).toEqual(mockCreateJobRequest);
    });

    it('should create createJobSuccess action', () => {
      const action = JobActions.createJobSuccess({ response: mockCreateJobResponse });
      expect(action.type).toBe('[Job] Create Job Success');
      expect(action.response).toEqual(mockCreateJobResponse);
    });

    it('should create createJobFailure action', () => {
      const error = 'Failed to create job';
      const action = JobActions.createJobFailure({ error });
      expect(action.type).toBe('[Job] Create Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Utility Actions', () => {
    it('should create clearSelectedJob action', () => {
      const action = JobActions.clearSelectedJob();
      expect(action.type).toBe('[Job] Clear Selected Job');
    });

    it('should create clearJobError action', () => {
      const action = JobActions.clearJobError();
      expect(action.type).toBe('[Job] Clear Error');
    });
  });
});
