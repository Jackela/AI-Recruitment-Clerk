import * as ReportSelectors from './report.selectors';
import type { ReportState} from './report.state';
import { initialReportState as _initialReportState } from './report.state';
import type { ReportListItem, AnalysisReport } from './report.model';
import type { AppState } from '../app.state';

describe('Report Selectors', () => {
  const mockReportListItems: ReportListItem[] = [
    {
      id: 'report1',
      candidateName: 'John Doe',
      matchScore: 85,
      oneSentenceSummary: 'Strong technical candidate with relevant experience',
      status: 'completed',
      generatedAt: new Date('2024-01-01'),
    },
    {
      id: 'report2',
      candidateName: 'Jane Smith',
      matchScore: 92,
      oneSentenceSummary: 'Excellent candidate with perfect skill match',
      status: 'processing',
      generatedAt: new Date('2024-01-02'),
    },
    {
      id: 'report3',
      candidateName: 'Bob Johnson',
      matchScore: 78,
      oneSentenceSummary: 'Good candidate with some experience gaps',
      status: 'completed',
      generatedAt: new Date('2024-01-03'),
    },
    {
      id: 'report4',
      candidateName: 'Alice Williams',
      matchScore: 88,
      oneSentenceSummary: 'Strong candidate with diverse background',
      status: 'failed',
      generatedAt: new Date('2024-01-04'),
    },
  ];

  const mockSelectedReport: AnalysisReport = {
    id: 'report1',
    resumeId: 'resume1',
    jobId: 'job1',
    candidateName: 'John Doe',
    matchScore: 85,
    oneSentenceSummary: 'Strong technical candidate with relevant experience',
    strengths: ['JavaScript expertise', 'Team leadership', 'Problem solving'],
    potentialGaps: ['Limited mobile development experience'],
    redFlags: ['Gap in employment history'],
    suggestedInterviewQuestions: [
      'Tell me about your JavaScript experience',
      'How do you handle team conflicts?',
    ],
    generatedAt: new Date('2024-01-01'),
  };

  const mockReportState: ReportState = {
    reports: mockReportListItems,
    selectedReport: mockSelectedReport,
    loading: false,
    error: null,
    currentJobId: 'job1',
  };

  const mockAppState: AppState = {
    jobs: {
      jobs: [],
      selectedJob: null,
      loading: false,
      error: null,
      creating: false,
    },
    reports: mockReportState,
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
    it('should select report state from app state', () => {
      const result = ReportSelectors.selectReportState(mockAppState);
      expect(result).toEqual(mockReportState);
    });
  });

  describe('Basic State Selectors', () => {
    it('should select all reports', () => {
      const result =
        ReportSelectors.selectAllReports.projector(mockReportState);
      expect(result).toEqual(mockReportListItems);
      expect(result).toHaveLength(4);
    });

    it('should select selected report', () => {
      const result =
        ReportSelectors.selectSelectedReport.projector(mockReportState);
      expect(result).toEqual(mockSelectedReport);
    });

    it('should select reports loading state', () => {
      const loadingState = { ...mockReportState, loading: true };
      const result =
        ReportSelectors.selectReportsLoading.projector(loadingState);
      expect(result).toBe(true);
    });

    it('should select reports error', () => {
      const errorState = { ...mockReportState, error: 'Network error' };
      const result = ReportSelectors.selectReportsError.projector(errorState);
      expect(result).toBe('Network error');
    });

    it('should select current job ID', () => {
      const result =
        ReportSelectors.selectCurrentJobId.projector(mockReportState);
      expect(result).toBe('job1');
    });

    it('should handle null selected report', () => {
      const stateWithoutSelected = { ...mockReportState, selectedReport: null };
      const result =
        ReportSelectors.selectSelectedReport.projector(stateWithoutSelected);
      expect(result).toBeNull();
    });

    it('should handle empty reports array', () => {
      const stateWithoutReports = { ...mockReportState, reports: [] };
      const result =
        ReportSelectors.selectAllReports.projector(stateWithoutReports);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle null current job ID', () => {
      const stateWithoutJobId = { ...mockReportState, currentJobId: null };
      const result =
        ReportSelectors.selectCurrentJobId.projector(stateWithoutJobId);
      expect(result).toBeNull();
    });
  });

  describe('Derived Selectors', () => {
    it('should select reports count', () => {
      const result =
        ReportSelectors.selectReportsCount.projector(mockReportListItems);
      expect(result).toBe(4);
    });

    it('should select reports by job ID', () => {
      const jobReports = [
        { ...mockReportListItems[0], jobId: 'job1' },
        { ...mockReportListItems[1], jobId: 'job1' },
        { ...mockReportListItems[2], jobId: 'job2' },
      ];
      const selectorFunction = ReportSelectors.selectReportsByJobId('job1');
      const result = selectorFunction.projector(jobReports);
      expect(result).toHaveLength(2);
      expect(result.every((report) => report.jobId === 'job1')).toBe(true);
    });

    it('should return empty array for non-existent job ID', () => {
      const jobReports = [
        { ...mockReportListItems[0], jobId: 'job1' },
        { ...mockReportListItems[1], jobId: 'job2' },
      ];
      const selectorFunction =
        ReportSelectors.selectReportsByJobId('nonexistent');
      const result = selectorFunction.projector(jobReports);
      expect(result).toEqual([]);
    });

    it('should select report by ID', () => {
      const selectorFunction = ReportSelectors.selectReportById('report2');
      const result = selectorFunction.projector(mockReportListItems);
      expect(result).toEqual(mockReportListItems[1]);
      expect(result!.candidateName).toBe('Jane Smith');
    });

    it('should return undefined for non-existent report ID', () => {
      const selectorFunction = ReportSelectors.selectReportById('nonexistent');
      const result = selectorFunction.projector(mockReportListItems);
      expect(result).toBeUndefined();
    });

    it('should select reports by status', () => {
      const completedReportsSelector =
        ReportSelectors.selectReportsByStatus('completed');
      const result = completedReportsSelector.projector(mockReportListItems);
      expect(result).toHaveLength(2);
      expect(result.every((report) => report.status === 'completed')).toBe(
        true,
      );
      expect(result.map((report) => report.candidateName)).toEqual([
        'John Doe',
        'Bob Johnson',
      ]);
    });

    it('should return empty array for non-existent status', () => {
      const nonExistentStatusSelector =
        ReportSelectors.selectReportsByStatus('archived');
      const result = nonExistentStatusSelector.projector(mockReportListItems);
      expect(result).toEqual([]);
    });

    it('should select current job reports', () => {
      const reportsWithJobIds = [
        { ...mockReportListItems[0], jobId: 'job1' },
        { ...mockReportListItems[1], jobId: 'job1' },
        { ...mockReportListItems[2], jobId: 'job2' },
        { ...mockReportListItems[3], jobId: 'job1' },
      ];
      const result = ReportSelectors.selectCurrentJobReports.projector(
        reportsWithJobIds,
        'job1',
      );
      expect(result).toHaveLength(3);
      expect(result.every((report) => report.jobId === 'job1')).toBe(true);
    });

    it('should return empty array when no current job ID', () => {
      const result = ReportSelectors.selectCurrentJobReports.projector(
        mockReportListItems,
        null,
      );
      expect(result).toEqual([]);
    });
  });

  describe('Recent Reports Selector', () => {
    it('should select recent reports with default limit', () => {
      const recentReportsSelector = ReportSelectors.selectRecentReports();
      const result = recentReportsSelector.projector(mockReportListItems);

      expect(result).toHaveLength(4); // All reports since we only have 4
      // Should be sorted by most recent first
      expect(result[0].generatedAt).toEqual(new Date('2024-01-04'));
      expect(result[1].generatedAt).toEqual(new Date('2024-01-03'));
      expect(result[2].generatedAt).toEqual(new Date('2024-01-02'));
      expect(result[3].generatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should respect custom limit', () => {
      const recentReportsSelector = ReportSelectors.selectRecentReports(2);
      const result = recentReportsSelector.projector(mockReportListItems);

      expect(result).toHaveLength(2);
      expect(result[0].generatedAt).toEqual(new Date('2024-01-04'));
      expect(result[1].generatedAt).toEqual(new Date('2024-01-03'));
    });

    it('should handle empty reports array', () => {
      const recentReportsSelector = ReportSelectors.selectRecentReports();
      const result = recentReportsSelector.projector([]);
      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const originalReports = [...mockReportListItems];
      const recentReportsSelector = ReportSelectors.selectRecentReports();
      recentReportsSelector.projector(mockReportListItems);

      expect(mockReportListItems).toEqual(originalReports);
    });
  });

  describe('UI State Selectors', () => {
    it('should select reports loading state', () => {
      const loading = true;
      const result =
        ReportSelectors.selectReportsLoadingState.projector(loading);

      expect(result.loading).toBe(true);
      expect(result.isLoading).toBe(true);
    });

    it('should show isLoading false when not loading', () => {
      const loading = false;
      const result =
        ReportSelectors.selectReportsLoadingState.projector(loading);

      expect(result.loading).toBe(false);
      expect(result.isLoading).toBe(false);
    });

    it('should select reports with error state', () => {
      const error = 'Failed to load reports';
      const loading = false;
      const result = ReportSelectors.selectReportsWithError.projector(
        error,
        loading,
      );

      expect(result.error).toBe(error);
      expect(result.hasError).toBe(true);
    });

    it('should not show error when loading', () => {
      const error = 'Failed to load reports';
      const loading = true;
      const result = ReportSelectors.selectReportsWithError.projector(
        error,
        loading,
      );

      expect(result.error).toBe(error);
      expect(result.hasError).toBe(false);
    });

    it('should not show error when no error exists', () => {
      const error = null;
      const loading = false;
      const result = ReportSelectors.selectReportsWithError.projector(
        error,
        loading,
      );

      expect(result.error).toBeNull();
      expect(result.hasError).toBe(false);
    });
  });

  describe('Complex Derived Selectors', () => {
    it('should calculate reports statistics correctly', () => {
      const reportsWithScores = [
        { ...mockReportListItems[0], status: 'completed', matchScore: 85 },
        { ...mockReportListItems[1], status: 'processing', matchScore: 92 },
        { ...mockReportListItems[2], status: 'completed', matchScore: 78 },
        { ...mockReportListItems[3], status: 'failed', matchScore: 88 },
      ];

      const result =
        ReportSelectors.selectReportsStatistics.projector(reportsWithScores);

      expect(result.total).toBe(4);
      expect(result.completed).toBe(2);
      expect(result.processing).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.averageScore).toBe(85.75); // (85 + 92 + 78 + 88) / 4 = 85.75
      expect(result.completionRate).toBe(50); // 2/4 * 100 = 50%
    });

    it('should handle empty reports array in statistics', () => {
      const result = ReportSelectors.selectReportsStatistics.projector([]);

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.processing).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should calculate 100% completion when all reports are completed', () => {
      const allCompletedReports = mockReportListItems.map((report) => ({
        ...report,
        status: 'completed' as const,
      }));
      const result =
        ReportSelectors.selectReportsStatistics.projector(allCompletedReports);

      expect(result.completionRate).toBe(100);
      expect(result.completed).toBe(4);
    });

    it('should handle reports with missing scores', () => {
      const reportsWithMissingScores = [
        { ...mockReportListItems[0], matchScore: 85 },
        { ...mockReportListItems[1], matchScore: undefined as any },
        { ...mockReportListItems[2], matchScore: 78 },
      ];

      const result = ReportSelectors.selectReportsStatistics.projector(
        reportsWithMissingScores,
      );

      expect(result.averageScore).toBe(54.33); // (85 + 0 + 78) / 3 = 54.33 (rounded)
    });
  });

  describe('Job-Specific Report Statistics', () => {
    it('should calculate job reports statistics correctly', () => {
      const jobReports = [
        { ...mockReportListItems[0], status: 'completed', matchScore: 85 },
        { ...mockReportListItems[1], status: 'completed', matchScore: 92 },
        { ...mockReportListItems[2], status: 'processing', matchScore: 78 },
        { ...mockReportListItems[3], status: 'completed', matchScore: 88 },
      ];

      const selectorFunction =
        ReportSelectors.selectJobReportsStatistics('job1');
      const result = selectorFunction.projector(jobReports);

      expect(result.total).toBe(4);
      expect(result.completed).toBe(3);
      expect(result.highScoreReports).toBe(3); // 85, 92, 88 are >= 80
      expect(result.completionRate).toBe(75); // 3/4 * 100 = 75%
      expect(result.highScoreRate).toBe(75); // 3/4 * 100 = 75%
    });

    it('should handle empty job reports', () => {
      const selectorFunction =
        ReportSelectors.selectJobReportsStatistics('job1');
      const result = selectorFunction.projector([]);

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.highScoreReports).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.highScoreRate).toBe(0);
    });

    it('should handle reports with scores below threshold', () => {
      const lowScoreReports = [
        { ...mockReportListItems[0], status: 'completed', matchScore: 70 },
        { ...mockReportListItems[1], status: 'completed', matchScore: 75 },
        { ...mockReportListItems[2], status: 'completed', matchScore: 65 },
      ];

      const selectorFunction =
        ReportSelectors.selectJobReportsStatistics('job1');
      const result = selectorFunction.projector(lowScoreReports);

      expect(result.highScoreReports).toBe(0);
      expect(result.highScoreRate).toBe(0);
    });

    it('should handle mixed completion statuses', () => {
      const mixedStatusReports = [
        { ...mockReportListItems[0], status: 'completed', matchScore: 85 },
        { ...mockReportListItems[1], status: 'processing', matchScore: 92 },
        { ...mockReportListItems[2], status: 'failed', matchScore: 78 },
        { ...mockReportListItems[3], status: 'completed', matchScore: 88 },
      ];

      const selectorFunction =
        ReportSelectors.selectJobReportsStatistics('job1');
      const result = selectorFunction.projector(mixedStatusReports);

      expect(result.completed).toBe(2);
      expect(result.completionRate).toBe(50); // 2/4 * 100 = 50%
    });
  });

  describe('Report Management State Selector', () => {
    it('should select report management state with computed properties', () => {
      const result =
        ReportSelectors.selectReportManagementState.projector(mockReportState);

      expect(result.reports).toEqual(mockReportListItems);
      expect(result.selectedReport).toEqual(mockSelectedReport);
      expect(result.currentJobId).toBe('job1');
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.hasReports).toBe(true);
      expect(result.canCreateReport).toBe(true);
    });

    it('should show canCreateReport false when loading', () => {
      const loadingState = { ...mockReportState, loading: true };
      const result =
        ReportSelectors.selectReportManagementState.projector(loadingState);

      expect(result.canCreateReport).toBe(false);
    });

    it('should show hasReports false when no reports exist', () => {
      const emptyState = { ...mockReportState, reports: [] };
      const result =
        ReportSelectors.selectReportManagementState.projector(emptyState);

      expect(result.hasReports).toBe(false);
    });

    it('should handle all state properties correctly', () => {
      const complexState: ReportState = {
        reports: mockReportListItems,
        selectedReport: null,
        currentJobId: null,
        loading: true,
        error: 'Network error',
      };

      const result =
        ReportSelectors.selectReportManagementState.projector(complexState);

      expect(result.selectedReport).toBeNull();
      expect(result.currentJobId).toBeNull();
      expect(result.loading).toBe(true);
      expect(result.error).toBe('Network error');
      expect(result.canCreateReport).toBe(false);
      expect(result.hasReports).toBe(true);
    });
  });

  describe('Selector Memoization', () => {
    it('should return same reference for identical inputs', () => {
      const result1 =
        ReportSelectors.selectAllReports.projector(mockReportState);
      const result2 =
        ReportSelectors.selectAllReports.projector(mockReportState);

      expect(result1).toBe(result2);
    });

    it('should return new reference for different inputs', () => {
      const modifiedState = {
        ...mockReportState,
        reports: [
          ...mockReportListItems,
          {
            id: 'report5',
            candidateName: 'New Candidate',
            matchScore: 90,
            oneSentenceSummary: 'New candidate summary',
            status: 'completed' as const,
            generatedAt: new Date(),
          },
        ],
      };

      const result1 =
        ReportSelectors.selectAllReports.projector(mockReportState);
      const result2 = ReportSelectors.selectAllReports.projector(modifiedState);

      expect(result1).not.toBe(result2);
      expect(result2).toHaveLength(5);
    });

    it('should memoize complex calculations', () => {
      const spy = jest
        .fn()
        .mockImplementation(ReportSelectors.selectReportsStatistics.projector);

      // First call
      spy(mockReportListItems);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second call with same input should use memoized result
      spy(mockReportListItems);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle state with undefined reports gracefully', () => {
      const invalidState = { ...mockReportState, reports: undefined as any };
      const result = ReportSelectors.selectAllReports.projector(invalidState);
      expect(result).toBeUndefined();
    });

    it('should handle reports with missing required fields', () => {
      const invalidReports = [
        { id: 'report1' } as any,
        { candidateName: 'Report without ID' } as any,
      ];

      const result =
        ReportSelectors.selectReportsCount.projector(invalidReports);
      expect(result).toBe(2);
    });

    it('should handle filter operations on malformed data', () => {
      const malformedReports = [
        { ...mockReportListItems[0], status: null as any },
        { ...mockReportListItems[1], status: undefined as any },
        mockReportListItems[2],
      ];

      const completedSelector =
        ReportSelectors.selectReportsByStatus('completed');
      const result = completedSelector.projector(malformedReports);
      expect(result).toHaveLength(1); // Only mockReportListItems[2] has valid status
    });

    it('should handle invalid dates in recent reports selector', () => {
      const reportsWithInvalidDates = [
        { ...mockReportListItems[0], generatedAt: null as any },
        { ...mockReportListItems[1], generatedAt: undefined as any },
        mockReportListItems[2],
      ];

      const recentReportsSelector = ReportSelectors.selectRecentReports();
      const result = recentReportsSelector.projector(reportsWithInvalidDates);
      expect(result).toHaveLength(3); // Should handle invalid dates gracefully
    });

    it('should handle division by zero in statistics calculations', () => {
      const emptyReports: ReportListItem[] = [];
      const result =
        ReportSelectors.selectReportsStatistics.projector(emptyReports);

      expect(result.averageScore).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', () => {
      const largeReportsList: ReportListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `report${i}`,
          candidateName: `Candidate ${i}`,
          matchScore: Math.floor(Math.random() * 100),
          oneSentenceSummary: `Summary for candidate ${i}`,
          status: i % 2 === 0 ? 'completed' : 'processing',
          generatedAt: new Date(),
        }),
      );

      const start = performance.now();
      const result =
        ReportSelectors.selectReportsStatistics.projector(largeReportsList);
      const end = performance.now();

      expect(result.total).toBe(1000);
      expect(result.completed).toBe(500);
      expect(result.processing).toBe(500);
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should efficiently filter reports by job ID', () => {
      const largeReportsList: ReportListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `report${i}`,
          candidateName: `Candidate ${i}`,
          matchScore: Math.floor(Math.random() * 100),
          oneSentenceSummary: `Summary for candidate ${i}`,
          status: 'completed',
          generatedAt: new Date(),
          jobId: i % 3 === 0 ? 'job1' : i % 3 === 1 ? 'job2' : 'job3',
        }),
      );

      const jobReportsSelector = ReportSelectors.selectReportsByJobId('job1');
      const start = performance.now();
      const result = jobReportsSelector.projector(largeReportsList);
      const end = performance.now();

      expect(result.length).toBeGreaterThan(300);
      expect(result.every((report) => report.jobId === 'job1')).toBe(true);
      expect(end - start).toBeLessThan(50); // Should be very fast
    });

    it('should efficiently sort recent reports', () => {
      const largeReportsList: ReportListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `report${i}`,
          candidateName: `Candidate ${i}`,
          matchScore: Math.floor(Math.random() * 100),
          oneSentenceSummary: `Summary for candidate ${i}`,
          status: 'completed',
          generatedAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          ),
        }),
      );

      const recentReportsSelector = ReportSelectors.selectRecentReports(10);
      const start = performance.now();
      const result = recentReportsSelector.projector(largeReportsList);
      const end = performance.now();

      expect(result).toHaveLength(10);
      // Verify sorting is correct (most recent first)
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].generatedAt.getTime()).toBeGreaterThanOrEqual(
          result[i].generatedAt.getTime(),
        );
      }
      expect(end - start).toBeLessThan(100); // Should complete reasonably fast
    });
  });
});
