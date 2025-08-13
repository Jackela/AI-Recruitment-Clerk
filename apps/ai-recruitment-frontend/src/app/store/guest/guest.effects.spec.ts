import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, Store } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { GuestEffects } from './guest.effects';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { GuestState } from './guest.state';
import * as GuestActions from './guest.actions';

describe('GuestEffects', () => {
  let effects: GuestEffects;
  let actions$: Observable<Action>;
  let guestApiService: jest.Mocked<GuestApiService>;
  let store: jest.Mocked<Store<{ guest: GuestState }>>;
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

    const storeMock = {
      dispatch: jest.fn(),
      select: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        GuestEffects,
        provideMockActions(() => actions$),
        {
          provide: GuestApiService,
          useValue: apiServiceMock,
        },
        {
          provide: Store,
          useValue: storeMock,
        },
      ],
    });

    effects = TestBed.inject(GuestEffects);
    guestApiService = TestBed.inject(GuestApiService) as jest.Mocked<GuestApiService>;
    store = TestBed.inject(Store) as jest.Mocked<Store<{ guest: GuestState }>>;

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadUsageStatus$', () => {
    it('should load usage status successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const usageStatus = {
          canUse: true,
          remainingCount: 3,
          needsFeedbackCode: false,
        };

        const action = GuestActions.loadUsageStatus();
        const completion = GuestActions.loadUsageStatusSuccess({ usageStatus });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: usageStatus });
        guestApiService.getUsageStatus.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.loadUsageStatus$).toBe(expected, { b: completion });
      });
    });

    it('should handle usage status load failure', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.loadUsageStatus();
        const error = new Error('API Error');
        const completion = GuestActions.loadUsageStatusFailure({ 
          error: 'API Error' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.getUsageStatus.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.loadUsageStatus$).toBe(expected, { b: completion });
      });
    });
  });

  describe('loadGuestDetails$', () => {
    it('should load guest details successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const guestDetails = {
          deviceId: 'test-device-123',
          usageCount: 2,
          maxUsage: 5,
          isLimited: false,
          lastUsed: new Date(),
        };

        const action = GuestActions.loadGuestDetails();
        const completion = GuestActions.loadGuestDetailsSuccess({ guestDetails });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: guestDetails });
        guestApiService.getGuestDetails.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.loadGuestDetails$).toBe(expected, { b: completion });
      });
    });
  });

  describe('incrementUsage$', () => {
    it('should increment usage successfully when allowed', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const checkResponse = { canUse: true, message: 'Usage allowed' };
        const action = GuestActions.incrementUsage();
        const completion = GuestActions.incrementUsageSuccess({ remainingCount: 4 });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: checkResponse });
        guestApiService.checkUsage.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.incrementUsage$).toBe(expected, { b: completion });
        
        // Verify that loadUsageStatus is dispatched
        expect(store.dispatch).toHaveBeenCalledWith(GuestActions.loadUsageStatus());
      });
    });

    it('should set limited when usage check fails', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const checkResponse = { canUse: false, message: 'Limit exceeded' };
        const action = GuestActions.incrementUsage();
        const completion = GuestActions.setLimited({ 
          isLimited: true, 
          message: 'Limit exceeded' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: checkResponse });
        guestApiService.checkUsage.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.incrementUsage$).toBe(expected, { b: completion });
      });
    });

    it('should handle 429 error correctly', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.incrementUsage();
        const error = { status: 429, error: { message: 'Too many requests' } };
        const completion = GuestActions.setLimited({ 
          isLimited: true, 
          message: 'Too many requests' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.checkUsage.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.incrementUsage$).toBe(expected, { b: completion });
      });
    });
  });

  describe('generateFeedbackCode$', () => {
    it('should generate feedback code successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const feedbackResponse = {
          feedbackCode: 'fb-test-123',
          surveyUrl: 'https://wj.qq.com/test',
          message: 'Code generated',
        };

        const action = GuestActions.generateFeedbackCode();
        const completion = GuestActions.generateFeedbackCodeSuccess({ feedbackResponse });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: feedbackResponse });
        guestApiService.generateFeedbackCode.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.generateFeedbackCode$).toBe(expected, { b: completion });
      });
    });

    it('should handle feedback code generation failure', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.generateFeedbackCode();
        const error = { error: { message: 'Code not needed' } };
        const completion = GuestActions.generateFeedbackCodeFailure({ 
          error: 'Code not needed' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.generateFeedbackCode.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.generateFeedbackCode$).toBe(expected, { b: completion });
      });
    });
  });

  describe('redeemFeedbackCode$', () => {
    it('should redeem feedback code successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const redeemResponse = { success: true, message: 'Code redeemed' };
        const action = GuestActions.redeemFeedbackCode({ feedbackCode: 'fb-test-123' });
        const completion = GuestActions.redeemFeedbackCodeSuccess({ 
          message: 'Code redeemed' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: redeemResponse });
        guestApiService.redeemFeedbackCode.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.redeemFeedbackCode$).toBe(expected, { b: completion });
        
        // Verify modals are closed and usage status is refreshed
        expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideFeedbackModal());
        expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
        expect(store.dispatch).toHaveBeenCalledWith(GuestActions.loadUsageStatus());
      });
    });
  });

  describe('uploadResume$', () => {
    it('should upload resume successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        const analysisData = {
          data: {
            analysisId: 'analysis-123',
            filename: 'test.pdf',
            uploadedAt: '2024-01-01T00:00:00.000Z',
            estimatedCompletionTime: '2-3 minutes',
          },
        };

        const action = GuestActions.uploadResume({ 
          file: mockFile,
          candidateName: 'John Doe',
        });
        const completion = GuestActions.uploadResumeSuccess({ analysisData });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: analysisData });
        guestApiService.analyzeResume.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.uploadResume$).toBe(expected, { b: completion });
      });
    });

    it('should handle upload failure with 429 error', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        const action = GuestActions.uploadResume({ file: mockFile });
        const error = { status: 429, error: { message: 'Limit exceeded' } };

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.analyzeResume.mockReturnValue(response);

        // Should dispatch setLimited action for 429 errors
        expect(store.dispatch).toHaveBeenCalledWith(
          GuestActions.setLimited({ 
            isLimited: true, 
            message: 'Limit exceeded' 
          })
        );
      });
    });
  });

  describe('loadAnalysisResults$', () => {
    it('should load analysis results successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const analysisResults = {
          data: {
            analysisId: 'analysis-123',
            status: 'completed' as const,
            progress: 100,
            results: {},
          },
        };

        const action = GuestActions.loadAnalysisResults({ analysisId: 'analysis-123' });
        const completion = GuestActions.loadAnalysisResultsSuccess({ analysisResults });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: analysisResults });
        guestApiService.getAnalysisResults.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.loadAnalysisResults$).toBe(expected, { b: completion });
      });
    });

    it('should schedule next check for processing status', () => {
      jest.useFakeTimers();
      
      const analysisResults = {
        data: {
          analysisId: 'analysis-123',
          status: 'processing' as const,
          progress: 50,
        },
      };

      guestApiService.getAnalysisResults.mockReturnValue(of(analysisResults));

      const action$ = of(GuestActions.loadAnalysisResults({ analysisId: 'analysis-123' }));
      
      effects.loadAnalysisResults$.subscribe();
      
      // Fast-forward time to trigger the setTimeout
      jest.advanceTimersByTime(10000);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        GuestActions.loadAnalysisResults({ analysisId: 'analysis-123' })
      );
      
      jest.useRealTimers();
    });
  });

  describe('loadDemoAnalysis$', () => {
    it('should load demo analysis successfully', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const demoResults = {
          data: {
            analysisId: 'demo-123',
            status: 'completed' as const,
            results: {},
          },
        };

        const action = GuestActions.loadDemoAnalysis();
        const completion = GuestActions.loadDemoAnalysisSuccess({ demoResults });

        actions$ = hot('-a', { a: action });
        const response = cold('-a|', { a: demoResults });
        guestApiService.getDemoAnalysis.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.loadDemoAnalysis$).toBe(expected, { b: completion });
      });
    });

    it('should handle demo analysis with 429 error', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.loadDemoAnalysis();
        const error = { status: 429, error: { message: 'Limit exceeded' } };

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.getDemoAnalysis.mockReturnValue(response);

        // Should dispatch setLimited action
        expect(store.dispatch).toHaveBeenCalledWith(
          GuestActions.setLimited({ 
            isLimited: true, 
            message: 'Limit exceeded' 
          })
        );
      });
    });
  });

  describe('refreshUsageAfterSuccess$', () => {
    it('should refresh usage status after successful operations', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const actions = [
          GuestActions.redeemFeedbackCodeSuccess({ message: 'Success' }),
          GuestActions.uploadResumeSuccess({ analysisData: { data: {} } } as any),
          GuestActions.loadDemoAnalysisSuccess({ demoResults: { data: {} } } as any),
        ];

        actions$.forEach((action) => {
          actions$ = hot('-a', { a: action });
          const expected = '-b';
          expectObservable(effects.refreshUsageAfterSuccess$).toBe(expected, {
            b: GuestActions.loadUsageStatus(),
          });
        });
      });
    });
  });

  describe('handleUsageLimitExceeded$', () => {
    it('should show limit modal when usage is limited and no feedback code exists', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockState = {
          feedbackCode: null,
          isLimited: false,
        };

        const action = GuestActions.setLimited({ isLimited: true });
        
        actions$ = hot('-a', { a: action });
        store.select.mockReturnValue(cold('-a|', { a: mockState }));

        const expected = '--b';
        expectObservable(effects.handleUsageLimitExceeded$).toBe(expected, {
          b: GuestActions.showLimitModal(),
        });
      });
    });

    it('should not show modal when feedback code exists', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const mockState = {
          feedbackCode: 'fb-test-123',
          isLimited: false,
        };

        const action = GuestActions.setLimited({ isLimited: true });
        
        actions$ = hot('-a', { a: action });
        store.select.mockReturnValue(cold('-a|', { a: mockState }));

        const expected = '--b';
        expectObservable(effects.handleUsageLimitExceeded$).toBe(expected, {
          b: { type: 'NO_ACTION' },
        });
      });
    });
  });

  describe('initializeGuestMode$', () => {
    it('should initialize guest mode with multiple actions', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = GuestActions.initializeGuest({ deviceId: 'test-device-123' });
        
        actions$ = hot('-a', { a: action });

        const expected = '-(bc)';
        expectObservable(effects.initializeGuestMode$).toBe(expected, {
          b: GuestActions.loadUsageStatus(),
          c: GuestActions.setGuestMode({ isGuestMode: true }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors with fallback error messages', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.loadUsageStatus();
        const error = {}; // Error without message
        const completion = GuestActions.loadUsageStatusFailure({ 
          error: 'Failed to load usage status' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.getUsageStatus.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.loadUsageStatus$).toBe(expected, { b: completion });
      });
    });

    it('should handle nested error messages', () => {
      testScheduler.run(({ hot, cold, expectObservable }) => {
        const action = GuestActions.generateFeedbackCode();
        const error = { 
          error: { message: 'Nested error message' },
          message: 'Top level message',
        };
        const completion = GuestActions.generateFeedbackCodeFailure({ 
          error: 'Nested error message' 
        });

        actions$ = hot('-a', { a: action });
        const response = cold('-#|', {}, error);
        guestApiService.generateFeedbackCode.mockReturnValue(response);

        const expected = '--b';
        expectObservable(effects.generateFeedbackCode$).toBe(expected, { b: completion });
      });
    });
  });
});