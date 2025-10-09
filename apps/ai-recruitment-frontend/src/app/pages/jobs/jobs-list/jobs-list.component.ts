import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppState } from '../../../store/app.state';
import { JobListItem } from '../../../store/jobs/job.model';
import * as JobActions from '../../../store/jobs/job.actions';
import * as JobSelectors from '../../../store/jobs/job.selectors';

/**
 * Represents the jobs list component.
 */
@Component({
  selector: 'arc-jobs-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  // Using memoized selectors for better performance
  jobs$: Observable<JobListItem[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  jobsStatistics$: Observable<any>;
  activeJobs$: Observable<JobListItem[]>;

  private destroy$ = new Subject<void>();

  private store = inject(Store<AppState>);

  /**
   * Initializes a new instance of the Jobs List Component.
   */
  constructor() {
    // Use memoized selectors instead of direct state access
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);
    this.loading$ = this.store.select(JobSelectors.selectJobsLoading);
    this.error$ = this.store.select(JobSelectors.selectJobsError);
    this.jobsStatistics$ = this.store.select(JobSelectors.selectJobsStatistics);
    this.activeJobs$ = this.store.select(JobSelectors.selectActiveJobs);
  }

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    this.loadJobs();
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads jobs.
   */
  loadJobs(): void {
    this.store.dispatch(JobActions.loadJobs());
  }

  /**
   * Performs the on refresh operation.
   */
  onRefresh(): void {
    this.loadJobs();
  }

  /**
   * Performs the track by job id operation.
   * @param _index - The index.
   * @param job - The job.
   * @returns The string value.
   */
  trackByJobId(_index: number, job: JobListItem): string {
    return job.id;
  }
}
