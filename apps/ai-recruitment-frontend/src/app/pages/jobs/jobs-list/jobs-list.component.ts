import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppState } from '../../../store/app.state';
import { JobListItem } from '../../../store/jobs/job.model';
import * as JobActions from '../../../store/jobs/job.actions';
import * as JobSelectors from '../../../store/jobs/job.selectors';

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

  constructor() {
    // Use memoized selectors instead of direct state access
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);
    this.loading$ = this.store.select(JobSelectors.selectJobsLoading);
    this.error$ = this.store.select(JobSelectors.selectJobsError);
    this.jobsStatistics$ = this.store.select(JobSelectors.selectJobsStatistics);
    this.activeJobs$ = this.store.select(JobSelectors.selectActiveJobs);
  }

  ngOnInit(): void {
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobs(): void {
    this.store.dispatch(JobActions.loadJobs());
  }

  onRefresh(): void {
    this.loadJobs();
  }

  trackByJobId(_index: number, job: JobListItem): string {
    return job.id;
  }
}
