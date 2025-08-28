import { createReducer, on } from '@ngrx/store';
import { initialReportState } from './report.state';
import * as ReportActions from './report.actions';

export const reportReducer = createReducer(
  initialReportState,

  // Load Reports by Job
  on(ReportActions.loadReportsByJob, (state, { jobId }) => ({
    ...state,
    loading: true,
    error: null,
    currentJobId: jobId
  })),

  on(ReportActions.loadReportsByJobSuccess, (state, { reportsList }) => ({
    ...state,
    reports: reportsList.reports,
    loading: false,
    error: null
  })),

  on(ReportActions.loadReportsByJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Report
  on(ReportActions.loadReport, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ReportActions.loadReportSuccess, (state, { report }) => ({
    ...state,
    selectedReport: report,
    loading: false,
    error: null
  })),

  on(ReportActions.loadReportFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear Selected Report
  on(ReportActions.clearSelectedReport, (state) => ({
    ...state,
    selectedReport: null
  })),

  // Clear Reports
  on(ReportActions.clearReports, (state) => ({
    ...state,
    reports: [],
    currentJobId: null
  })),

  // Clear Error
  on(ReportActions.clearReportError, (state) => ({
    ...state,
    error: null
  }))
);
