import { createAction, props } from '@ngrx/store';
import {
  GuestUsageResponse,
  GuestStatusResponse,
  FeedbackCodeResponse,
} from '../../services/guest/guest-api.service';

export interface AnalysisData {
  id: string;
  candidateName?: string;
  candidateEmail?: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  results?: unknown;
  metadata?: {
    fileSize?: number;
    fileType?: string;
    [key: string]: unknown;
  };
}

export interface AnalysisResults {
  analysisId: string;
  score: number;
  status: 'completed' | 'failed';
  summary: string;
  skills: string[];
  experience: {
    totalYears: number;
    positions: Array<{
      title: string;
      company: string;
      duration: string;
    }>;
  };
  strengths: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface DemoAnalysisResults {
  demoId: string;
  candidateName: string;
  score: number;
  summary: string;
  skills: string[];
  experience: {
    totalYears: number;
    positions: Array<{
      title: string;
      company: string;
      duration: string;
    }>;
  };
  strengths: string[];
  recommendations: string[];
  isDemo: true;
}

// Device and initialization actions
export const initializeGuest = createAction(
  '[Guest] Initialize Guest Mode',
  props<{ deviceId: string }>(),
);

export const setGuestMode = createAction(
  '[Guest] Set Guest Mode',
  props<{ isGuestMode: boolean }>(),
);

// Usage status actions
export const loadUsageStatus = createAction('[Guest] Load Usage Status');

export const loadUsageStatusSuccess = createAction(
  '[Guest] Load Usage Status Success',
  props<{ usageStatus: GuestUsageResponse }>(),
);

export const loadUsageStatusFailure = createAction(
  '[Guest] Load Usage Status Failure',
  props<{ error: string }>(),
);

// Guest details actions
export const loadGuestDetails = createAction('[Guest] Load Guest Details');

export const loadGuestDetailsSuccess = createAction(
  '[Guest] Load Guest Details Success',
  props<{ guestDetails: GuestStatusResponse }>(),
);

export const loadGuestDetailsFailure = createAction(
  '[Guest] Load Guest Details Failure',
  props<{ error: string }>(),
);

// Usage increment actions
export const incrementUsage = createAction('[Guest] Increment Usage');

export const incrementUsageSuccess = createAction(
  '[Guest] Increment Usage Success',
);

export const incrementUsageFailure = createAction(
  '[Guest] Increment Usage Failure',
  props<{ error: string }>(),
);

// Usage limit actions
export const setLimited = createAction(
  '[Guest] Set Limited',
  props<{ isLimited: boolean; message?: string }>(),
);

export const showLimitModal = createAction('[Guest] Show Limit Modal');

export const hideLimitModal = createAction('[Guest] Hide Limit Modal');

// Feedback code actions
export const generateFeedbackCode = createAction(
  '[Guest] Generate Feedback Code',
);

export const generateFeedbackCodeSuccess = createAction(
  '[Guest] Generate Feedback Code Success',
  props<{ feedbackResponse: FeedbackCodeResponse }>(),
);

export const generateFeedbackCodeFailure = createAction(
  '[Guest] Generate Feedback Code Failure',
  props<{ error: string }>(),
);

export const redeemFeedbackCode = createAction(
  '[Guest] Redeem Feedback Code',
  props<{ feedbackCode: string }>(),
);

export const redeemFeedbackCodeSuccess = createAction(
  '[Guest] Redeem Feedback Code Success',
  props<{ message: string }>(),
);

export const redeemFeedbackCodeFailure = createAction(
  '[Guest] Redeem Feedback Code Failure',
  props<{ error: string }>(),
);

// Feedback modal actions
export const showFeedbackModal = createAction('[Guest] Show Feedback Modal');

export const hideFeedbackModal = createAction('[Guest] Hide Feedback Modal');

// Resume analysis actions
export const uploadResume = createAction(
  '[Guest] Upload Resume',
  props<{
    file: File;
    candidateName?: string;
    candidateEmail?: string;
    notes?: string;
  }>(),
);

export const uploadResumeSuccess = createAction(
  '[Guest] Upload Resume Success',
  props<{ analysisData: AnalysisData }>(),
);

export const uploadResumeFailure = createAction(
  '[Guest] Upload Resume Failure',
  props<{ error: string }>(),
);

export const loadAnalysisResults = createAction(
  '[Guest] Load Analysis Results',
  props<{ analysisId: string }>(),
);

export const loadAnalysisResultsSuccess = createAction(
  '[Guest] Load Analysis Results Success',
  props<{ analysisResults: AnalysisResults }>(),
);

export const loadAnalysisResultsFailure = createAction(
  '[Guest] Load Analysis Results Failure',
  props<{ error: string }>(),
);

export const loadDemoAnalysis = createAction('[Guest] Load Demo Analysis');

export const loadDemoAnalysisSuccess = createAction(
  '[Guest] Load Demo Analysis Success',
  props<{ demoResults: DemoAnalysisResults }>(),
);

export const loadDemoAnalysisFailure = createAction(
  '[Guest] Load Demo Analysis Failure',
  props<{ error: string }>(),
);

// Analysis UI actions
export const showAnalysisResults = createAction(
  '[Guest] Show Analysis Results',
);

export const hideAnalysisResults = createAction(
  '[Guest] Hide Analysis Results',
);

export const updateAnalysisProgress = createAction(
  '[Guest] Update Analysis Progress',
  props<{ analysisId: string; progress: number; status?: string }>(),
);

// Data management actions
export const clearGuestData = createAction('[Guest] Clear Guest Data');

export const resetUsageCount = createAction('[Guest] Reset Usage Count');

export const updateLastActivity = createAction('[Guest] Update Last Activity');

// Error handling actions
export const clearError = createAction('[Guest] Clear Error');

export const setError = createAction(
  '[Guest] Set Error',
  props<{ error: string }>(),
);

// Loading actions
export const setLoading = createAction(
  '[Guest] Set Loading',
  props<{ isLoading: boolean }>(),
);
