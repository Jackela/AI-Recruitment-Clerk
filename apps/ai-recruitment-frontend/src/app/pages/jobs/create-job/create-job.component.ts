import type { OnInit, OnDestroy} from '@angular/core';
import { Component, inject } from '@angular/core';
import type {
  FormGroup} from '@angular/forms';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import type { Observable} from 'rxjs';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import type { AppState } from '../../../store/app.state';
import * as JobActions from '../../../store/jobs/job.actions';
import * as JobSelectors from '../../../store/jobs/job.selectors';
import { Router } from '@angular/router';
import { I18nService } from '../../../services/i18n/i18n.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

type TranslationDescriptor = {
  key: string;
  params?: Record<string, unknown>;
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
  public createJobForm: FormGroup;
  public creating$: Observable<boolean>;
  public error$: Observable<string | null>;

  // WebSocket-related observables for real-time progress
  public webSocketConnected$: Observable<boolean>;
  public webSocketStatus$: Observable<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public currentJobProgress$: Observable<any>;

  // Job creation progress tracking
  public createdJobId: string | null = null;
  public showProgressTracking = false;
  public progressData: {
    step: string;
    progress: number;
    message?: string;
    estimatedTimeRemaining?: number;
  } | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly sessionId = `create-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store<AppState>);
  private readonly router = inject(Router);
  private readonly i18nService = inject(I18nService);

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
  public ngOnInit(): void {
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
  public ngOnDestroy(): void {
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
  public onSubmit(): void {
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
  public onCancel(): void {
    this.router.navigate(['/jobs']);
  }

  /**
   * Performs the on clear error operation.
   */
  public onClearError(): void {
    this.store.dispatch(JobActions.clearJobError());
  }

  // Getter methods for easy access to form controls in template
  /**
   * Performs the job title operation.
   * @returns The result of the operation.
   */
  public get jobTitle(): import('@angular/forms').AbstractControl<string> | null {
    return this.createJobForm.get('jobTitle');
  }

  /**
   * Performs the jd text operation.
   * @returns The result of the operation.
   */
  public get jdText(): import('@angular/forms').AbstractControl<string> | null {
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
  public getFieldError(fieldName: string): TranslationDescriptor | null {
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
  public hasFieldError(fieldName: string): boolean {
    const control = this.createJobForm.get(fieldName);
    return !!(control && control.errors && control.touched);
  }

  /**
   * Resolves a translation descriptor to the localized string.
   * Useful for unit tests that assert against rendered values.
   * @param descriptor - The translation descriptor.
   * @returns The translated message or empty string when descriptor is null.
   */
  public getFieldErrorMessage(descriptor: TranslationDescriptor | null): string {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onJobCompleted(job: any): void {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onJobFailed(job: any): void {
    console.log(`❌ Job ${job.id} failed`);
    this.showProgressTracking = false;
    // Keep user on create page to potentially retry
  }

  /**
   * Gets the progress percentage for display.
   * @returns Progress percentage (0-100)
   */
  public getProgressPercentage(): number {
    return this.progressData?.progress || 0;
  }

  /**
   * Gets the current processing step.
   * @returns Current step description
   */
  public getCurrentStep(): string {
    return (
      this.progressData?.step ||
      this.i18nService.translate('jobs.createJob.progress.initializing')
    );
  }

  /**
   * Gets the progress message.
   * @returns Progress message
   */
  public getProgressMessage(): string {
    return (
      this.progressData?.message ||
      this.i18nService.translate('jobs.createJob.progress.processing')
    );
  }

  /**
   * Gets the estimated time remaining.
   * @returns Time remaining in minutes
   */
  public getEstimatedTimeRemaining(): number | null {
    return this.progressData?.estimatedTimeRemaining || null;
  }

  /**
   * Checks if progress tracking should be shown.
   * @returns True if progress should be displayed
   */
  public shouldShowProgress(): boolean {
    return this.showProgressTracking && !!this.createdJobId;
  }

  /**
   * Gets the progress steps for the UI indicator.
   * @returns Array of progress steps
   */
  public getProgressSteps(): Array<{
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
