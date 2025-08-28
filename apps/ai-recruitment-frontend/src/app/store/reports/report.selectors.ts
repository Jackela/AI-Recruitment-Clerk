import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ReportState } from './report.state';
import { ReportListItem, AnalysisReport } from './report.model';

// Feature selector for the report state
export const selectReportState = createFeatureSelector<ReportState>('reports');

// Basic state selectors
export const selectAllReports = createSelector(
  selectReportState,
  (state: ReportState): ReportListItem[] => state.reports
);

export const selectSelectedReport = createSelector(
  selectReportState,
  (state: ReportState): AnalysisReport | null => state.selectedReport
);

export const selectReportsLoading = createSelector(
  selectReportState,
  (state: ReportState): boolean => state.loading
);

export const selectReportsError = createSelector(
  selectReportState,
  (state: ReportState): string | null => state.error
);

export const selectCurrentJobId = createSelector(
  selectReportState,
  (state: ReportState): string | null => state.currentJobId
);

// Derived selectors
export const selectReportsCount = createSelector(
  selectAllReports,
  (reports: ReportListItem[]): number => reports.length
);

export const selectReportsByJobId = (jobId: string) => createSelector(
  selectAllReports,
  (reports: ReportListItem[]): ReportListItem[] =>
    reports.filter(report => report.jobId === jobId)
);

export const selectReportById = (reportId: string) => createSelector(
  selectAllReports,
  (reports: ReportListItem[]): ReportListItem | undefined =>
    reports.find(report => report.id === reportId)
);

export const selectReportsByStatus = (status: string) => createSelector(
  selectAllReports,
  (reports: ReportListItem[]): ReportListItem[] =>
    reports.filter(report => report.status === status)
);

export const selectCurrentJobReports = createSelector(
  selectAllReports,
  selectCurrentJobId,
  (reports: ReportListItem[], jobId: string | null): ReportListItem[] =>
    jobId ? reports.filter(report => report.jobId === jobId) : []
);

// Recent reports selector
export const selectRecentReports = (limit: number = 5) => createSelector(
  selectAllReports,
  (reports: ReportListItem[]): ReportListItem[] =>
    reports
      .slice() // Create shallow copy for sorting
      .sort((a, b) => {
        const dateA = a.createdAt || a.generatedAt;
        const dateB = b.createdAt || b.generatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, limit)
);

// UI state selectors
export const selectReportsLoadingState = createSelector(
  selectReportsLoading,
  (loading: boolean) => ({
    loading,
    isLoading: loading
  })
);

export const selectReportsWithError = createSelector(
  selectReportsError,
  selectReportsLoading,
  (error: string | null, loading: boolean) => ({
    error,
    hasError: !!error && !loading
  })
);

// Complex derived selectors
export const selectReportsStatistics = createSelector(
  selectAllReports,
  (reports: ReportListItem[]) => {
    const total = reports.length;
    const completed = reports.filter(report => report.status === 'completed').length;
    const processing = reports.filter(report => report.status === 'processing').length;
    const failed = reports.filter(report => report.status === 'failed').length;
    
    // Calculate average score if reports have scores
    const reportsWithScores = reports.filter(report => 
      report.matchScore !== undefined
    );
    const averageScore = reportsWithScores.length > 0 
      ? reportsWithScores.reduce((sum, report) => 
          sum + (report.matchScore || 0), 0
        ) / reportsWithScores.length 
      : 0;

    return {
      total,
      completed,
      processing,
      failed,
      averageScore: Math.round(averageScore * 100) / 100,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
);

// Job-specific report statistics
export const selectJobReportsStatistics = (jobId: string) => createSelector(
  selectReportsByJobId(jobId),
  (reports: ReportListItem[]) => {
    const total = reports.length;
    const completed = reports.filter(report => report.status === 'completed').length;
    const highScoreReports = reports.filter(report => 
      (report.matchScore || 0) >= 80
    ).length;
    
    return {
      total,
      completed,
      highScoreReports,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      highScoreRate: total > 0 ? Math.round((highScoreReports / total) * 100) : 0
    };
  }
);

// Feature selector for report management
export const selectReportManagementState = createSelector(
  selectReportState,
  (state: ReportState) => ({
    reports: state.reports,
    selectedReport: state.selectedReport,
    currentJobId: state.currentJobId,
    loading: state.loading,
    error: state.error,
    hasReports: state.reports.length > 0,
    canCreateReport: !state.loading
  })
);