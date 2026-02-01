import type { JobState } from './jobs/job.state';
import type { ResumeState } from './resumes/resume.state';
import type { ReportState } from './reports/report.state';

/**
 * Defines the shape of the app state.
 */
export interface AppState {
  jobs: JobState;
  resumes: ResumeState;
  reports: ReportState;
}
