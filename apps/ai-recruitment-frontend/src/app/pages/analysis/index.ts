/**
 * Analysis Module Public API
 * Central export point for analysis module
 */

// Services
export { AnalysisStateService } from './services/analysis-state.service';
export { AnalysisStepsService } from './services/analysis-steps.service';
export { AnalysisFlowService } from './services/analysis-flow.service';

// Components
export { AnalysisStepContainerComponent } from './components/analysis-step-container/analysis-step-container.component';
export { AnalysisStepUploadComponent } from './components/analysis-step-upload/analysis-step-upload.component';
export { AnalysisStepProcessingComponent } from './components/analysis-step-processing/analysis-step-processing.component';
export { AnalysisStepResultsComponent } from './components/analysis-step-results/analysis-step-results.component';
export { AnalysisStepErrorComponent } from './components/analysis-step-error/analysis-step-error.component';

// Types
export type {
  AnalysisState,
  AnalysisSession,
  AnalysisResult,
  AnalysisStep,
  ErrorInfo,
  FileUploadData,
  UsageStatistics,
  ProgressUpdate,
  ResultAction,
  ErrorAction,
  ResultActionType,
  ErrorActionType,
  AnalysisStatistics,
  AnalysisCompletionEvent,
  AnalysisErrorEvent,
  StepChangeEvent,
  StepConfig,
} from './types/analysis.types';

// Utils
export {
  normalizeScore,
  normalizeString,
  normalizeStringArray,
  normalizeUrl,
  mapStepNameToId,
  formatNumber,
  formatTimestamp,
  getScoreCategory,
  getScoreClass,
  getPriorityLabel,
  getPriorityClass,
  STEP_NAME_MAP,
} from './utils/analysis.utils';

// Main Component
export { UnifiedAnalysisComponent } from './unified-analysis.component';
