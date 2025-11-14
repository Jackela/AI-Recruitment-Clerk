import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, EMPTY } from 'rxjs';
import {
  catchError,
  map,
  mergeMap,
  tap,
  switchMap,
} from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import * as JobActions from './job.actions';

/**
 * Represents the job effects.
 */
@Injectable()
export class JobEffects {
  loadJobs$;
  loadJob$;
  createJob$;
  createJobSuccess$;
  initializeWebSocketConnection$;
  subscribeToJobUpdates$;
  unsubscribeFromJobUpdates$;
  listenToJobUpdates$;
  listenToJobProgress$;
  webSocketConnectionStatus$;

  /**
   * Initializes a new instance of the Job Effects.
   * @param actions$ - The actions$.
   * @param apiService - The api service.
   * @param webSocketService - The WebSocket service.
   */
  private readonly actions$ = inject(Actions);
  private readonly apiService = inject(ApiService);
  private readonly webSocketService = inject(WebSocketService);

  constructor() {
    this.loadJobs$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.loadJobs),
        mergeMap(() =>
          this.apiService.getAllJobs().pipe(
            map((jobs) => JobActions.loadJobsSuccess({ jobs })),
            catchError((error) =>
              of(
                JobActions.loadJobsFailure({
                  error: error.message || 'Failed to load jobs',
                }),
              ),
            ),
          ),
        ),
      ),
    );

    this.loadJob$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.loadJob),
        mergeMap(({ jobId }) =>
          this.apiService.getJobById(jobId).pipe(
            map((job) => JobActions.loadJobSuccess({ job })),
            catchError((error) =>
              of(
                JobActions.loadJobFailure({
                  error: error.message || 'Failed to load job',
                }),
              ),
            ),
          ),
        ),
      ),
    );

    this.createJob$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.createJob),
        mergeMap(({ request }) =>
          this.apiService.createJob(request).pipe(
            map((response) => JobActions.createJobSuccess({ response })),
            catchError((error) =>
              of(
                JobActions.createJobFailure({
                  error: error.message || 'Failed to create job',
                }),
              ),
            ),
          ),
        ),
      ),
    );

    this.createJobSuccess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.createJobSuccess),
        // Note: Navigation removed to allow progress tracking UI to remain visible
        // The CreateJobComponent will handle navigation after progress completion
        // Reload jobs list after creation
        map(() => JobActions.loadJobs()),
      ),
    );

    // WebSocket Effects

    this.initializeWebSocketConnection$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.initializeWebSocketConnection),
        switchMap(({ sessionId, organizationId }) => {
          // Connect to WebSocket and listen for connection status changes
          this.webSocketService.connectWithJobSubscription(
            sessionId,
            undefined,
            organizationId,
          );

          return this.webSocketService.getConnectionStatus().pipe(
            map((status) =>
              JobActions.webSocketConnectionStatusChanged({ status }),
            ),
            catchError((error) => {
              console.error('WebSocket connection error:', error);
              return of(
                JobActions.webSocketConnectionStatusChanged({
                  status: 'error',
                }),
              );
            }),
          );
        }),
      ),
    );

    this.subscribeToJobUpdates$ = createEffect(
      () =>
        this.actions$.pipe(
          ofType(JobActions.subscribeToJobUpdates),
          tap(({ jobId, organizationId }) => {
            this.webSocketService.subscribeToJob(jobId, organizationId);
          }),
        ),
      { dispatch: false },
    );

    this.unsubscribeFromJobUpdates$ = createEffect(
      () =>
        this.actions$.pipe(
          ofType(JobActions.unsubscribeFromJobUpdates),
          tap(({ jobId }) => {
            this.webSocketService.unsubscribeFromJob(jobId);
          }),
        ),
      { dispatch: false },
    );

    this.listenToJobUpdates$ = createEffect(() =>
      this.webSocketService.onJobUpdated().pipe(
        map((jobUpdate) =>
          JobActions.jobUpdatedViaWebSocket({
            jobId: jobUpdate.jobId,
            title: jobUpdate.title,
            status: jobUpdate.status,
            timestamp: jobUpdate.timestamp,
            organizationId: jobUpdate.organizationId,
            metadata: jobUpdate.metadata,
          }),
        ),
        catchError((error) => {
          console.error('Error processing job update:', error);
          return EMPTY;
        }),
      ),
    );

    this.listenToJobProgress$ = createEffect(() =>
      this.webSocketService.onJobProgress().pipe(
        map((jobProgress) =>
          JobActions.jobProgressViaWebSocket({
            jobId: jobProgress.jobId,
            step: jobProgress.step,
            progress: jobProgress.progress,
            message: jobProgress.message,
            estimatedTimeRemaining: jobProgress.estimatedTimeRemaining,
            timestamp: jobProgress.timestamp,
          }),
        ),
        catchError((error) => {
          console.error('Error processing job progress:', error);
          return EMPTY;
        }),
      ),
    );

    this.webSocketConnectionStatus$ = createEffect(
      () =>
        this.actions$.pipe(
          ofType(JobActions.webSocketConnectionStatusChanged),
          tap(({ status }) => {
            console.log(`WebSocket connection status changed to: ${status}`);
            // You can add toast notifications here if needed
          }),
        ),
      { dispatch: false },
    );
  }
}
