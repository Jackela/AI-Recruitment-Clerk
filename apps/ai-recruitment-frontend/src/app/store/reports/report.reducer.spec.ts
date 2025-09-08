import { reportReducer } from './report.reducer';
import { initialReportState, ReportState } from './report.state';
import * as ReportActions from './report.actions';
import { AnalysisReport, ReportsList, ReportListItem } from './report.model';

describe('Report Reducer', () => {
  const mockReportListItems: ReportListItem[] = [
    {
      id: 'report1',
      jobId: 'job1',
      jobTitle: '软件工程师',
      status: 'completed',
      createdAt: new Date('2024-01-01'),
      resumeCount: 5,
    },
    {
      id: 'report2',
      jobId: 'job2',
      jobTitle: '产品经理',
      status: 'processing',
      createdAt: new Date('2024-01-02'),
      resumeCount: 3,
    },
  ];

  const mockReportsList: ReportsList = {
    jobId: 'job1',
    reports: mockReportListItems,
  };

  const mockReport: AnalysisReport = {
    id: 'report1',
    jobId: 'job1',
    jobTitle: '软件工程师',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5,
    analysisData: {
      totalCandidates: 5,
      averageScore: 85,
      topCandidates: [],
    },
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const result = reportReducer(undefined, { type: 'Unknown' } as any);
      expect(result).toBe(initialReportState);
    });

    it('should have correct initial values', () => {
      expect(initialReportState.reports).toEqual([]);
      expect(initialReportState.selectedReport).toBeNull();
      expect(initialReportState.loading).toBe(false);
      expect(initialReportState.error).toBeNull();
    });
  });

  describe('Load Reports Actions', () => {
    it('should handle loadReportsByJob', () => {
      const action = ReportActions.loadReportsByJob({ jobId: 'job1' });
      const state = reportReducer(initialReportState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadReportsByJobSuccess', () => {
      const loadingState: ReportState = {
        ...initialReportState,
        loading: true,
      };
      const action = ReportActions.loadReportsByJobSuccess({
        reportsList: mockReportsList,
      });
      const state = reportReducer(loadingState, action);

      expect(state.reports).toEqual(mockReportListItems);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadReportsByJobFailure', () => {
      const loadingState: ReportState = {
        ...initialReportState,
        loading: true,
      };
      const error = 'Failed to load reports';
      const action = ReportActions.loadReportsByJobFailure({ error });
      const state = reportReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Load Single Report Actions', () => {
    it('should handle loadReport', () => {
      const action = ReportActions.loadReport({ reportId: 'report1' });
      const state = reportReducer(initialReportState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadReportSuccess', () => {
      const loadingState: ReportState = {
        ...initialReportState,
        loading: true,
      };
      const action = ReportActions.loadReportSuccess({ report: mockReport });
      const state = reportReducer(loadingState, action);

      expect(state.selectedReport).toEqual(mockReport);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadReportFailure', () => {
      const loadingState: ReportState = {
        ...initialReportState,
        loading: true,
      };
      const error = 'Failed to load report';
      const action = ReportActions.loadReportFailure({ error });
      const state = reportReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Utility Actions', () => {
    it('should handle clearSelectedReport', () => {
      const stateWithSelectedReport: ReportState = {
        ...initialReportState,
        selectedReport: mockReport,
      };
      const action = ReportActions.clearSelectedReport();
      const state = reportReducer(stateWithSelectedReport, action);

      expect(state.selectedReport).toBeNull();
    });

    it('should handle clearReportError', () => {
      const stateWithError: ReportState = {
        ...initialReportState,
        error: 'Some error',
      };
      const action = ReportActions.clearReportError();
      const state = reportReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = { ...initialReportState };
      const action = ReportActions.loadReportsByJob({ jobId: 'job1' });
      const newState = reportReducer(initialReportState, action);

      expect(initialReportState).toEqual(originalState);
      expect(newState).not.toBe(initialReportState);
    });

    it('should preserve other state properties when updating specific ones', () => {
      const stateWithData: ReportState = {
        ...initialReportState,
        reports: mockReportListItems,
        selectedReport: mockReport,
      };
      const action = ReportActions.loadReportsByJob({ jobId: 'job1' });
      const newState = reportReducer(stateWithData, action);

      expect(newState.reports).toEqual(mockReportListItems);
      expect(newState.selectedReport).toEqual(mockReport);
      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });
});
