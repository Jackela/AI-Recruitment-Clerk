import { createReducer, on } from '@ngrx/store';
import { GuestState, initialGuestState } from './guest.state';
import * as GuestActions from './guest.actions';

export const guestReducer = createReducer(
  initialGuestState,

  // Device and initialization
  on(GuestActions.initializeGuest, (state, { deviceId }) => ({
    ...state,
    deviceId,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.setGuestMode, (state, { isGuestMode }) => ({
    ...state,
    isGuestMode,
    lastUpdated: new Date().toISOString(),
  })),

  // Usage status loading
  on(GuestActions.loadUsageStatus, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.loadUsageStatusSuccess, (state, { usageStatus }) => ({
    ...state,
    remainingCount: usageStatus.remainingCount,
    isLimited: !usageStatus.canUse,
    feedbackCode: usageStatus.feedbackCode || state.feedbackCode,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.loadUsageStatusFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Guest details loading
  on(GuestActions.loadGuestDetails, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.loadGuestDetailsSuccess, (state, { guestDetails }) => ({
    ...state,
    usageCount: guestDetails.usageCount,
    maxUsage: guestDetails.maxUsage,
    remainingCount: guestDetails.maxUsage - guestDetails.usageCount,
    isLimited: guestDetails.isLimited,
    feedbackCodeStatus: guestDetails.feedbackCodeStatus || state.feedbackCodeStatus,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.loadGuestDetailsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Usage increment
  on(GuestActions.incrementUsage, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.incrementUsageSuccess, (state) => {
    const newUsageCount = state.usageCount + 1;
    const newRemainingCount = state.maxUsage - newUsageCount;
    return {
      ...state,
      usageCount: newUsageCount,
      remainingCount: newRemainingCount,
      isLimited: newRemainingCount <= 0,
      isLoading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    };
  }),

  on(GuestActions.incrementUsageFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Usage limit
  on(GuestActions.setLimited, (state, { isLimited, message }) => ({
    ...state,
    isLimited,
    error: message || null,
    showLimitModal: isLimited,
  })),

  on(GuestActions.showLimitModal, (state) => ({
    ...state,
    showLimitModal: true,
  })),

  on(GuestActions.hideLimitModal, (state) => ({
    ...state,
    showLimitModal: false,
  })),

  // Feedback code generation
  on(GuestActions.generateFeedbackCode, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.generateFeedbackCodeSuccess, (state, { feedbackResponse }) => ({
    ...state,
    feedbackCode: feedbackResponse.feedbackCode,
    surveyUrl: feedbackResponse.surveyUrl,
    feedbackCodeStatus: 'generated' as const,
    isLoading: false,
    error: null,
    showFeedbackModal: true,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.generateFeedbackCodeFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Feedback code redemption
  on(GuestActions.redeemFeedbackCode, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.redeemFeedbackCodeSuccess, (state, { message }) => ({
    ...state,
    feedbackCodeStatus: 'redeemed' as const,
    usageCount: 0, // Reset usage count after redemption
    remainingCount: state.maxUsage,
    isLimited: false,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.redeemFeedbackCodeFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Feedback modal
  on(GuestActions.showFeedbackModal, (state) => ({
    ...state,
    showFeedbackModal: true,
  })),

  on(GuestActions.hideFeedbackModal, (state) => ({
    ...state,
    showFeedbackModal: false,
  })),

  // Resume analysis
  on(GuestActions.uploadResume, (state, { file }) => ({
    ...state,
    currentAnalysis: {
      ...state.currentAnalysis,
      status: 'uploading' as const,
      filename: file.name,
      progress: 0,
    },
    isLoading: true,
    error: null,
  })),

  on(GuestActions.uploadResumeSuccess, (state, { analysisData }) => ({
    ...state,
    currentAnalysis: {
      analysisId: analysisData.data.analysisId,
      status: 'processing' as const,
      filename: analysisData.data.filename,
      uploadedAt: analysisData.data.uploadedAt,
      estimatedCompletionTime: analysisData.data.estimatedCompletionTime,
      progress: 10, // Start with some progress
    },
    remainingCount: analysisData.data.remainingUsage ?? state.remainingCount,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.uploadResumeFailure, (state, { error }) => ({
    ...state,
    currentAnalysis: {
      ...state.currentAnalysis,
      status: 'failed' as const,
    },
    isLoading: false,
    error,
  })),

  // Analysis results loading
  on(GuestActions.loadAnalysisResults, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.loadAnalysisResultsSuccess, (state, { analysisResults }) => ({
    ...state,
    analysisResults: {
      ...state.analysisResults,
      [analysisResults.data.analysisId]: analysisResults.data,
    },
    currentAnalysis: {
      ...state.currentAnalysis,
      status: analysisResults.data.status === 'completed' ? 'completed' : state.currentAnalysis.status,
      progress: analysisResults.data.progress,
    },
    showAnalysisResults: analysisResults.data.status === 'completed',
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.loadAnalysisResultsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Demo analysis
  on(GuestActions.loadDemoAnalysis, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(GuestActions.loadDemoAnalysisSuccess, (state, { demoResults }) => ({
    ...state,
    analysisResults: {
      ...state.analysisResults,
      [demoResults.data.analysisId]: demoResults.data,
    },
    currentAnalysis: {
      analysisId: demoResults.data.analysisId,
      status: 'completed' as const,
      filename: demoResults.data.filename,
      uploadedAt: demoResults.data.completedAt,
      estimatedCompletionTime: 'Demo',
      progress: 100,
    },
    remainingCount: demoResults.data.remainingUsage ?? state.remainingCount,
    showAnalysisResults: true,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.loadDemoAnalysisFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  // Analysis UI
  on(GuestActions.showAnalysisResults, (state) => ({
    ...state,
    showAnalysisResults: true,
  })),

  on(GuestActions.hideAnalysisResults, (state) => ({
    ...state,
    showAnalysisResults: false,
  })),

  on(GuestActions.updateAnalysisProgress, (state, { analysisId, progress, status }) => ({
    ...state,
    currentAnalysis: state.currentAnalysis.analysisId === analysisId
      ? {
          ...state.currentAnalysis,
          progress,
          status: status as any || state.currentAnalysis.status,
        }
      : state.currentAnalysis,
    analysisResults: {
      ...state.analysisResults,
      [analysisId]: state.analysisResults[analysisId]
        ? {
            ...state.analysisResults[analysisId],
            progress,
            status: status as any || state.analysisResults[analysisId].status,
          }
        : state.analysisResults[analysisId],
    },
  })),

  // Data management
  on(GuestActions.clearGuestData, () => ({
    ...initialGuestState,
  })),

  on(GuestActions.resetUsageCount, (state) => ({
    ...state,
    usageCount: 0,
    remainingCount: state.maxUsage,
    isLimited: false,
    feedbackCode: null,
    feedbackCodeStatus: null,
    surveyUrl: null,
    lastUpdated: new Date().toISOString(),
  })),

  on(GuestActions.updateLastActivity, (state) => ({
    ...state,
    lastUpdated: new Date().toISOString(),
  })),

  // Error handling
  on(GuestActions.clearError, (state) => ({
    ...state,
    error: null,
  })),

  on(GuestActions.setError, (state, { error }) => ({
    ...state,
    error,
  })),

  // Loading
  on(GuestActions.setLoading, (state, { isLoading }) => ({
    ...state,
    isLoading,
  }))
);