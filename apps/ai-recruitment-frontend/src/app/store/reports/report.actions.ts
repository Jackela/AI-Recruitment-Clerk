import { createAction, props } from '@ngrx/store';
import type { AnalysisReport, ReportsList } from './report.model';

// Load Reports for Job
export const loadReportsByJob = createAction(
  '[Report] Load Reports By Job',
  props<{ jobId: string }>(),
);

export const loadReportsByJobSuccess = createAction(
  '[Report] Load Reports By Job Success',
  props<{ reportsList: ReportsList }>(),
);

export const loadReportsByJobFailure = createAction(
  '[Report] Load Reports By Job Failure',
  props<{ error: string }>(),
);

// Load Single Report
export const loadReport = createAction(
  '[Report] Load Report',
  props<{ reportId: string }>(),
);

export const loadReportSuccess = createAction(
  '[Report] Load Report Success',
  props<{ report: AnalysisReport }>(),
);

export const loadReportFailure = createAction(
  '[Report] Load Report Failure',
  props<{ error: string }>(),
);

// Clear Selected Report
export const clearSelectedReport = createAction(
  '[Report] Clear Selected Report',
);

// Clear Reports
export const clearReports = createAction('[Report] Clear Reports');

// Clear Error
export const clearReportError = createAction('[Report] Clear Error');
