import { guestReducer } from './guest.reducer';
import { initialGuestState, GuestState } from './guest.state';
import * as GuestActions from './guest.actions';

describe('Guest Reducer', () => {
  let state: GuestState;

  beforeEach(() => {
    state = { ...initialGuestState };
  });

  it('should return the initial state', () => {
    const action = { type: 'UNKNOWN' } as any;
    const result = guestReducer(undefined, action);

    expect(result).toEqual(initialGuestState);
  });

  describe('Device and Initialization Actions', () => {
    it('should initialize guest with device ID', () => {
      const deviceId = 'test-device-123';
      const action = GuestActions.initializeGuest({ deviceId });
      const result = guestReducer(state, action);

      expect(result.deviceId).toBe(deviceId);
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should set guest mode', () => {
      const action = GuestActions.setGuestMode({ isGuestMode: true });
      const result = guestReducer(state, action);

      expect(result.isGuestMode).toBe(true);
      expect(result.lastUpdated).toBeTruthy();
    });
  });

  describe('Usage Status Actions', () => {
    it('should set loading state when loading usage status', () => {
      const action = GuestActions.loadUsageStatus();
      const result = guestReducer(state, action);

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should update state on usage status success', () => {
      const usageStatus = {
        canUse: true,
        remainingCount: 3,
        needsFeedbackCode: false,
        feedbackCode: 'fb-test-123',
      };
      const action = GuestActions.loadUsageStatusSuccess({ usageStatus });
      const result = guestReducer(state, action);

      expect(result.remainingCount).toBe(3);
      expect(result.isLimited).toBe(false);
      expect(result.feedbackCode).toBe('fb-test-123');
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should handle usage status failure', () => {
      const error = 'Failed to load usage status';
      const action = GuestActions.loadUsageStatusFailure({ error });
      const result = guestReducer(state, action);

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Guest Details Actions', () => {
    it('should update state on guest details success', () => {
      const guestDetails = {
        deviceId: 'test-device-123',
        usageCount: 2,
        maxUsage: 5,
        isLimited: false,
        feedbackCodeStatus: 'generated' as const,
        lastUsed: new Date(),
      };
      const action = GuestActions.loadGuestDetailsSuccess({ guestDetails });
      const result = guestReducer(state, action);

      expect(result.usageCount).toBe(2);
      expect(result.maxUsage).toBe(5);
      expect(result.remainingCount).toBe(3);
      expect(result.isLimited).toBe(false);
      expect(result.feedbackCodeStatus).toBe('generated');
      expect(result.isLoading).toBe(false);
      expect(result.lastUpdated).toBeTruthy();
    });
  });

  describe('Usage Increment Actions', () => {
    beforeEach(() => {
      state = {
        ...initialGuestState,
        usageCount: 2,
        maxUsage: 5,
        remainingCount: 3,
      };
    });

    it('should increment usage count on success', () => {
      const action = GuestActions.incrementUsageSuccess();
      const result = guestReducer(state, action);

      expect(result.usageCount).toBe(3);
      expect(result.remainingCount).toBe(2);
      expect(result.isLimited).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should set limited when usage count reaches max', () => {
      state.usageCount = 4;
      const action = GuestActions.incrementUsageSuccess();
      const result = guestReducer(state, action);

      expect(result.isLimited).toBe(true);
      expect(result.remainingCount).toBe(0);
      expect(result.usageCount).toBe(5);
    });
  });

  describe('Usage Limit Actions', () => {
    it('should set limited state with message', () => {
      const message = 'Usage limit exceeded';
      const action = GuestActions.setLimited({ isLimited: true, message });
      const result = guestReducer(state, action);

      expect(result.isLimited).toBe(true);
      expect(result.error).toBe(message);
      expect(result.showLimitModal).toBe(true);
    });

    it('should show and hide limit modal', () => {
      const showAction = GuestActions.showLimitModal();
      const showResult = guestReducer(state, showAction);
      expect(showResult.showLimitModal).toBe(true);

      const hideAction = GuestActions.hideLimitModal();
      const hideResult = guestReducer(showResult, hideAction);
      expect(hideResult.showLimitModal).toBe(false);
    });
  });

  describe('Feedback Code Actions', () => {
    it('should update state on feedback code generation success', () => {
      const feedbackResponse = {
        feedbackCode: 'fb-test-123',
        surveyUrl: 'https://wj.qq.com/test',
        message: 'Code generated',
      };
      const action = GuestActions.generateFeedbackCodeSuccess({
        feedbackResponse,
      });
      const result = guestReducer(state, action);

      expect(result.feedbackCode).toBe('fb-test-123');
      expect(result.surveyUrl).toBe('https://wj.qq.com/test');
      expect(result.feedbackCodeStatus).toBe('generated');
      expect(result.showFeedbackModal).toBe(true);
      expect(result.isLoading).toBe(false);
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should handle feedback code redemption success', () => {
      const initialState = {
        ...state,
        usageCount: 5,
        remainingCount: 0,
        isLimited: true,
        maxUsage: 5,
      };
      const action = GuestActions.redeemFeedbackCodeSuccess({
        message: 'Code redeemed',
      });
      const result = guestReducer(initialState, action);

      expect(result.feedbackCodeStatus).toBe('redeemed');
      expect(result.usageCount).toBe(0);
      expect(result.remainingCount).toBe(5);
      expect(result.isLimited).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should show and hide feedback modal', () => {
      const showAction = GuestActions.showFeedbackModal();
      const showResult = guestReducer(state, showAction);
      expect(showResult.showFeedbackModal).toBe(true);

      const hideAction = GuestActions.hideFeedbackModal();
      const hideResult = guestReducer(showResult, hideAction);
      expect(hideResult.showFeedbackModal).toBe(false);
    });
  });

  describe('Resume Analysis Actions', () => {
    const mockFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf',
    });

    it('should set uploading state on resume upload', () => {
      const action = GuestActions.uploadResume({
        file: mockFile,
        candidateName: 'John Doe',
      });
      const result = guestReducer(state, action);

      expect(result.currentAnalysis.status).toBe('uploading');
      expect(result.currentAnalysis.filename).toBe('test.pdf');
      expect(result.currentAnalysis.progress).toBe(0);
      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should update state on upload success', () => {
      const analysisData = {
        data: {
          analysisId: 'analysis-123',
          filename: 'test.pdf',
          uploadedAt: '2024-01-01T00:00:00.000Z',
          estimatedCompletionTime: '2-3 minutes',
          remainingUsage: 3,
        },
      };
      const action = GuestActions.uploadResumeSuccess({ analysisData });
      const result = guestReducer(state, action);

      expect(result.currentAnalysis.analysisId).toBe('analysis-123');
      expect(result.currentAnalysis.status).toBe('processing');
      expect(result.currentAnalysis.progress).toBe(10);
      expect(result.remainingCount).toBe(3);
      expect(result.isLoading).toBe(false);
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should handle upload failure', () => {
      const error = 'Upload failed';
      const action = GuestActions.uploadResumeFailure({ error });
      const result = guestReducer(state, action);

      expect(result.currentAnalysis.status).toBe('failed');
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should update analysis results on load success', () => {
      const analysisResults = {
        data: {
          analysisId: 'analysis-123',
          status: 'completed' as const,
          progress: 100,
          results: {
            personalInfo: {},
            skills: [],
            experience: {},
            education: [],
            summary: {},
          },
          completedAt: '2024-01-01T00:05:00.000Z',
        },
      };
      const action = GuestActions.loadAnalysisResultsSuccess({
        analysisResults,
      });
      const result = guestReducer(state, action);

      expect(result.analysisResults['analysis-123']).toEqual(
        analysisResults.data,
      );
      expect(result.showAnalysisResults).toBe(true);
      expect(result.isLoading).toBe(false);
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should handle demo analysis success', () => {
      const demoResults = {
        data: {
          analysisId: 'demo-123',
          status: 'completed' as const,
          filename: 'demo.pdf',
          completedAt: '2024-01-01T00:00:00.000Z',
          remainingUsage: 2,
          results: {
            personalInfo: {},
            skills: [],
            experience: {},
            education: [],
            summary: {},
          },
        },
      };
      const action = GuestActions.loadDemoAnalysisSuccess({ demoResults });
      const result = guestReducer(state, action);

      expect(result.analysisResults['demo-123']).toEqual(demoResults.data);
      expect(result.currentAnalysis.analysisId).toBe('demo-123');
      expect(result.currentAnalysis.status).toBe('completed');
      expect(result.remainingCount).toBe(2);
      expect(result.showAnalysisResults).toBe(true);
      expect(result.lastUpdated).toBeTruthy();
    });
  });

  describe('Analysis Progress Actions', () => {
    beforeEach(() => {
      state = {
        ...initialGuestState,
        currentAnalysis: {
          analysisId: 'analysis-123',
          status: 'processing',
          progress: 50,
          filename: 'test.pdf',
          uploadedAt: '2024-01-01T00:00:00.000Z',
          estimatedCompletionTime: '2-3 minutes',
        },
        analysisResults: {
          'analysis-123': {
            analysisId: 'analysis-123',
            status: 'processing',
            progress: 50,
          },
        },
      };
    });

    it('should update analysis progress', () => {
      const action = GuestActions.updateAnalysisProgress({
        analysisId: 'analysis-123',
        progress: 75,
        status: 'processing',
      });
      const result = guestReducer(state, action);

      expect(result.currentAnalysis.progress).toBe(75);
      expect(result.analysisResults['analysis-123'].progress).toBe(75);
    });

    it('should show and hide analysis results', () => {
      const showAction = GuestActions.showAnalysisResults();
      const showResult = guestReducer(state, showAction);
      expect(showResult.showAnalysisResults).toBe(true);

      const hideAction = GuestActions.hideAnalysisResults();
      const hideResult = guestReducer(showResult, hideAction);
      expect(hideResult.showAnalysisResults).toBe(false);
    });
  });

  describe('Data Management Actions', () => {
    beforeEach(() => {
      state = {
        ...initialGuestState,
        deviceId: 'test-device-123',
        usageCount: 3,
        remainingCount: 2,
        feedbackCode: 'fb-test-123',
        isLimited: true,
      };
    });

    it('should clear all guest data', () => {
      const action = GuestActions.clearGuestData();
      const result = guestReducer(state, action);

      expect(result).toEqual(initialGuestState);
    });

    it('should reset usage count', () => {
      const action = GuestActions.resetUsageCount();
      const result = guestReducer(state, action);

      expect(result.usageCount).toBe(0);
      expect(result.remainingCount).toBe(state.maxUsage);
      expect(result.isLimited).toBe(false);
      expect(result.feedbackCode).toBeNull();
      expect(result.feedbackCodeStatus).toBeNull();
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should update last activity', () => {
      const action = GuestActions.updateLastActivity();
      const result = guestReducer(state, action);

      expect(result.lastUpdated).toBeTruthy();
      expect(new Date(result.lastUpdated!).getTime()).toBeGreaterThan(
        new Date().getTime() - 1000,
      );
    });
  });

  describe('Error Handling Actions', () => {
    beforeEach(() => {
      state = {
        ...initialGuestState,
        error: 'Previous error',
      };
    });

    it('should clear error', () => {
      const action = GuestActions.clearError();
      const result = guestReducer(state, action);

      expect(result.error).toBeNull();
    });

    it('should set error', () => {
      const error = 'New error message';
      const action = GuestActions.setError({ error });
      const result = guestReducer(state, action);

      expect(result.error).toBe(error);
    });
  });

  describe('Loading Actions', () => {
    it('should set loading state', () => {
      const action = GuestActions.setLoading({ isLoading: true });
      const result = guestReducer(state, action);

      expect(result.isLoading).toBe(true);
    });

    it('should clear loading state', () => {
      const initialState = { ...state, isLoading: true };
      const action = GuestActions.setLoading({ isLoading: false });
      const result = guestReducer(initialState, action);

      expect(result.isLoading).toBe(false);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = { ...state };
      const action = GuestActions.initializeGuest({
        deviceId: 'test-device-123',
      });

      guestReducer(state, action);

      expect(state).toEqual(originalState);
    });

    it('should create new state object on every action', () => {
      const action = GuestActions.updateLastActivity();
      const result = guestReducer(state, action);

      expect(result).not.toBe(state);
      expect(result.lastUpdated).not.toBe(state.lastUpdated);
    });
  });
});
