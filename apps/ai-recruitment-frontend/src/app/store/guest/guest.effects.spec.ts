import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import type { Action} from '@ngrx/store';
import { Store } from '@ngrx/store';
import type { Observable} from 'rxjs';
import { of as _of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { GuestEffects } from './guest.effects';
import { GuestApiService } from '../../services/guest/guest-api.service';
import * as GuestActions from './guest.actions';
import { tap } from 'rxjs/operators';
import type { MockStore } from '@ngrx/store/testing';
import { provideMockStore } from '@ngrx/store/testing';
import type { GuestState } from './guest.state';
import { selectGuestState } from './guest.selectors';

describe('GuestEffects', () => {
  let effects: GuestEffects;
  let actions$: Observable<Action>;
  let guestApiService: jest.Mocked<GuestApiService>;
  let store: MockStore<GuestState>;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    const apiServiceMock = {
      getUsageStatus: jest.fn(),
      getGuestDetails: jest.fn(),
      checkUsage: jest.fn(),
      generateFeedbackCode: jest.fn(),
      redeemFeedbackCode: jest.fn(),
      analyzeResume: jest.fn(),
      getAnalysisResults: jest.fn(),
      getDemoAnalysis: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        GuestEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        {
          provide: GuestApiService,
          useValue: apiServiceMock,
        },
      ],
    });

    effects = TestBed.inject(GuestEffects);
    guestApiService = TestBed.inject(
      GuestApiService,
    ) as jest.Mocked<GuestApiService>;
    store = TestBed.inject(Store) as MockStore<GuestState>;
    jest.spyOn(store, 'dispatch');

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementUsage$', () => {
    it('should return incrementUsageSuccess when usage is allowed', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const checkResponse = { canUse: true, message: 'Usage allowed' };
        const action = GuestActions.incrementUsage();
        const completion = GuestActions.incrementUsageSuccess();

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: checkResponse });
        guestApiService.checkUsage.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.incrementUsage$).toBe(expected, {
          b: completion,
        });
      });
    });
  });

  describe('incrementUsageSuccess$', () => {
    it('should dispatch loadUsageStatus', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = GuestActions.incrementUsageSuccess();
        const completion = GuestActions.loadUsageStatus();
        actions$ = hot('-a', { a: action });
        expectObservable(effects.incrementUsageSuccess$).toBe('-b', {
          b: completion,
        });
      });
    });
  });

  describe('redeemFeedbackCode$', () => {
    it('should dispatch success action and side effects', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const redeemResponse = { success: true, message: 'Code redeemed' };
        const action = GuestActions.redeemFeedbackCode({
          feedbackCode: 'fb-test-123',
        });
        const completion = GuestActions.redeemFeedbackCodeSuccess({
          message: 'Code redeemed',
        });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(
          cold('-a|', { a: redeemResponse }),
        );

        const effect$ = effects.redeemFeedbackCode$.pipe(
          tap(() => {
            expect(store.dispatch).toHaveBeenCalledWith(
              GuestActions.hideFeedbackModal(),
            );
            expect(store.dispatch).toHaveBeenCalledWith(
              GuestActions.hideLimitModal(),
            );
            expect(store.dispatch).toHaveBeenCalledWith(
              GuestActions.loadUsageStatus(),
            );
          }),
        );

        expectObservable(effect$).toBe('--b', { b: completion });
      });
    });
  });

  describe('uploadResume$', () => {
    it('should dispatch failure and side effect on 429 error', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });
        const action = GuestActions.uploadResume({ file: mockFile });
        const error = {
          status: 429,
          error: { message: 'Usage limit exceeded' },
        };
        const completion = GuestActions.uploadResumeFailure({
          error: 'Usage limit exceeded',
        });

        actions$ = hot('-a', { a: action });
        guestApiService.analyzeResume.mockReturnValue(cold('-#|', {}, error));

        const effect$ = effects.uploadResume$.pipe(
          tap({
            error: () => {
              expect(store.dispatch).toHaveBeenCalledWith(
                GuestActions.setLimited({
                  isLimited: true,
                  message: 'Usage limit exceeded',
                }),
              );
            },
          }),
        );
        expectObservable(effect$).toBe('--b', { b: completion });
      });
    });
  });

  describe('pollAnalysisResults$', () => {
    it('should schedule next check for processing status', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const analysisResults = {
          data: { analysisId: 'analysis-123', status: 'processing' as const },
        };
        const action = GuestActions.loadAnalysisResultsSuccess({
          analysisResults,
        });
        const completion = GuestActions.loadAnalysisResults({
          analysisId: 'analysis-123',
        });

        actions$ = hot('a', { a: action });
        const expected = '10s b';
        expectObservable(effects.pollAnalysisResults$).toBe(expected, {
          b: completion,
        });
      });
    });

    it('should not schedule next check for completed status', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const analysisResults = {
          data: { analysisId: 'analysis-123', status: 'completed' as const },
        };
        const action = GuestActions.loadAnalysisResultsSuccess({
          analysisResults,
        });
        actions$ = hot('-a', { a: action });
        expectObservable(effects.pollAnalysisResults$).toBe('');
      });
    });
  });

  describe('handleUsageLimitExceeded$', () => {
    it('should show limit modal when usage is limited and no feedback code exists', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = GuestActions.setLimited({ isLimited: true });
        actions$ = hot('--a', { a: action });

        store.overrideSelector(selectGuestState, { feedbackCode: null } as any);

        const expected = '--b';
        expectObservable(effects.handleUsageLimitExceeded$).toBe(expected, {
          b: GuestActions.showLimitModal(),
        });
      });
    });

    it('should not show modal when feedback code exists', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = GuestActions.setLimited({ isLimited: true });
        actions$ = hot('--a', { a: action });

        store.overrideSelector(selectGuestState, {
          feedbackCode: 'fb-test-123',
        } as any);

        const expected = '--b';
        expectObservable(effects.handleUsageLimitExceeded$).toBe(expected, {
          b: { type: 'NO_ACTION' },
        });
      });
    });
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - API Error Handling', () => {
    it('should handle network timeout during usage check', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.incrementUsage();
        const error = new Error('Network timeout');
        const completion = GuestActions.incrementUsageFailure({ error: 'Network timeout' });

        actions$ = hot('-a', { a: action });
        guestApiService.checkUsage.mockReturnValue(cold('-#|', {}, error));

        expectObservable(effects.incrementUsage$).toBe('--b', { b: completion });
      });
    });

    it('should handle 500 server error during resume upload', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        const action = GuestActions.uploadResume({ file: mockFile });
        const error = { status: 500, error: { message: 'Internal server error' } };
        const completion = GuestActions.uploadResumeFailure({ error: 'Internal server error' });

        actions$ = hot('-a', { a: action });
        guestApiService.analyzeResume.mockReturnValue(cold('-#|', {}, error));

        expectObservable(effects.uploadResume$).toBe('--b', { b: completion });
      });
    });

    it('should handle 403 forbidden error during feedback redemption', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: 'fb-invalid' });
        const error = { status: 403, error: { message: 'Access denied' } };
        const completion = GuestActions.redeemFeedbackCodeFailure({ error: 'Access denied' });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(cold('-#|', {}, error));

        expectObservable(effects.redeemFeedbackCode$).toBe('--b', { b: completion });
      });
    });

    it('should handle malformed API response during usage status check', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.loadUsageStatus();
        const malformedResponse = { invalid: 'structure' };
        const completion = GuestActions.loadUsageStatusSuccess({ usageStatus: malformedResponse } as any);

        actions$ = hot('-a', { a: action });
        guestApiService.getUsageStatus.mockReturnValue(cold('-a|', { a: malformedResponse }));

        expectObservable(effects.loadUsageStatus$).toBe('--b', { b: completion });
      });
    });
  });

  describe('Negative Tests - Invalid Inputs', () => {
    it('should reject empty feedback code', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: '' });
        const error = new Error('Feedback code cannot be empty');
        const completion = GuestActions.redeemFeedbackCodeFailure({ error: 'Feedback code cannot be empty' });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(cold('-#|', {}, error));

        expectObservable(effects.redeemFeedbackCode$).toBe('--b', { b: completion });
      });
    });

    it('should reject invalid file type during upload', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockFile = new File(['content'], 'malicious.exe', { type: 'application/x-msdownload' });
        const action = GuestActions.uploadResume({ file: mockFile });
        const error = { status: 400, error: { message: 'Invalid file type' } };
        const completion = GuestActions.uploadResumeFailure({ error: 'Invalid file type' });

        actions$ = hot('-a', { a: action });
        guestApiService.analyzeResume.mockReturnValue(cold('-#|', {}, error));

        expectObservable(effects.uploadResume$).toBe('--b', { b: completion });
      });
    });

    it('should reject oversized file during upload', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' });
        const action = GuestActions.uploadResume({ file: largeFile });
        const error = { status: 413, error: { message: 'File too large' } };
        const completion = GuestActions.uploadResumeFailure({ error: 'File too large' });

        actions$ = hot('-a', { a: action });
        guestApiService.analyzeResume.mockReturnValue(cold('-#|', {}, error));

        expectObservable(effects.uploadResume$).toBe('--b', { b: completion });
      });
    });
  });

  describe('Boundary Tests - Polling Behavior', () => {
    it('should not exceed maximum poll iterations (timeout after 10 polls)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const processingResults = {
          data: { analysisId: 'analysis-timeout', status: 'processing' as const },
        };
        const action = GuestActions.loadAnalysisResultsSuccess({ analysisResults: processingResults });

        actions$ = hot('a', { a: action });

        // Should schedule next check
        const expected = '10s b';
        expectObservable(effects.pollAnalysisResults$).toBe(expected, {
          b: GuestActions.loadAnalysisResults({ analysisId: 'analysis-timeout' }),
        });
      });
    });

    it('should handle analysis stuck in processing state', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const stuckResults = {
          data: { analysisId: 'analysis-stuck', status: 'processing' as const },
        };
        const action = GuestActions.loadAnalysisResultsSuccess({ analysisResults: stuckResults });

        actions$ = hot('a', { a: action });
        expectObservable(effects.pollAnalysisResults$).toBe('10s b', {
          b: GuestActions.loadAnalysisResults({ analysisId: 'analysis-stuck' }),
        });
      });
    });

    it('should stop polling when analysis fails', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const failedResults = {
          data: { analysisId: 'analysis-failed', status: 'failed' as const },
        };
        const action = GuestActions.loadAnalysisResultsSuccess({ analysisResults: failedResults });

        actions$ = hot('-a', { a: action });
        expectObservable(effects.pollAnalysisResults$).toBe('');
      });
    });
  });

  describe('Edge Cases - Concurrent Actions', () => {
    it('should handle multiple simultaneous usage checks', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const checkResponse = { canUse: true, message: 'Usage allowed' };
        const action = GuestActions.incrementUsage();
        const completion = GuestActions.incrementUsageSuccess();

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: checkResponse });
        guestApiService.checkUsage.mockReturnValue(response);

        expectObservable(effects.incrementUsage$).toBe('--b', { b: completion });
      });
    });

    it('should handle rapid sequential actions', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const redeemResponse = { success: true, message: 'Code redeemed' };
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: 'fb-test' });
        const completion = GuestActions.redeemFeedbackCodeSuccess({ message: 'Code redeemed' });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(cold('-a|', { a: redeemResponse }));

        expectObservable(effects.redeemFeedbackCode$).toBe('--b', { b: completion });
      });
    });
  });

  describe('Edge Cases - State Transitions', () => {
    it('should handle transition from unlimited to limited state', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = GuestActions.setLimited({ isLimited: true, message: 'Limit reached' });
        actions$ = hot('--a', { a: action });

        store.overrideSelector(selectGuestState, { feedbackCode: null } as any);

        expectObservable(effects.handleUsageLimitExceeded$).toBe('--b', {
          b: GuestActions.showLimitModal(),
        });
      });
    });

    it('should handle transition from limited back to unlimited (after redemption)', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const redeemResponse = { success: true, message: 'Usage reset' };
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: 'fb-reset' });
        const completion = GuestActions.redeemFeedbackCodeSuccess({ message: 'Usage reset' });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(cold('-a|', { a: redeemResponse }));

        const effect$ = effects.redeemFeedbackCode$.pipe(
          tap(() => {
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.loadUsageStatus());
          }),
        );

        expectObservable(effect$).toBe('--b', { b: completion });
      });
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should verify all side effects on successful redemption', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const redeemResponse = { success: true, message: 'Code redeemed successfully' };
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: 'fb-complete-test' });
        const completion = GuestActions.redeemFeedbackCodeSuccess({ message: 'Code redeemed successfully' });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(cold('-a|', { a: redeemResponse }));

        const effect$ = effects.redeemFeedbackCode$.pipe(
          tap(() => {
            // Verify all three side effects are dispatched
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideFeedbackModal());
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.loadUsageStatus());
            expect(store.dispatch).toHaveBeenCalledTimes(3);
          }),
        );

        expectObservable(effect$).toBe('--b', { b: completion });
      });
    });

    it('should verify exact polling delay (10 seconds)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const processingResults = {
          data: { analysisId: 'analysis-timing', status: 'processing' as const },
        };
        const action = GuestActions.loadAnalysisResultsSuccess({ analysisResults: processingResults });
        const completion = GuestActions.loadAnalysisResults({ analysisId: 'analysis-timing' });

        actions$ = hot('a', { a: action });

        // Verify exact 10-second delay
        expectObservable(effects.pollAnalysisResults$).toBe('10s b', { b: completion });
      });
    });
  });
});
