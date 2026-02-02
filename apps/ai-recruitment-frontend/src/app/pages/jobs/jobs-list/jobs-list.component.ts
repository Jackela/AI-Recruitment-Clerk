import type { OnInit, OnDestroy} from '@angular/core';
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import type { Observable} from 'rxjs';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardCardComponent } from '../../../components/shared/dashboard-card/dashboard-card.component';
import type { AppState } from '../../../store/app.state';
import type { JobListItem } from '../../../store/jobs/job.model';
import * as JobActions from '../../../store/jobs/job.actions';
import * as JobSelectors from '../../../store/jobs/job.selectors';

/**
 * Represents the jobs list component.
 */
@Component({
  selector: 'arc-jobs-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardCardComponent],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  // Using memoized selectors for better performance
  public jobs$: Observable<JobListItem[]>;
  public loading$: Observable<boolean>;
  public error$: Observable<string | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public jobsStatistics$: Observable<any>;
  public activeJobs$: Observable<JobListItem[]>;

  // WebSocket-related observables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public jobsWithProgress$: Observable<Array<JobListItem & { progress: any }>>;
  public webSocketConnected$: Observable<boolean>;
  public webSocketStatus$: Observable<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public jobManagementStateWithWebSocket$: Observable<any>;

  private readonly destroy$ = new Subject<void>();
  private readonly sessionId = `jobs-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  private readonly store = inject(Store<AppState>);

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
  public ngOnInit(): void {
    this.loadJobs();
    this.initializeWebSocketConnection();
    this.subscribeToJobUpdates();
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    // Clean up subscriptions and WebSocket connections
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads jobs.
   */
  public loadJobs(): void {
    this.store.dispatch(JobActions.loadJobs());
  }

  /**
   * Performs the on refresh operation.
   */
  public onRefresh(): void {
    this.loadJobs();
  }

  /**
   * Performs the track by job id operation.
   * @param _index - The index.
   * @param job - The job.
   * @returns The string value.
   */
  public trackByJobId(_index: number, job: JobListItem): string {
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
  public getStatusBadgeClass(status: string): string {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getJobProgress(
    jobWithProgress: JobListItem & { progress: any },
  ): number | null {
    return jobWithProgress.progress?.progress || null;
  }

  /**
   * Gets the current processing step for a job.
   * @param jobWithProgress - Job with progress information
   * @returns Current step description or null
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getCurrentStep(
    jobWithProgress: JobListItem & { progress: any },
  ): string | null {
    return jobWithProgress.progress?.step || null;
  }

  /**
   * Checks if a job is currently being processed.
   * @param job - The job to check
   * @returns True if job is in processing state
   */
  public isJobProcessing(job: JobListItem): boolean {
    return job.status === 'processing';
  }

  /**
   * Gets the translated status text for display.
   * @param status - The job status
   * @returns Translated status string
   */
  public getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      processing: '处理中',
      completed: '已完成',
      active: '活跃',
      draft: '草稿',
      closed: '已关闭',
      failed: '失败',
    };
    return statusMap[status] || status;
  }
}
