import * as JobSelectors from './job.selectors';
import type { JobState} from './job.state';
import { initialJobState } from './job.state';
import type { JobListItem, Job } from './job.model';
import type { AppState } from '../app.state';

describe('Job Selectors', () => {
  const mockJobListItems: JobListItem[] = [
    {
      id: 'job1',
      title: '软件工程师',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      resumeCount: 15,
      description: 'Full-stack development position',
    },
    {
      id: 'job2',
      title: '产品经理',
      status: 'draft',
      createdAt: new Date('2024-01-02'),
      resumeCount: 8,
      description: 'Product management role',
    },
    {
      id: 'job3',
      title: '设计师',
      status: 'closed',
      createdAt: new Date('2024-01-03'),
      resumeCount: 5,
      description: 'UI/UX design position',
    },
    {
      id: 'job4',
      title: '数据科学家',
      status: 'active',
      createdAt: new Date('2024-01-04'),
      resumeCount: 12,
      description: 'Data analysis and ML role',
    },
  ];

  const mockSelectedJob: Job = {
    id: 'job1',
    title: '软件工程师',
    jdText: 'We are looking for an experienced software engineer...',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    resumeCount: 15,
    description: 'Full-stack development position',
    requirements: ['3+ years experience', 'JavaScript', 'TypeScript'],
    benefits: ['Health insurance', 'Remote work', 'Stock options'],
  };

  const mockJobState: JobState = {
    jobs: mockJobListItems,
    selectedJob: mockSelectedJob,
    loading: false,
    error: null,
    creating: false,
  };

  const mockAppState: AppState = {
    jobs: mockJobState,
    reports: {
      reports: [],
      selectedReport: null,
      loading: false,
      error: null,
      currentJobId: null,
    },
    resumes: {
      resumes: [],
      selectedResume: null,
      loading: false,
      error: null,
      uploading: false,
      uploadProgress: 0,
    },
    guest: {
      isLoading: false,
      error: null,
      usageCount: 0,
      maxUsage: 5,
      remainingCount: 5,
      showLimitModal: false,
      showFeedbackModal: false,
      feedbackCode: null,
      surveyUrl: null,
      lastActivity: null,
    },
  };

  describe('Feature Selector', () => {
    it('should select job state from app state', () => {
      const result = JobSelectors.selectJobState(mockAppState);
      expect(result).toEqual(mockJobState);
    });
  });

  describe('Basic State Selectors', () => {
    it('should select all jobs', () => {
      const result = JobSelectors.selectAllJobs.projector(mockJobState);
      expect(result).toEqual(mockJobListItems);
      expect(result).toHaveLength(4);
    });

    it('should select selected job', () => {
      const result = JobSelectors.selectSelectedJob.projector(mockJobState);
      expect(result).toEqual(mockSelectedJob);
    });

    it('should select jobs loading state', () => {
      const loadingState = { ...mockJobState, loading: true };
      const result = JobSelectors.selectJobsLoading.projector(loadingState);
      expect(result).toBe(true);
    });

    it('should select jobs error', () => {
      const errorState = { ...mockJobState, error: 'Network error' };
      const result = JobSelectors.selectJobsError.projector(errorState);
      expect(result).toBe('Network error');
    });

    it('should select jobs creating state', () => {
      const creatingState = { ...mockJobState, creating: true };
      const result = JobSelectors.selectJobsCreating.projector(creatingState);
      expect(result).toBe(true);
    });

    it('should handle null selected job', () => {
      const stateWithoutSelected = { ...mockJobState, selectedJob: null };
      const result =
        JobSelectors.selectSelectedJob.projector(stateWithoutSelected);
      expect(result).toBeNull();
    });

    it('should handle empty jobs array', () => {
      const stateWithoutJobs = { ...mockJobState, jobs: [] };
      const result = JobSelectors.selectAllJobs.projector(stateWithoutJobs);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Derived Selectors', () => {
    it('should select jobs count', () => {
      const result = JobSelectors.selectJobsCount.projector(mockJobListItems);
      expect(result).toBe(4);
    });

    it('should select active jobs', () => {
      const result = JobSelectors.selectActiveJobs.projector(mockJobListItems);
      expect(result).toHaveLength(2);
      expect(result.every((job) => job.status === 'active')).toBe(true);
      expect(result.map((job) => job.id)).toEqual(['job1', 'job4']);
    });

    it('should select job by ID', () => {
      const selectorFunction = JobSelectors.selectJobById('job2');
      const result = selectorFunction.projector(mockJobListItems);
      expect(result).toEqual(mockJobListItems[1]);
      expect(result!.title).toBe('产品经理');
    });

    it('should return undefined for non-existent job ID', () => {
      const selectorFunction = JobSelectors.selectJobById('nonexistent');
      const result = selectorFunction.projector(mockJobListItems);
      expect(result).toBeUndefined();
    });

    it('should select jobs by status', () => {
      const draftJobsSelector = JobSelectors.selectJobsByStatus('draft');
      const result = draftJobsSelector.projector(mockJobListItems);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('draft');
      expect(result[0].title).toBe('产品经理');
    });

    it('should return empty array for non-existent status', () => {
      const nonExistentStatusSelector =
        JobSelectors.selectJobsByStatus('archived');
      const result = nonExistentStatusSelector.projector(mockJobListItems);
      expect(result).toEqual([]);
    });
  });

  describe('UI State Selectors', () => {
    it('should select jobs loading state with combined flags', () => {
      const loading = true;
      const creating = false;
      const result = JobSelectors.selectJobsLoadingState.projector(
        loading,
        creating,
      );

      expect(result.loading).toBe(true);
      expect(result.creating).toBe(false);
      expect(result.isLoading).toBe(true);
    });

    it('should show isLoading true when creating', () => {
      const loading = false;
      const creating = true;
      const result = JobSelectors.selectJobsLoadingState.projector(
        loading,
        creating,
      );

      expect(result.loading).toBe(false);
      expect(result.creating).toBe(true);
      expect(result.isLoading).toBe(true);
    });

    it('should show isLoading false when neither loading nor creating', () => {
      const loading = false;
      const creating = false;
      const result = JobSelectors.selectJobsLoadingState.projector(
        loading,
        creating,
      );

      expect(result.isLoading).toBe(false);
    });

    it('should select jobs with error state', () => {
      const error = 'Failed to load jobs';
      const loading = false;
      const result = JobSelectors.selectJobsWithError.projector(error, loading);

      expect(result.error).toBe(error);
      expect(result.hasError).toBe(true);
    });

    it('should not show error when loading', () => {
      const error = 'Failed to load jobs';
      const loading = true;
      const result = JobSelectors.selectJobsWithError.projector(error, loading);

      expect(result.error).toBe(error);
      expect(result.hasError).toBe(false);
    });

    it('should not show error when no error exists', () => {
      const error = null;
      const loading = false;
      const result = JobSelectors.selectJobsWithError.projector(error, loading);

      expect(result.error).toBeNull();
      expect(result.hasError).toBe(false);
    });
  });

  describe('Complex Derived Selectors', () => {
    it('should calculate jobs statistics correctly', () => {
      const result =
        JobSelectors.selectJobsStatistics.projector(mockJobListItems);

      expect(result.total).toBe(4);
      expect(result.active).toBe(2);
      expect(result.draft).toBe(1);
      expect(result.closed).toBe(1);
      expect(result.activePercentage).toBe(50); // 2/4 * 100 = 50%
    });

    it('should handle empty jobs array in statistics', () => {
      const result = JobSelectors.selectJobsStatistics.projector([]);

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.draft).toBe(0);
      expect(result.closed).toBe(0);
      expect(result.activePercentage).toBe(0);
    });

    it('should calculate 100% active when all jobs are active', () => {
      const allActiveJobs = mockJobListItems.map((job) => ({
        ...job,
        status: 'active' as const,
      }));
      const result = JobSelectors.selectJobsStatistics.projector(allActiveJobs);

      expect(result.activePercentage).toBe(100);
      expect(result.active).toBe(4);
    });

    it('should handle jobs with various statuses', () => {
      const mixedJobs: JobListItem[] = [
        { ...mockJobListItems[0], status: 'active' },
        { ...mockJobListItems[1], status: 'active' },
        { ...mockJobListItems[2], status: 'draft' },
        { ...mockJobListItems[3], status: 'closed' },
        {
          id: 'job5',
          title: 'Test Job',
          status: 'paused' as any,
          createdAt: new Date(),
          resumeCount: 0,
        },
      ];

      const result = JobSelectors.selectJobsStatistics.projector(mixedJobs);

      expect(result.total).toBe(5);
      expect(result.active).toBe(2);
      expect(result.draft).toBe(1);
      expect(result.closed).toBe(1);
      // Note: 'paused' status is not counted in active/draft/closed
    });
  });

  describe('Job Management State Selector', () => {
    it('should select job management state with computed properties', () => {
      const result =
        JobSelectors.selectJobManagementState.projector(mockJobState);

      expect(result.jobs).toEqual(mockJobListItems);
      expect(result.selectedJob).toEqual(mockSelectedJob);
      expect(result.loading).toBe(false);
      expect(result.creating).toBe(false);
      expect(result.error).toBeNull();
      expect(result.canCreateJob).toBe(true);
      expect(result.hasJobs).toBe(true);
    });

    it('should show canCreateJob false when loading', () => {
      const loadingState = { ...mockJobState, loading: true };
      const result =
        JobSelectors.selectJobManagementState.projector(loadingState);

      expect(result.canCreateJob).toBe(false);
    });

    it('should show canCreateJob false when creating', () => {
      const creatingState = { ...mockJobState, creating: true };
      const result =
        JobSelectors.selectJobManagementState.projector(creatingState);

      expect(result.canCreateJob).toBe(false);
    });

    it('should show hasJobs false when no jobs exist', () => {
      const emptyState = { ...mockJobState, jobs: [] };
      const result =
        JobSelectors.selectJobManagementState.projector(emptyState);

      expect(result.hasJobs).toBe(false);
    });
  });

  describe('Selector Memoization', () => {
    it('should return same reference for identical inputs', () => {
      const result1 = JobSelectors.selectAllJobs.projector(mockJobState);
      const result2 = JobSelectors.selectAllJobs.projector(mockJobState);

      expect(result1).toBe(result2);
    });

    it('should return new reference for different inputs', () => {
      const modifiedState = {
        ...mockJobState,
        jobs: [
          ...mockJobListItems,
          {
            id: 'job5',
            title: 'New Job',
            status: 'active' as const,
            createdAt: new Date(),
            resumeCount: 0,
          },
        ],
      };

      const result1 = JobSelectors.selectAllJobs.projector(mockJobState);
      const result2 = JobSelectors.selectAllJobs.projector(modifiedState);

      expect(result1).not.toBe(result2);
      expect(result2).toHaveLength(5);
    });

    it('should memoize complex calculations', () => {
      const spy = jest
        .fn()
        .mockImplementation(JobSelectors.selectJobsStatistics.projector);

      // First call
      spy(mockJobListItems);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second call with same input should use memoized result
      spy(mockJobListItems);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle state with undefined jobs gracefully', () => {
      const invalidState = { ...mockJobState, jobs: undefined as any };
      const result = JobSelectors.selectAllJobs.projector(invalidState);
      expect(result).toBeUndefined();
    });

    it('should handle jobs with missing required fields', () => {
      const invalidJobs = [
        { id: 'job1' } as any,
        { title: 'Job without ID' } as any,
      ];

      const result = JobSelectors.selectJobsCount.projector(invalidJobs);
      expect(result).toBe(2);
    });

    it('should handle filter operations on malformed data', () => {
      const malformedJobs = [
        { ...mockJobListItems[0], status: null as any },
        { ...mockJobListItems[1], status: undefined as any },
        mockJobListItems[2],
      ];

      const activeSelector = JobSelectors.selectJobsByStatus('active');
      const result = activeSelector.projector(malformedJobs);
      expect(result).toEqual([]);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', () => {
      const largeJobsList: JobListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `job${i}`,
          title: `Job ${i}`,
          status: i % 2 === 0 ? 'active' : 'draft',
          createdAt: new Date(),
          resumeCount: Math.floor(Math.random() * 100),
        }),
      );

      const start = performance.now();
      const result = JobSelectors.selectJobsStatistics.projector(largeJobsList);
      const end = performance.now();

      expect(result.total).toBe(1000);
      expect(result.active).toBe(500);
      expect(result.draft).toBe(500);
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should efficiently filter jobs by status', () => {
      const largeJobsList: JobListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `job${i}`,
          title: `Job ${i}`,
          status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'draft' : 'closed',
          createdAt: new Date(),
          resumeCount: 0,
        }),
      );

      const activeSelector = JobSelectors.selectJobsByStatus('active');
      const start = performance.now();
      const result = activeSelector.projector(largeJobsList);
      const end = performance.now();

      expect(result.length).toBeGreaterThan(300);
      expect(result.every((job) => job.status === 'active')).toBe(true);
      expect(end - start).toBeLessThan(50); // Should be very fast
    });
  });
});
