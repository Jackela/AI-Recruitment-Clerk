export interface GuestState {
  // Device and authentication
  deviceId: string | null;
  isGuestMode: boolean;
  
  // Usage tracking
  usageCount: number;
  maxUsage: number;
  remainingCount: number;
  isLimited: boolean;
  
  // Feedback system
  feedbackCode: string | null;
  feedbackCodeStatus: 'generated' | 'redeemed' | null;
  surveyUrl: string | null;
  
  // Analysis tracking
  currentAnalysis: {
    analysisId: string | null;
    status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    filename: string | null;
    uploadedAt: string | null;
    estimatedCompletionTime: string | null;
  };
  
  // Analysis results
  analysisResults: {
    [analysisId: string]: {
      analysisId: string;
      status: 'processing' | 'completed' | 'failed';
      progress: number;
      results?: any;
      completedAt?: string;
    };
  };
  
  // UI state
  showFeedbackModal: boolean;
  showLimitModal: boolean;
  showAnalysisResults: boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Last update timestamp
  lastUpdated: string | null;
}

export const initialGuestState: GuestState = {
  deviceId: null,
  isGuestMode: false,
  
  usageCount: 0,
  maxUsage: 5,
  remainingCount: 5,
  isLimited: false,
  
  feedbackCode: null,
  feedbackCodeStatus: null,
  surveyUrl: null,
  
  currentAnalysis: {
    analysisId: null,
    status: 'idle',
    progress: 0,
    filename: null,
    uploadedAt: null,
    estimatedCompletionTime: null,
  },
  
  analysisResults: {},
  
  showFeedbackModal: false,
  showLimitModal: false,
  showAnalysisResults: false,
  
  isLoading: false,
  error: null,
  
  lastUpdated: null,
};