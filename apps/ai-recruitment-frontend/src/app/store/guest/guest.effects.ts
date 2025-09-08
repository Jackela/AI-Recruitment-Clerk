import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  withLatestFrom,
  filter,
  delay,
} from 'rxjs/operators';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { GuestState } from './guest.state';
import * as GuestActions from './guest.actions';
import { selectGuestState } from './guest.selectors';

@Injectable()
export class GuestEffects {
  constructor(
    private actions$: Actions,
    private guestApiService: GuestApiService,
    private store: Store<{ guest: GuestState }>,
  ) {}

  // Load usage status
  loadUsageStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.loadUsageStatus),
      switchMap(() =>
        this.guestApiService.getUsageStatus().pipe(
          map((usageStatus) =>
            GuestActions.loadUsageStatusSuccess({ usageStatus }),
          ),
          catchError((error) =>
            of(
              GuestActions.loadUsageStatusFailure({
                error: error.message || 'Failed to load usage status',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Load guest details
  loadGuestDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.loadGuestDetails),
      switchMap(() =>
        this.guestApiService.getGuestDetails().pipe(
          map((guestDetails) =>
            GuestActions.loadGuestDetailsSuccess({ guestDetails }),
          ),
          catchError((error) =>
            of(
              GuestActions.loadGuestDetailsFailure({
                error: error.message || 'Failed to load guest details',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Increment usage
  incrementUsage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.incrementUsage),
      switchMap(() =>
        this.guestApiService.checkUsage().pipe(
          map((response) => {
            if (response.canUse) {
              return GuestActions.incrementUsageSuccess();
            } else {
              return GuestActions.setLimited({
                isLimited: true,
                message: response.message,
              });
            }
          }),
          catchError((error) => {
            if (error.status === 429) {
              // Usage limit exceeded
              return of(
                GuestActions.setLimited({
                  isLimited: true,
                  message: error.error?.message || 'Usage limit exceeded',
                }),
              );
            }
            return of(
              GuestActions.incrementUsageFailure({
                error: error.message || 'Failed to increment usage',
              }),
            );
          }),
        ),
      ),
    ),
  );

  // Refresh usage status after successful increment
  incrementUsageSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.incrementUsageSuccess),
      map(() => GuestActions.loadUsageStatus()),
    ),
  );

  // Generate feedback code
  generateFeedbackCode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.generateFeedbackCode),
      switchMap(() =>
        this.guestApiService.generateFeedbackCode().pipe(
          map((feedbackResponse) =>
            GuestActions.generateFeedbackCodeSuccess({ feedbackResponse }),
          ),
          catchError((error) =>
            of(
              GuestActions.generateFeedbackCodeFailure({
                error:
                  error.error?.message ||
                  error.message ||
                  'Failed to generate feedback code',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Redeem feedback code
  redeemFeedbackCode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.redeemFeedbackCode),
      switchMap(({ feedbackCode }) =>
        this.guestApiService.redeemFeedbackCode(feedbackCode).pipe(
          map((response) => {
            // Close modals and refresh usage status after successful redemption
            this.store.dispatch(GuestActions.hideFeedbackModal());
            this.store.dispatch(GuestActions.hideLimitModal());
            this.store.dispatch(GuestActions.loadUsageStatus());
            return GuestActions.redeemFeedbackCodeSuccess({
              message: response.message,
            });
          }),
          catchError((error) =>
            of(
              GuestActions.redeemFeedbackCodeFailure({
                error:
                  error.error?.message ||
                  error.message ||
                  'Failed to redeem feedback code',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Upload resume
  uploadResume$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.uploadResume),
      switchMap(({ file, candidateName, candidateEmail, notes }) =>
        this.guestApiService
          .analyzeResume(file, candidateName, candidateEmail, notes)
          .pipe(
            map((analysisData) => {
              // Start polling for results after successful upload
              if (analysisData.data.analysisId) {
                setTimeout(() => {
                  this.store.dispatch(
                    GuestActions.loadAnalysisResults({
                      analysisId: analysisData.data.analysisId,
                    }),
                  );
                }, 5000); // Start checking results after 5 seconds
              }
              return GuestActions.uploadResumeSuccess({ analysisData });
            }),
            catchError((error) => {
              if (error.status === 429) {
                // Usage limit exceeded during upload
                this.store.dispatch(
                  GuestActions.setLimited({
                    isLimited: true,
                    message: error.error?.message || 'Usage limit exceeded',
                  }),
                );
              }
              return of(
                GuestActions.uploadResumeFailure({
                  error:
                    error.error?.message ||
                    error.message ||
                    'Failed to upload resume',
                }),
              );
            }),
          ),
      ),
    ),
  );

  // Load analysis results
  loadAnalysisResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.loadAnalysisResults),
      switchMap(({ analysisId }) =>
        this.guestApiService.getAnalysisResults(analysisId).pipe(
          map((analysisResults) =>
            GuestActions.loadAnalysisResultsSuccess({ analysisResults }),
          ),
          catchError((error) =>
            of(
              GuestActions.loadAnalysisResultsFailure({
                error: error.message || 'Failed to load analysis results',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Re-poll for analysis results if still processing
  pollAnalysisResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.loadAnalysisResultsSuccess),
      filter(
        ({ analysisResults }) => analysisResults.data.status === 'processing',
      ),
      delay(10000), // Check again in 10 seconds
      map(({ analysisResults }) =>
        GuestActions.loadAnalysisResults({
          analysisId: analysisResults.data.analysisId,
        }),
      ),
    ),
  );

  // Load demo analysis
  loadDemoAnalysis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.loadDemoAnalysis),
      switchMap(() =>
        this.guestApiService.getDemoAnalysis().pipe(
          map((demoResults) =>
            GuestActions.loadDemoAnalysisSuccess({ demoResults }),
          ),
          catchError((error) => {
            if (error.status === 429) {
              // Usage limit exceeded for demo
              return of(
                GuestActions.setLimited({
                  isLimited: true,
                  message: error.error?.message || 'Usage limit exceeded',
                }),
              );
            }
            return of(
              GuestActions.loadDemoAnalysisFailure({
                error:
                  error.error?.message ||
                  error.message ||
                  'Failed to load demo analysis',
              }),
            );
          }),
        ),
      ),
    ),
  );

  // Auto-refresh usage status after successful operations
  refreshUsageAfterSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        GuestActions.redeemFeedbackCodeSuccess,
        GuestActions.uploadResumeSuccess,
        GuestActions.loadDemoAnalysisSuccess,
      ),
      switchMap(() => of(GuestActions.loadUsageStatus())),
    ),
  );

  // Handle usage limit exceeded scenarios
  handleUsageLimitExceeded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.setLimited),
      withLatestFrom(this.store.select(selectGuestState)),
      switchMap(([action, state]) => {
        if (action.isLimited && !state.feedbackCode) {
          // Show limit modal if no feedback code exists
          return of(GuestActions.showLimitModal());
        }
        return of({ type: 'NO_ACTION' }); // No-op action
      }),
    ),
  );

  // Auto-initialization on app start
  initializeGuestMode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.initializeGuest),
      switchMap(() => [
        GuestActions.loadUsageStatus(),
        GuestActions.setGuestMode({ isGuestMode: true }),
      ]),
    ),
  );
}
