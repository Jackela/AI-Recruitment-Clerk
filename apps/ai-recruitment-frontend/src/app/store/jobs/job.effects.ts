import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, EMPTY, from } from 'rxjs';
import { catchError, map, mergeMap, tap, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ConnectionService } from '../../core/services/connection.service';
import * as JobActions from './job.actions';

/**
 * Job Effects - Handles all side effects for job management.
 *
 * IMPORTANT: This application requires backend services for AI analysis.
 * When backend is unavailable, operations fail with clear error messages.
 */
@Injectable()
export class JobEffects {
  private readonly actions$ = inject(Actions);
  private readonly apiService = inject(ApiService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly connectionService = inject(ConnectionService);

  public loadJobs$;
  public loadJob$;
  public createJob$;
  public createJobSuccess$;
  public initializeWebSocketConnection$;
  public subscribeToJobUpdates$;
  public unsubscribeFromJobUpdates$;
  public listenToJobUpdates$;
  public listenToJobProgress$;
  public webSocketConnectionStatus$;
  public retryConnection$;

  constructor() {
    this.loadJobs$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.loadJobs),
        switchMap(() =>
          from(this.connectionService.checkBackendConnection()).pipe(
            switchMap((isConnected) => {
              if (!isConnected) {
                // Backend unavailable - fail with clear error
                // Do NOT show mock data as this is an AI analysis application
                return of(
                  JobActions.loadJobsFailure({
                    error:
                      '后端服务不可用。AI Recruitment Clerk 需要后端服务才能正常工作。请确保后端服务已启动。',
                  }),
                );
              }

              // Backend available, proceed with normal API call
              return this.apiService.getAllJobs().pipe(
                mergeMap((jobs) => [
                  JobActions.setOfflineMode({ isOffline: false }),
                  JobActions.connectionStatusChanged({
                    isConnected: true,
                    message: '已连接到后端服务',
                  }),
                  JobActions.loadJobsSuccess({ jobs }),
                ]),
                catchError((error) =>
                  of(
                    JobActions.loadJobsFailure({
                      error: error.message || '加载岗位列表失败',
                    }),
                  ),
                ),
              );
            }),
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
                  error: error.message || '加载岗位详情失败',
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
                  error: error.message || '创建岗位失败',
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
        map(() => JobActions.loadJobs()),
      ),
    );

    // WebSocket Effects

    this.initializeWebSocketConnection$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.initializeWebSocketConnection),
        switchMap(({ sessionId, organizationId }) => {
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
          }),
        ),
      { dispatch: false },
    );

    // Retry connection effect
    this.retryConnection$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.retryConnection),
        switchMap(() =>
          from(this.connectionService.retryConnection()).pipe(
            switchMap((isConnected) => {
              if (isConnected) {
                // Connection restored, reload jobs from API
                return this.apiService.getAllJobs().pipe(
                  mergeMap((jobs) => [
                    JobActions.setOfflineMode({ isOffline: false }),
                    JobActions.connectionStatusChanged({
                      isConnected: true,
                      message: '连接已恢复！正在从服务器加载数据。',
                    }),
                    JobActions.loadJobsSuccess({ jobs }),
                  ]),
                  catchError((error) =>
                    of(
                      JobActions.loadJobsFailure({
                        error: error.message || '重新加载岗位列表失败',
                      }),
                    ),
                  ),
                );
              } else {
                // Still offline - fail with error
                return of(
                  JobActions.loadJobsFailure({
                    error: '后端服务仍然不可用。请检查服务状态后重试。',
                  }),
                );
              }
            }),
          ),
        ),
      ),
    );
  }
}
