import { JobState } from './jobs/job.state';
import { ResumeState } from './resumes/resume.state';
import { ReportState } from './reports/report.state';

export interface AppState {
  jobs: JobState;
  resumes: ResumeState;
  reports: ReportState;
}
