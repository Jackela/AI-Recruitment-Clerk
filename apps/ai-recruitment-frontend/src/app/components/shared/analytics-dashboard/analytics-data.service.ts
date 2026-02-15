import { inject, Injectable } from '@angular/core';
import type { Observable} from 'rxjs';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import type { AppState } from '../../../store/app.state';
import * as JobSelectors from '../../../store/jobs/job.selectors';
import type { JobListItem } from '../../../store/jobs/job.model';
import * as ReportSelectors from '../../../store/reports/report.selectors';
import type { ReportListItem } from '../../../store/reports/report.model';
import * as ResumeSelectors from '../../../store/resumes/resume.selectors';
import type { ResumeListItem } from '../../../store/resumes/resume.model';

/** Statistics for jobs */
export interface JobsStatistics {
  total: number;
  activePercentage: number;
}

/** Statistics for reports */
export interface ReportsStatistics {
  total: number;
  completionRate: number;
}

/** Statistics for resumes */
export interface ResumeStatistics {
  total: number;
  averageScore: number;
  topSkills?: Array<{ skill: string; count: number }>;
}

/** Combined analytics dashboard data */
export interface AnalyticsDashboardData {
  jobsStatistics: JobsStatistics;
  reportsStatistics: ReportsStatistics;
  resumeStatistics: ResumeStatistics;
  recentJobs: JobListItem[];
  recentReports: ReportListItem[];
  recentResumes: ResumeListItem[];
  highScoringResumes: ResumeListItem[];
  activeJobsCount: number;
  completedReportsCount: number;
  processedResumesCount: number;
}

/**
 * Service for aggregating analytics data from the NgRx store.
 * Provides a single observable stream of combined analytics data.
 */
@Injectable({
  providedIn: 'root',
})
export class AnalyticsDataService {
  private readonly store = inject(Store<AppState>);

  /**
   * Gets combined analytics dashboard data as an observable.
   * Combines data from jobs, reports, and resumes stores.
   *
   * @returns Observable of combined analytics data
   */
  public getDashboardData$(): Observable<AnalyticsDashboardData> {
    return combineLatest([
      // Job selectors
      this.store.select(JobSelectors.selectJobsStatistics),
      this.store.select(JobSelectors.selectActiveJobs),

      // Report selectors
      this.store.select(ReportSelectors.selectReportsStatistics),
      this.store.select(ReportSelectors.selectRecentReports(5)),
      this.store.select(ReportSelectors.selectReportsByStatus('completed')),

      // Resume selectors
      this.store.select(ResumeSelectors.selectResumeStatistics),
      this.store.select(ResumeSelectors.selectRecentResumes(5)),
      this.store.select(ResumeSelectors.selectHighScoringResumes(75)),
      this.store.select(ResumeSelectors.selectProcessedResumes),
    ]).pipe(
      map(
        ([
          jobsStatistics,
          activeJobs,
          reportsStatistics,
          recentReports,
          completedReports,
          resumeStatistics,
          recentResumes,
          highScoringResumes,
          processedResumes,
        ]) => ({
          jobsStatistics,
          reportsStatistics,
          resumeStatistics,
          recentJobs: activeJobs.slice(0, 5), // Show first 5 active jobs
          recentReports,
          recentResumes,
          highScoringResumes: highScoringResumes.slice(0, 5), // Show top 5
          activeJobsCount: activeJobs.length,
          completedReportsCount: completedReports.length,
          processedResumesCount: processedResumes.length,
        }),
      ),
    );
  }
}
