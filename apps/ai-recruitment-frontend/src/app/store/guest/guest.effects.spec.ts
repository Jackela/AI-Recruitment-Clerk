import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { GuestEffects } from './guest.effects';
import { GuestApiService } from '../../services/guest/guest-api.service';
import * as GuestActions from './guest.actions';
import { tap } from 'rxjs/operators';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GuestState } from './guest.state';
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
    guestApiService = TestBed.inject(GuestApiService) as jest.Mocked<GuestApiService>;
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
        expectObservable(effects.incrementUsage$).toBe(expected, { b: completion });
      });
    });
  });

  describe('incrementUsageSuccess$', () => {
    it('should dispatch loadUsageStatus', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = GuestActions.incrementUsageSuccess();
        const completion = GuestActions.loadUsageStatus();
        actions$ = hot('-a', { a: action });
        expectObservable(effects.incrementUsageSuccess$).toBe('-b', { b: completion });
      });
    });
  });

  describe('redeemFeedbackCode$', () => {
    it('should dispatch success action and side effects', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const redeemResponse = { success: true, message: 'Code redeemed' };
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: 'fb-test-123' });
        const completion = GuestActions.redeemFeedbackCodeSuccess({ message: 'Code redeemed' });

        actions$ = hot('-a', { a: action });
        guestApiService.redeemFeedbackCode.mockReturnValue(cold('-a|', { a: redeemResponse }));

        const effect$ = effects.redeemFeedbackCode$.pipe(
          tap(() => {
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideFeedbackModal());
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
            expect(store.dispatch).toHaveBeenCalledWith(GuestActions.loadUsageStatus());
          })
        );
        
        expectObservable(effect$).toBe('--b', { b: completion });
      });
    });
  });

  describe('uploadResume$', () => {
    it('should dispatch failure and side effect on 429 error', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        const action = GuestActions.uploadResume({ file: mockFile });
        const error = { status: 429, error: { message: 'Usage limit exceeded' } };
        const completion = GuestActions.uploadResumeFailure({ error: 'Usage limit exceeded' });

        actions$ = hot('-a', { a: action });
        guestApiService.analyzeResume.mockReturnValue(cold('-#|', {}, error));

        const effect$ = effects.uploadResume$.pipe(
            tap({
                error: () => {
                    expect(store.dispatch).toHaveBeenCalledWith(
                        GuestActions.setLimited({ isLimited: true, message: 'Usage limit exceeded' })
                    );
                }
            })
        );
        expectObservable(effect$).toBe('--b', { b: completion });
      });
    });
  });

  describe('pollAnalysisResults$', () => {
      it('should schedule next check for processing status', () => {
        testScheduler.run(({ hot, expectObservable }) => {
            const analysisResults = { data: { analysisId: 'analysis-123', status: 'processing' as const }};
            const action = GuestActions.loadAnalysisResultsSuccess({ analysisResults });
            const completion = GuestActions.loadAnalysisResults({ analysisId: 'analysis-123' });

            actions$ = hot('a', { a: action });
            const expected = '10s b';
            expectObservable(effects.pollAnalysisResults$).toBe(expected, { b: completion });
        });
      });

      it('should not schedule next check for completed status', () => {
        testScheduler.run(({ hot, expectObservable }) => {
            const analysisResults = { data: { analysisId: 'analysis-123', status: 'completed' as const }};
            const action = GuestActions.loadAnalysisResultsSuccess({ analysisResults });
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

        store.overrideSelector(selectGuestState, { feedbackCode: 'fb-test-123' } as any);

        const expected = '--b';
        expectObservable(effects.handleUsageLimitExceeded$).toBe(expected, {
          b: { type: 'NO_ACTION' },
        });
      });
    });
  });
});
