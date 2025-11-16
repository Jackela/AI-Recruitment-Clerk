import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AppState } from '../../../store/app.state';
import * as JobActions from '../../../store/jobs/job.actions';
import * as JobSelectors from '../../../store/jobs/job.selectors';
import { Router } from '@angular/router';
import {
  I18nService,
  TranslationParams,
} from '../../../services/i18n/i18n.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { JobState } from '../../../store/jobs/job.state';
import { JobListItem } from '../../../store/jobs/job.model';

type TranslationDescriptor = {
  key: string;
  params?: TranslationParams;
};

/**
 * Represents the create job component.
 */
@Component({
  selector: 'arc-create-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './create-job.component.html',
  styleUrl: './create-job.component.scss',
})
export class CreateJobComponent implements OnInit, OnDestroy {
  createJobForm: FormGroup;
  creating$: Observable<boolean>;
  error$: Observable<string | null>;

  // WebSocket-related observables for real-time progress
  webSocketConnected$: Observable<boolean>;
  webSocketStatus$: Observable<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >;
  currentJobProgress$: Observable<JobState['jobProgress']>;

  // Job creation progress tracking
  createdJobId: string | null = null;
  showProgressTracking = false;
  progressData: {
    step: string;
    progress: number;
    message?: string;
    estimatedTimeRemaining?: number;
  } | null = null;

  private destroy$ = new Subject<void>();
  private sessionId = `create-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  private fb = inject(FormBuilder);
  private store = inject(Store<AppState>);
  private router = inject(Router);
  private i18nService = inject(I18nService);

  /**
   * Initializes a new instance of the Create Job Component.
   */
  constructor() {
    this.createJobForm = this.fb.group({
      jobTitle: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      jdText: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(5000),
        ],
      ],
    });

    // Use memoized selectors instead of direct state access
    this.creating$ = this.store.select(JobSelectors.selectJobsCreating);
    this.error$ = this.store.select(JobSelectors.selectJobsError);

    // WebSocket-related selectors
    this.webSocketConnected$ = this.store.select(
      JobSelectors.selectWebSocketConnected,
    );
    this.webSocketStatus$ = this.store.select(
      JobSelectors.selectWebSocketStatus,
    );
    this.currentJobProgress$ = this.store.select(
      JobSelectors.selectJobProgress,
    );
  }

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    // Clear any previous errors
    this.store.dispatch(JobActions.clearJobError());

    // Initialize WebSocket connection for real-time updates
    this.initializeWebSocketConnection();

    // Listen for job creation success to start progress tracking
    this.setupJobCreationTracking();
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    // Unsubscribe from job updates if we were tracking a job
    if (this.createdJobId) {
      this.store.dispatch(
        JobActions.unsubscribeFromJobUpdates({
          jobId: this.createdJobId,
        }),
      );
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs the on submit operation.
   */
  onSubmit(): void {
    if (this.createJobForm.valid) {
      const formValue = this.createJobForm.value;

      // Reset progress tracking state
      this.showProgressTracking = false;
      this.progressData = null;
      this.createdJobId = null;

      this.store.dispatch(
        JobActions.createJob({
          request: {
            jobTitle: formValue.jobTitle,
            jdText: formValue.jdText,
          },
        }),
      );
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Performs the on cancel operation.
   */
  onCancel(): void {
    this.router.navigate(['/jobs']);
  }

  /**
   * Performs the on clear error operation.
   */
  onClearError(): void {
    this.store.dispatch(JobActions.clearJobError());
  }

  // Getter methods for easy access to form controls in template
  /**
   * Performs the job title operation.
   * @returns The result of the operation.
   */
  get jobTitle() {
    return this.createJobForm.get('jobTitle');
  }

  /**
   * Performs the jd text operation.
   * @returns The result of the operation.
   */
  get jdText() {
    return this.createJobForm.get('jdText');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.createJobForm.controls).forEach((key) => {
      this.createJobForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Retrieves field error.
   * @param fieldName - The field name.
   * @returns The translation descriptor or null.
   */
  getFieldError(fieldName: string): TranslationDescriptor | null {
    const control = this.createJobForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return { key: 'validation.required' };
      }
      if (control.errors['minlength']) {
        return {
          key: 'validation.minLength',
          params: {
            length: control.errors['minlength'].requiredLength,
          },
        };
      }
      if (control.errors['maxlength']) {
        return {
          key: 'validation.maxLength',
          params: {
            length: control.errors['maxlength'].requiredLength,
          },
        };
      }
    }
    return null;
  }

  /**
   * Determines whether the specified field currently has a validation error.
   * @param fieldName - The field name.
   * @returns True when the control has a touched validation error.
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.createJobForm.get(fieldName);
    return !!(control && control.errors && control.touched);
  }

  /**
   * Resolves a translation descriptor to the localized string.
   * Useful for unit tests that assert against rendered values.
   * @param descriptor - The translation descriptor.
   * @returns The translated message or empty string when descriptor is null.
   */
  getFieldErrorMessage(descriptor: TranslationDescriptor | null): string {
    if (!descriptor) {
      return '';
    }
    return this.i18nService.translate(descriptor.key, descriptor.params);
  }

  /**
   * Initializes WebSocket connection for real-time progress updates.
   */
  private initializeWebSocketConnection(): void {
    this.store.dispatch(
      JobActions.initializeWebSocketConnection({
        sessionId: this.sessionId,
        // TODO: Add organizationId when user authentication is implemented
        organizationId: undefined,
      }),
    );
  }

  /**
   * Sets up job creation tracking to monitor progress after job is created.
   */
  private setupJobCreationTracking(): void {
    // Listen for successful job creation
    this.store
      .select(JobSelectors.selectJobManagementStateWithWebSocket)
      .pipe(
        filter(
          (state) => !state.creating && !state.error && state.jobs.length > 0,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((state) => {
        // Find the most recently created job (assuming it's the one we just created)
        const recentJob = state.jobs
          .filter((job) => job.status === 'processing')
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];

        if (recentJob && !this.createdJobId) {
          this.createdJobId = recentJob.id;
          this.startProgressTracking(recentJob.id);
        }
      });

    // Listen for job progress updates
    this.currentJobProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe((progressMap) => {
        if (this.createdJobId && progressMap[this.createdJobId]) {
          this.progressData = progressMap[this.createdJobId];
        }
      });

    // Listen for job status updates
    this.store
      .select(JobSelectors.selectAllJobs)
      .pipe(
        filter((jobs) => jobs.length > 0 && !!this.createdJobId),
        takeUntil(this.destroy$),
      )
      .subscribe((jobs) => {
        const currentJob = jobs.find((job) => job.id === this.createdJobId);
        if (currentJob) {
          if (currentJob.status === 'completed') {
            this.onJobCompleted(currentJob);
          } else if (currentJob.status === 'failed') {
            this.onJobFailed(currentJob);
          }
        }
      });
  }

  /**
   * Starts progress tracking for a specific job.
   * @param jobId - The job ID to track
   */
  private startProgressTracking(jobId: string): void {
    this.showProgressTracking = true;

    // Subscribe to job-specific updates
    this.store.dispatch(
      JobActions.subscribeToJobUpdates({
        jobId,
        organizationId: undefined,
      }),
    );

    console.log(`📊 Started progress tracking for job ${jobId}`);
  }

  /**
   * Handles job completion.
   * @param job - The completed job
   */
  private onJobCompleted(job: JobListItem): void {
    console.log(`✅ Job ${job.id} completed successfully`);
    this.showProgressTracking = false;

    // Navigate to job details after a short delay to show completion
    setTimeout(() => {
      this.router.navigate(['/jobs', job.id]);
    }, 2000);
  }

  /**
   * Handles job failure.
   * @param job - The failed job
   */
  private onJobFailed(job: JobListItem): void {
    console.log(`❌ Job ${job.id} failed`);
    this.showProgressTracking = false;
    // Keep user on create page to potentially retry
  }

  /**
   * Gets the progress percentage for display.
   * @returns Progress percentage (0-100)
   */
  getProgressPercentage(): number {
    return this.progressData?.progress || 0;
  }

  /**
   * Gets the current processing step.
   * @returns Current step description
   */
  getCurrentStep(): string {
    return (
      this.progressData?.step ||
      this.i18nService.translate('jobs.createJob.progress.initializing')
    );
  }

  /**
   * Gets the progress message.
   * @returns Progress message
   */
  getProgressMessage(): string {
    return (
      this.progressData?.message ||
      this.i18nService.translate('jobs.createJob.progress.processing')
    );
  }

  /**
   * Gets the estimated time remaining.
   * @returns Time remaining in minutes
   */
  getEstimatedTimeRemaining(): number | null {
    return this.progressData?.estimatedTimeRemaining || null;
  }

  /**
   * Checks if progress tracking should be shown.
   * @returns True if progress should be displayed
   */
  shouldShowProgress(): boolean {
    return this.showProgressTracking && !!this.createdJobId;
  }

  /**
   * Gets the progress steps for the UI indicator.
   * @returns Array of progress steps
   */
  getProgressSteps(): Array<{
    label: string;
    completed: boolean;
    active: boolean;
  }> {
    const currentProgress = this.getProgressPercentage();
    const steps = [
      {
        label: this.i18nService.translate('jobs.createJob.progress.initializing'),
        completed: currentProgress > 0,
        active: currentProgress > 0 && currentProgress <= 25,
      },
      {
        label: this.i18nService.translate('jobs.createJob.progress.processing'),
        completed: currentProgress > 25,
        active: currentProgress > 25 && currentProgress <= 75,
      },
      {
        label: this.i18nService.translate('common.loading'),
        completed: currentProgress > 75,
        active: currentProgress > 75 && currentProgress < 100,
      },
      {
        label: this.i18nService.translate('messages.success'),
        completed: currentProgress === 100,
        active: currentProgress === 100,
      },
    ];

    return steps;
  }
}
