import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
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

  // WebSocket-related observables
  jobsWithProgress$: Observable<Array<JobListItem & { progress: any }>>;
  webSocketConnected$: Observable<boolean>;
  webSocketStatus$: Observable<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >;
  jobManagementStateWithWebSocket$: Observable<any>;

  private destroy$ = new Subject<void>();
  private sessionId = `jobs-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

    // WebSocket-related selectors
    this.jobsWithProgress$ = this.store.select(
      JobSelectors.selectJobsWithProgress,
    );
    this.webSocketConnected$ = this.store.select(
      JobSelectors.selectWebSocketConnected,
    );
    this.webSocketStatus$ = this.store.select(
      JobSelectors.selectWebSocketStatus,
    );
    this.jobManagementStateWithWebSocket$ = this.store.select(
      JobSelectors.selectJobManagementStateWithWebSocket,
    );
  }

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    this.loadJobs();
    this.initializeWebSocketConnection();
    this.subscribeToJobUpdates();
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    // Clean up subscriptions and WebSocket connections
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

  /**
   * Initializes WebSocket connection for real-time job updates.
   */
  private initializeWebSocketConnection(): void {
    // Initialize WebSocket connection with session ID
    this.store.dispatch(
      JobActions.initializeWebSocketConnection({
        sessionId: this.sessionId,
        // TODO: Add organizationId when user authentication is implemented
        organizationId: undefined,
      }),
    );
  }

  /**
   * Subscribes to real-time job updates for all jobs.
   */
  private subscribeToJobUpdates(): void {
    // Subscribe to job updates when WebSocket is connected
    this.webSocketConnected$
      .pipe(
        filter((connected) => connected),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        console.log('📡 WebSocket connected - ready for real-time job updates');
      });

    // Listen for individual jobs to subscribe to their updates
    this.jobs$
      .pipe(
        filter((jobs) => jobs.length > 0),
        takeUntil(this.destroy$),
      )
      .subscribe((jobs) => {
        // Subscribe to updates for each job (for future enhancement)
        jobs.forEach((job) => {
          if (job.status === 'processing') {
            // Only subscribe to processing jobs for now to reduce noise
            // this.store.dispatch(JobActions.subscribeToJobUpdates({
            //   jobId: job.id,
            //   organizationId: undefined
            // }));
          }
        });
      });
  }

  /**
   * Gets the status badge class for a job.
   * @param status - The job status
   * @returns CSS class string
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'processing':
        return 'badge-warning';
      case 'failed':
        return 'badge-danger';
      case 'active':
        return 'badge-info';
      case 'draft':
        return 'badge-secondary';
      case 'closed':
        return 'badge-dark';
      default:
        return 'badge-light';
    }
  }

  /**
   * Gets the progress percentage for a job.
   * @param jobWithProgress - Job with progress information
   * @returns Progress percentage (0-100) or null if no progress
   */
  getJobProgress(
    jobWithProgress: JobListItem & { progress: any },
  ): number | null {
    return jobWithProgress.progress?.progress || null;
  }

  /**
   * Gets the current processing step for a job.
   * @param jobWithProgress - Job with progress information
   * @returns Current step description or null
   */
  getCurrentStep(
    jobWithProgress: JobListItem & { progress: any },
  ): string | null {
    return jobWithProgress.progress?.step || null;
  }

  /**
   * Checks if a job is currently being processed.
   * @param job - The job to check
   * @returns True if job is in processing state
   */
  isJobProcessing(job: JobListItem): boolean {
    return job.status === 'processing';
  }
}
