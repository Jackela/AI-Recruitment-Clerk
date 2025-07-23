import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppState } from '../../../store/app.state';
import { JobListItem } from '../../../store/jobs/job.model';
import * as JobActions from '../../../store/jobs/job.actions';

@Component({
  selector: 'arc-jobs-list',
  standalone: false,
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss'
})
export class JobsListComponent implements OnInit, OnDestroy {
  jobs$: Observable<JobListItem[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  private destroy$ = new Subject<void>();

  constructor(private store: Store<AppState>) {
    this.jobs$ = this.store.select(state => state.jobs.jobs);
    this.loading$ = this.store.select(state => state.jobs.loading);
    this.error$ = this.store.select(state => state.jobs.error);
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

  trackByJobId(index: number, job: JobListItem): string {
    return job.id;
  }
}
