/**
 * Analysis types for unified analysis module
 */

import type { AnalysisResult as OriginalAnalysisResult } from '../components/analysis-results.component';
import type {
  AnalysisStep as OriginalAnalysisStep,
  ProgressUpdate as OriginalProgressUpdate,
} from '../components/analysis-progress.component';
import type { ErrorInfo as OriginalErrorInfo } from '../components/analysis-error.component';
import type { FileUploadData as OriginalFileUploadData } from '../components/resume-file-upload.component';
import type { UsageStatistics as OriginalUsageStatistics } from '../components/statistics-panel.component';

// Re-export types from existing components
export type AnalysisResult = OriginalAnalysisResult;
export type AnalysisStep = OriginalAnalysisStep;
export type ProgressUpdate = OriginalProgressUpdate;
export type ErrorInfo = OriginalErrorInfo;
export type FileUploadData = OriginalFileUploadData;
export type UsageStatistics = OriginalUsageStatistics;

/**
 * Analysis process state
 */
export type AnalysisState = 'upload' | 'analyzing' | 'completed' | 'error';

/**
 * Analysis session data
 */
export interface AnalysisSession {
  sessionId: string;
  state: AnalysisState;
  steps: AnalysisStep[];
  result: AnalysisResult | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Step configuration
 */
export interface StepConfig {
  id: string;
  title: string;
  description: string;
  order: number;
}

/**
 * Analysis completion event
 */
export interface AnalysisCompletionEvent {
  result?: {
    score?: number;
    summary?: string;
    details?: {
      skills?: string[];
      experience?: string;
      education?: string;
      recommendations?: string[];
    };
    reportUrl?: string;
  };
}

/**
 * Analysis error event
 */
export interface AnalysisErrorEvent {
  error?: {
    message?: string;
  };
  message?: string;
}

/**
 * Step change event
 */
export interface StepChangeEvent {
  step?: string;
  currentStep?: string;
}

/**
 * Result action type
 */
export type ResultActionType =
  | 'view-detailed'
  | 'download-report'
  | 'start-new';

/**
 * Error action type
 */
export type ErrorActionType = 'retry' | 'start-new' | 'contact-support';

/**
 * Result action
 */
export interface ResultAction {
  type: ResultActionType;
  payload?: unknown;
}

/**
 * Error action
 */
export interface ErrorAction {
  type: ErrorActionType;
  payload?: unknown;
}

/**
 * Analysis statistics
 */
export interface AnalysisStatistics {
  todayAnalyses: number;
  totalAnalyses: number;
  averageScore: number;
  successRate: number;
  monthlyAnalyses: number;
}
