import type { OnDestroy, AfterViewInit } from '@angular/core';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';

// Step Components
import { AnalysisStepContainerComponent } from './components/analysis-step-container/analysis-step-container.component';
import { AnalysisStepUploadComponent } from './components/analysis-step-upload/analysis-step-upload.component';
import { AnalysisStepProcessingComponent } from './components/analysis-step-processing/analysis-step-processing.component';
import { AnalysisStepResultsComponent } from './components/analysis-step-results/analysis-step-results.component';
import { AnalysisStepErrorComponent } from './components/analysis-step-error/analysis-step-error.component';
import { StatisticsPanelComponent } from './components/statistics-panel.component';

// Services
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { AnalysisStateService } from './services/analysis-state.service';
import { AnalysisStepsService } from './services/analysis-steps.service';
import { AnalysisFlowService } from './services/analysis-flow.service';

// Types
import type {
  AnalysisStep,
  ErrorInfo,
  FileUploadData,
  ResultAction,
  ErrorAction,
  ProgressUpdate,
  UsageStatistics,
} from './types/analysis.types';
import {
  normalizeScore,
  normalizeString,
  normalizeStringArray,
  normalizeUrl,
} from './utils/analysis.utils';

/**
 * Unified Analysis Component - Refactored
 * Orchestrates the analysis flow using step-based architecture
 */
@Component({
  selector: 'arc-unified-analysis',
  standalone: true,
  imports: [
    CommonModule,
    AnalysisStepContainerComponent,
    AnalysisStepUploadComponent,
    AnalysisStepProcessingComponent,
    AnalysisStepResultsComponent,
    AnalysisStepErrorComponent,
    StatisticsPanelComponent,
  ],
  providers: [AnalysisFlowService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="analysis-container">
      <div class="header-section">
        <h1>AI智能简历分析</h1>
        <p class="subtitle">上传简历，获得专业的AI驱动分析报告</p>
      </div>

      <div
        class="content-grid"
        [class.analysis-mode]="state.currentState() !== 'upload'"
      >
        <arc-analysis-step-container [currentState]="state.currentState()">
          <arc-analysis-step-upload
            *ngIf="state.currentState() === 'upload'"
            [isSubmitting]="state.isSubmitting()"
            (fileSubmitted)="flow.startAnalysis($event)"
            (demoRequested)="flow.startDemo()"
            (fileValidationError)="state.setError($event)"
          />

          <arc-analysis-step-processing
            *ngIf="state.currentState() === 'analyzing'"
            [sessionId]="state.sessionId()"
            [steps]="steps.analysisSteps()"
            (progressUpdate)="handleProgressUpdate($event)"
            (stepChange)="steps.updateStepProgression($event)"
            (analysisCompleted)="flow.handleAnalysisCompleted($event)"
            (analysisError)="flow.handleAnalysisError($event)"
            (cancelRequested)="flow.cancelAnalysis()"
          />

          <arc-analysis-step-results
            *ngIf="state.currentState() === 'completed'"
            [result]="state.analysisResult()"
            [isProcessing]="state.isProcessingAction()"
            (actionRequested)="handleResultAction($event)"
          />

          <arc-analysis-step-error
            *ngIf="state.currentState() === 'error'"
            [errorInfo]="state.errorInfo()"
            [isRetrying]="state.isRetrying()"
            (actionRequested)="handleErrorAction($event)"
            (errorReported)="toast.success('错误报告已发送，感谢您的反馈')"
          />
        </arc-analysis-step-container>
      </div>

      <arc-statistics-panel
        *ngIf="state.currentState() === 'upload'"
        [statistics]="state.statistics()"
        [showDailyLimit]="false"
        [showInsights]="true"
      />
    </div>
  `,
  styleUrls: ['./unified-analysis.component.css'],
})
export class UnifiedAnalysisComponent implements OnDestroy, AfterViewInit {
  public readonly state = inject(AnalysisStateService);
  public readonly steps = inject(AnalysisStepsService);
  public readonly flow = inject(AnalysisFlowService);
  public readonly toast = inject(ToastService);
  public readonly currentState = this.state.currentState;
  public readonly sessionId = this.state.sessionId;
  public readonly errorMessage = this.state.errorMessage;
  public readonly isSubmitting = this.state.isSubmitting;
  public readonly isProcessingAction = this.state.isProcessingAction;
  public readonly isRetrying = this.state.isRetrying;
  public readonly analysisResult = this.state.analysisResult;
  public readonly todayAnalyses = this.state.todayAnalyses;
  public readonly totalAnalyses = this.state.totalAnalyses;
  public readonly averageScore = this.state.averageScore;
  public readonly analysisSteps = this.steps.analysisSteps;

  private readonly router = inject(Router);
  private readonly webSocketService = inject(WebSocketService);
  private readonly destroy$ = new Subject<void>();

  public ngAfterViewInit(): void {
    this.state.loadStatistics();
  }

  public handleProgressUpdate(update: ProgressUpdate): void {
    this.steps.updateAnalysisProgress(update.currentStep, update.progress);
  }

  public handleResultAction(action: ResultAction): void {
    switch(action.type) {
      case 'view-detailed':
        this.state.setProcessingAction(true);
        this.router
          .navigate(['/results', this.state.sessionId()])
          .finally(() => this.state.setProcessingAction(false));
        break;
      case 'download-report':
        this.downloadReport();
        break;
      case 'start-new':
        this.flow.resetAnalysis();
        break;
    }
  }

  public handleErrorAction(action: ErrorAction): void {
    switch(action.type) {
      case 'retry':
        this.flow.retryAnalysis();
        break;
      case 'start-new':
        this.flow.resetAnalysis();
        break;
      case 'contact-support':
        this.toast.info('正在为您转接客户支持...');
        break;
    }
  }

  public onFileSubmitted(uploadData: FileUploadData): void {
    void this.flow.startAnalysis(uploadData);
  }

  public startAnalysis(uploadData: FileUploadData): Promise<void> {
    return this.flow.startAnalysis(uploadData);
  }

  public onFileValidationError(message: string): void {
    this.state.setError(message);
  }

  public onDemoRequested(): void {
    this.flow.startDemo();
  }

  public updateStepStatus(
    stepId: string,
    status: AnalysisStep['status'],
  ): void {
    this.steps.updateStepStatus(stepId, status);
  }

  public resetAnalysisSteps(): void {
    this.steps.resetSteps();
  }

  public updateStepProgression(stepName: string): void {
    this.steps.updateStepProgression(stepName);
  }

  public onResultAction(action: ResultAction): void {
    this.handleResultAction(action);
  }

  public onErrorAction(action: ErrorAction): void {
    this.handleErrorAction(action);
  }

  public onErrorReported(_errorInfo: ErrorInfo): void {
    this.toast.success('错误报告已发送，感谢您的反馈');
  }

  public getErrorInfo(): ErrorInfo {
    return this.state.errorInfo();
  }

  public getUsageStatistics(): UsageStatistics {
    return this.state.statistics();
  }

  private downloadReport(): void {
    this.state.setProcessingAction(true);
    const reportUrl =
      this.state.analysisResult()?.reportUrl ??
      `/api/reports/${this.state.sessionId()}/download?format=pdf`;
    if (reportUrl) {
      window.open(reportUrl, '_blank');
      this.toast.success('报告下载已开始');
    } else {
      this.toast.error('报告链接不可用');
    }
    setTimeout(() => this.state.setProcessingAction(false), 1000);
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  public normalizeScore(value: unknown): number {
    return normalizeScore(value, 0);
  }

  public normalizeString(value: unknown): string {
    return normalizeString(value, '');
  }

  public normalizeStringArray(value: unknown): string[] {
    return normalizeStringArray(value);
  }

  public normalizeUrl(value: unknown): string | undefined {
    return normalizeUrl(value);
  }
}
