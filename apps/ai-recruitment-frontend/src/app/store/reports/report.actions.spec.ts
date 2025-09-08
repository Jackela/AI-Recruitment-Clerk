import * as ReportActions from './report.actions';
import { AnalysisReport, ReportsList, ReportListItem } from './report.model';

describe('Report Actions', () => {
  const mockReportListItem: ReportListItem = {
    id: 'report1',
    jobId: 'job1',
    jobTitle: '软件工程师',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5,
    summary: {
      overallScore: 85,
      totalCandidates: 5,
      qualifiedCount: 4,
    },
  };

  const mockReportsList: ReportsList = {
    jobId: 'job1',
    reports: [mockReportListItem],
  };

  const mockReport: AnalysisReport = {
    id: 'report1',
    jobId: 'job1',
    jobTitle: '软件工程师',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5,
    summary: {
      overallScore: 85,
      totalCandidates: 5,
      qualifiedCount: 4,
    },
    analysisData: {
      totalCandidates: 5,
      averageScore: 85,
      topCandidates: [
        {
          id: 'candidate1',
          name: 'John Doe',
          score: 92,
          skills: ['JavaScript', 'TypeScript'],
        },
      ],
    },
  };

  describe('Load Reports By Job Actions', () => {
    it('should create loadReportsByJob action', () => {
      const jobId = 'job1';
      const action = ReportActions.loadReportsByJob({ jobId });
      expect(action.type).toBe('[Report] Load Reports By Job');
      expect(action.jobId).toBe(jobId);
    });

    it('should create loadReportsByJobSuccess action', () => {
      const action = ReportActions.loadReportsByJobSuccess({
        reportsList: mockReportsList,
      });
      expect(action.type).toBe('[Report] Load Reports By Job Success');
      expect(action.reportsList).toEqual(mockReportsList);
    });

    it('should create loadReportsByJobFailure action', () => {
      const error = 'Failed to load reports';
      const action = ReportActions.loadReportsByJobFailure({ error });
      expect(action.type).toBe('[Report] Load Reports By Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Load Single Report Actions', () => {
    it('should create loadReport action', () => {
      const reportId = 'report1';
      const action = ReportActions.loadReport({ reportId });
      expect(action.type).toBe('[Report] Load Report');
      expect(action.reportId).toBe(reportId);
    });

    it('should create loadReportSuccess action', () => {
      const action = ReportActions.loadReportSuccess({ report: mockReport });
      expect(action.type).toBe('[Report] Load Report Success');
      expect(action.report).toEqual(mockReport);
    });

    it('should create loadReportFailure action', () => {
      const error = 'Failed to load report';
      const action = ReportActions.loadReportFailure({ error });
      expect(action.type).toBe('[Report] Load Report Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Utility Actions', () => {
    it('should create clearSelectedReport action', () => {
      const action = ReportActions.clearSelectedReport();
      expect(action.type).toBe('[Report] Clear Selected Report');
    });

    it('should create clearReports action', () => {
      const action = ReportActions.clearReports();
      expect(action.type).toBe('[Report] Clear Reports');
    });

    it('should create clearReportError action', () => {
      const action = ReportActions.clearReportError();
      expect(action.type).toBe('[Report] Clear Error');
    });
  });

  describe('Action Type Consistency', () => {
    it('should have consistent action types for load operations', () => {
      const loadAction = ReportActions.loadReportsByJob({ jobId: 'test' });
      const successAction = ReportActions.loadReportsByJobSuccess({
        reportsList: { jobId: 'test', reports: [] },
      });
      const failureAction = ReportActions.loadReportsByJobFailure({
        error: 'test error',
      });

      expect(loadAction.type).toContain('[Report]');
      expect(successAction.type).toContain('[Report]');
      expect(failureAction.type).toContain('[Report]');

      expect(successAction.type).toContain('Success');
      expect(failureAction.type).toContain('Failure');
    });

    it('should have consistent action types for single report operations', () => {
      const loadAction = ReportActions.loadReport({ reportId: 'test' });
      const successAction = ReportActions.loadReportSuccess({
        report: mockReport,
      });
      const failureAction = ReportActions.loadReportFailure({
        error: 'test error',
      });

      expect(loadAction.type).toContain('[Report]');
      expect(successAction.type).toContain('[Report]');
      expect(failureAction.type).toContain('[Report]');

      expect(successAction.type).toContain('Success');
      expect(failureAction.type).toContain('Failure');
    });
  });

  describe('Action Payload Validation', () => {
    it('should handle empty job ID gracefully', () => {
      const action = ReportActions.loadReportsByJob({ jobId: '' });
      expect(action.jobId).toBe('');
      expect(action.type).toBe('[Report] Load Reports By Job');
    });

    it('should handle empty report ID gracefully', () => {
      const action = ReportActions.loadReport({ reportId: '' });
      expect(action.reportId).toBe('');
      expect(action.type).toBe('[Report] Load Report');
    });

    it('should handle empty error messages', () => {
      const action = ReportActions.loadReportFailure({ error: '' });
      expect(action.error).toBe('');
      expect(action.type).toBe('[Report] Load Report Failure');
    });

    it('should handle special characters in IDs', () => {
      const specialJobId = 'job-123_test@domain.com';
      const action = ReportActions.loadReportsByJob({ jobId: specialJobId });
      expect(action.jobId).toBe(specialJobId);
    });

    it('should preserve report data integrity', () => {
      const complexReport = {
        ...mockReport,
        analysisData: {
          ...mockReport.analysisData,
          topCandidates: [
            {
              id: 'candidate1',
              name: 'John Doe',
              score: 92,
              skills: ['JavaScript', 'TypeScript', 'Angular', 'Node.js'],
            },
            {
              id: 'candidate2',
              name: 'Jane Smith',
              score: 88,
              skills: ['Python', 'Django', 'React', 'PostgreSQL'],
            },
          ],
        },
      };

      const action = ReportActions.loadReportSuccess({ report: complexReport });
      expect(action.report).toEqual(complexReport);
      expect(action.report.analysisData.topCandidates).toHaveLength(2);
      expect(action.report.analysisData.topCandidates[0].skills).toHaveLength(
        4,
      );
    });
  });

  describe('Error Handling Actions', () => {
    it('should handle network error messages', () => {
      const networkError = 'Network timeout: Unable to connect to server';
      const action = ReportActions.loadReportsByJobFailure({
        error: networkError,
      });
      expect(action.error).toBe(networkError);
    });

    it('should handle validation error messages', () => {
      const validationError = 'Invalid job ID format: must be UUID';
      const action = ReportActions.loadReportFailure({
        error: validationError,
      });
      expect(action.error).toBe(validationError);
    });

    it('should handle server error messages', () => {
      const serverError = 'Internal server error: Database connection failed';
      const action = ReportActions.loadReportsByJobFailure({
        error: serverError,
      });
      expect(action.error).toBe(serverError);
    });
  });

  describe('Action Creator Functions', () => {
    it('should be functions that return action objects', () => {
      expect(typeof ReportActions.loadReportsByJob).toBe('function');
      expect(typeof ReportActions.loadReportsByJobSuccess).toBe('function');
      expect(typeof ReportActions.loadReportsByJobFailure).toBe('function');

      expect(typeof ReportActions.loadReport).toBe('function');
      expect(typeof ReportActions.loadReportSuccess).toBe('function');
      expect(typeof ReportActions.loadReportFailure).toBe('function');

      expect(typeof ReportActions.clearSelectedReport).toBe('function');
      expect(typeof ReportActions.clearReports).toBe('function');
      expect(typeof ReportActions.clearReportError).toBe('function');
    });

    it('should return objects with type property', () => {
      const actions = [
        ReportActions.loadReportsByJob({ jobId: 'test' }),
        ReportActions.loadReportsByJobSuccess({ reportsList: mockReportsList }),
        ReportActions.loadReportsByJobFailure({ error: 'test error' }),
        ReportActions.loadReport({ reportId: 'test' }),
        ReportActions.loadReportSuccess({ report: mockReport }),
        ReportActions.loadReportFailure({ error: 'test error' }),
        ReportActions.clearSelectedReport(),
        ReportActions.clearReports(),
        ReportActions.clearReportError(),
      ];

      actions.forEach((action) => {
        expect(action).toHaveProperty('type');
        expect(typeof action.type).toBe('string');
        expect(action.type.length).toBeGreaterThan(0);
      });
    });
  });
});
