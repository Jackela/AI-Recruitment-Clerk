/**
 * Analysis State Service
 * Manages shared state for the analysis process using Signals
 */

import { Injectable, signal, computed } from '@angular/core';
import type {
  AnalysisState,
  AnalysisResult,
  ErrorInfo,
  AnalysisStatistics,
} from '../types/analysis.types';

@Injectable({
  providedIn: 'root',
})
export class AnalysisStateService {
  // Core state signals
  public currentState = signal<AnalysisState>('upload');
  public sessionId = signal('');
  public errorMessage = signal('');
  public isSubmitting = signal(false);
  public isProcessingAction = signal(false);
  public isRetrying = signal(false);

  // Analysis result
  public analysisResult = signal<AnalysisResult | null>(null);

  // Statistics signals
  public todayAnalyses = signal(42);
  public totalAnalyses = signal(1247);
  public averageScore = computed(() => 76);

  // Computed statistics object
  public statistics = computed<AnalysisStatistics>(() => ({
    todayAnalyses: this.todayAnalyses(),
    totalAnalyses: this.totalAnalyses(),
    averageScore: this.averageScore(),
    successRate: 95.2,
    monthlyAnalyses: 156,
  }));

  // Error info computed from error message
  public errorInfo = computed<ErrorInfo>(() => ({
    message: this.errorMessage(),
    code: 'ANALYSIS_ERROR',
    timestamp: new Date(),
    recoverable: true,
  }));

  /**
   * Sets the analysis state
   */
  public setState(state: AnalysisState): void {
    this.currentState.set(state);
  }

  /**
   * Sets the session ID
   */
  public setSessionId(id: string): void {
    this.sessionId.set(id);
  }

  /**
   * Sets the error message and transitions to error state
   */
  public setError(message: string): void {
    this.errorMessage.set(message);
    this.currentState.set('error');
  }

  /**
   * Sets the analysis result and transitions to completed state
   */
  public setResult(result: AnalysisResult): void {
    this.analysisResult.set(result);
    this.currentState.set('completed');
  }

  /**
   * Sets submitting state
   */
  public setSubmitting(value: boolean): void {
    this.isSubmitting.set(value);
  }

  /**
   * Sets processing action state
   */
  public setProcessingAction(value: boolean): void {
    this.isProcessingAction.set(value);
  }

  /**
   * Sets retrying state
   */
  public setRetrying(value: boolean): void {
    this.isRetrying.set(value);
  }

  /**
   * Resets all state to initial values
   */
  public reset(): void {
    this.currentState.set('upload');
    this.sessionId.set('');
    this.errorMessage.set('');
    this.isSubmitting.set(false);
    this.isProcessingAction.set(false);
    this.isRetrying.set(false);
    this.analysisResult.set(null);
  }

  /**
   * Starts analysis process
   */
  public startAnalysis(): void {
    this.isSubmitting.set(true);
    this.sessionId.set('');
    this.currentState.set('analyzing');
    this.errorMessage.set('');
  }

  /**
   * Completes analysis process
   */
  public completeAnalysis(): void {
    this.isSubmitting.set(false);
  }

  /**
   * Starts retry process
   */
  public startRetry(): void {
    this.isRetrying.set(true);
    this.currentState.set('upload');
    this.errorMessage.set('');
  }

  /**
   * Completes retry process
   */
  public completeRetry(): void {
    this.isRetrying.set(false);
  }

  /**
   * Loads statistics (async)
   */
  public async loadStatistics(): Promise<void> {
    try {
      // TODO: Replace with real API call when available
      // For now, using mock data
      this.todayAnalyses.set(42);
      this.totalAnalyses.set(1247);
    } catch {
      // Silent fail - statistics are not critical
    }
  }
}
