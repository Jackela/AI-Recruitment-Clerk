import { AnalysisReport, ReportListItem } from './report.model';

/**
 * Defines the shape of the report state.
 */
export interface ReportState {
  reports: ReportListItem[];
  selectedReport: AnalysisReport | null;
  loading: boolean;
  error: string | null;
  currentJobId: string | null;
}

export const initialReportState: ReportState = {
  reports: [],
  selectedReport: null,
  loading: false,
  error: null,
  currentJobId: null,
};
