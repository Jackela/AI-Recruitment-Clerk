/**
 * Analysis Flow Service
 * Manages the analysis flow logic and orchestration
 */

import { Injectable, inject } from '@angular/core';
import { GuestApiService } from '../../../services/guest/guest-api.service';
import { WebSocketService } from '../../../services/websocket.service';
import { ToastService } from '../../../services/toast.service';
import { AnalysisStateService } from './analysis-state.service';
import { AnalysisStepsService } from './analysis-steps.service';
import {
  normalizeScore,
  normalizeString,
  normalizeStringArray,
  normalizeUrl,
} from '../utils/analysis.utils';
import { FileUploadData, AnalysisResult } from '../types/analysis.types';

@Injectable()
export class AnalysisFlowService {
  private readonly state = inject(AnalysisStateService);
  private readonly steps = inject(AnalysisStepsService);
  private readonly guestApi = inject(GuestApiService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly toastService = inject(ToastService);

  /**
   * Starts the analysis process
   */
  public async startAnalysis(uploadData: FileUploadData): Promise<void> {
    this.state.startAnalysis();
    this.steps.resetSteps();
    this.steps.updateStepStatus('upload', 'active');

    try {
      const response = await this.guestApi
        .analyzeResume(
          uploadData.file,
          uploadData.candidateInfo.name,
          uploadData.candidateInfo.email,
          uploadData.candidateInfo.notes,
        )
        .toPromise();

      const sessionId = response?.data?.analysisId || '';
      if (!sessionId) {
        const errorMessage = '未能创建分析会话，请稍后重试';
        this.toastService.error(errorMessage);
        this.state.setError(errorMessage);
        return;
      }

      this.state.setSessionId(sessionId);
      this.steps.updateStepStatus('upload', 'completed');
      this.steps.updateStepStatus('parse', 'active');
      this.state.completeAnalysis();
    } catch (error) {
      this.handleAnalysisError(error);
      this.state.completeAnalysis();
    }
  }

  /**
   * Starts the demo analysis
   */
  public startDemo(): void {
    this.state.setSubmitting(true);
    this.state.setState('analyzing');
    this.steps.resetSteps();

    const demoSessionId = `demo_${Date.now()}`;
    this.state.setSessionId(demoSessionId);

    this.guestApi.getDemoAnalysis().subscribe({
      next: () => {
        this.steps.updateStepStatus('upload', 'active');
        setTimeout(() => {
          this.webSocketService.connect(demoSessionId).subscribe();
        }, 500);
        this.state.setSubmitting(false);
      },
      error: (error) => {
        this.handleAnalysisError(error);
        this.state.setSubmitting(false);
      },
    });
  }

  /**
   * Handles analysis completion
   */
  public handleAnalysisCompleted(
    completion: import('../../../services/websocket.service').CompletionData,
  ): void {
    this.steps.markAllCompleted();

    const result =
      completion?.result ??
      ({} as import('../../../services/websocket.service').AnalysisResult);

    const analysisResult: AnalysisResult = {
      score: normalizeScore(result.score, 0),
      summary: normalizeString(result.summary, '分析已完成，但暂无摘要可显示'),
      keySkills: normalizeStringArray(result.skills),
      experience: normalizeString(
        result.experience?.totalYears?.toString() ?? '',
        '',
      ),
      education: '',
      recommendations: normalizeStringArray(result.recommendations),
      reportUrl: normalizeUrl(result.reportUrl),
    };

    this.state.setResult(analysisResult);
  }

  /**
   * Handles analysis error
   */
  public handleAnalysisError(
    error: import('../../../services/websocket.service').ErrorData,
  ): void {
    const errorMsg = error?.error || error?.message || '分析过程中发生未知错误';
    this.state.setError(errorMsg);
    this.steps.markCurrentStepError();
  }

  /**
   * Cancels the current analysis
   */
  public cancelAnalysis(): void {
    this.webSocketService.disconnect();
    this.resetAnalysis();
  }

  /**
   * Retries the analysis
   */
  public retryAnalysis(): void {
    this.state.startRetry();
    this.steps.resetSteps();
    setTimeout(() => this.state.completeRetry(), 1000);
  }

  /**
   * Resets the analysis to initial state
   */
  public resetAnalysis(): void {
    this.state.reset();
    this.steps.resetSteps();
  }
}
