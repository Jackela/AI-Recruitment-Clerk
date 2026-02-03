import type {
  OnDestroy,
  AfterViewInit} from '@angular/core';
import {
  Component,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
// Child Components
import type {
  FileUploadData} from './components/resume-file-upload.component';
import {
  ResumeFileUploadComponent
} from './components/resume-file-upload.component';
import type {
  AnalysisStep,
  ProgressUpdate} from './components/analysis-progress.component';
import {
  AnalysisProgressComponent
} from './components/analysis-progress.component';
import type {
  AnalysisResult,
  ResultAction} from './components/analysis-results.component';
import {
  AnalysisResultsComponent
} from './components/analysis-results.component';
import type {
  ErrorAction,
  ErrorInfo} from './components/analysis-error.component';
import {
  AnalysisErrorComponent
} from './components/analysis-error.component';
import type {
  UsageStatistics} from './components/statistics-panel.component';
import {
  StatisticsPanelComponent
} from './components/statistics-panel.component';
// Services
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';

// Re-export types for backwards compatibility
export type { AnalysisStep } from './components/analysis-progress.component';
export type { AnalysisResult } from './components/analysis-results.component';
export type { FileUploadData } from './components/resume-file-upload.component';
export type { UsageStatistics } from './components/statistics-panel.component';

// Internal interfaces
interface AnalysisCompletionEvent {
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

interface AnalysisErrorEvent {
  error?: {
    message?: string;
  };
  message?: string;
}

interface StepChangeEvent {
  step?: string;
  currentStep?: string;
}

/**
 * Represents the unified analysis component.
 */
@Component({
  selector: 'arc-unified-analysis',
  standalone: true,
  imports: [
    CommonModule,
    ResumeFileUploadComponent,
    AnalysisProgressComponent,
    AnalysisResultsComponent,
    AnalysisErrorComponent,
    StatisticsPanelComponent,
  ],
  template: `
    <div class="analysis-container">
      <!-- Header Section -->
      <div class="header-section">
        <h1>AI智能简历分析</h1>
        <p class="subtitle">上传简历，获得专业的AI驱动分析报告</p>
      </div>

      <!-- Main Content Grid -->
      <div
        class="content-grid"
        [class.analysis-mode]="currentState() !== 'upload'"
      >
        <!-- Upload Section -->
        <arc-resume-file-upload
          *ngIf="currentState() === 'upload'"
          [isSubmitting]="isSubmitting()"
          (fileSubmitted)="onFileSubmitted($event)"
          (demoRequested)="onDemoRequested()"
          (fileValidationError)="onFileValidationError($event)"
        >
        </arc-resume-file-upload>

        <!-- Analysis Progress Section -->
        <arc-analysis-progress
          *ngIf="currentState() === 'analyzing'"
          [sessionId]="sessionId()"
          [showMessageLog]="true"
          [steps]="analysisSteps()"
          (progressUpdate)="onProgressUpdate($event)"
          (stepChange)="onStepChange($event)"
          (analysisCompleted)="onAnalysisCompleted($event)"
          (analysisError)="onAnalysisError($event)"
          (cancelRequested)="onAnalysisCancelled()"
        >
        </arc-analysis-progress>

        <!-- Results Section -->
        <arc-analysis-results
          *ngIf="currentState() === 'completed'"
          [result]="analysisResult()"
          [showDetailedSummary]="false"
          [isProcessing]="isProcessingAction()"
          (actionRequested)="onResultAction($event)"
        >
        </arc-analysis-results>

        <!-- Error Section -->
        <arc-analysis-error
          *ngIf="currentState() === 'error'"
          [errorInfo]="getErrorInfo()"
          [showDetails]="true"
          [isRetrying]="isRetrying()"
          (actionRequested)="onErrorAction($event)"
          (errorReported)="onErrorReported($event)"
        >
        </arc-analysis-error>
      </div>

      <!-- Side Panel (Statistics & Tips) -->
      <arc-statistics-panel
        *ngIf="currentState() === 'upload'"
        [statistics]="getUsageStatistics()"
        [showDailyLimit]="false"
        [showInsights]="true"
        (tipCategoryChanged)="onTipCategoryChanged($event)"
        (moreTipsRequested)="onMoreTipsRequested()"
      >
      </arc-statistics-panel>
    </div>
  `,
  styleUrls: ['./unified-analysis.component.css'],
})
export class UnifiedAnalysisComponent implements OnDestroy, AfterViewInit {
  // Component State
  public currentState = signal<'upload' | 'analyzing' | 'completed' | 'error'>(
    'upload',
  );
  public sessionId = signal('');
  public errorMessage = signal('');
  public isSubmitting = signal(false);
  public isProcessingAction = signal(false);
  public isRetrying = signal(false);

  // Analysis State
  public analysisSteps = signal<AnalysisStep[]>([
    {
      id: 'upload',
      title: '文件上传',
      description: '上传并验证简历文件',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'parse',
      title: '解析简历',
      description: '提取文本和结构化信息',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'extract',
      title: '信息提取',
      description: '识别关键技能和经验',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'analyze',
      title: '智能分析',
      description: 'AI算法分析和评估',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'report',
      title: '生成报告',
      description: '创建详细分析报告',
      status: 'pending',
      progress: 0,
    },
  ]);

  public analysisResult = signal<AnalysisResult | null>(null);

  private normalizeScore(value: unknown, fallback = 0): number {
    const numeric =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(0, Math.min(100, numeric));
  }

  private normalizeString(value: unknown, fallback = ''): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private normalizeUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
       
      new URL(trimmed);
      return trimmed;
    } catch {
      return undefined;
    }
  }

  // Statistics (will be replaced with real API data)
  public todayAnalyses = signal(42);
  public totalAnalyses = signal(1247);
  public averageScore = computed(() => 76);

  private readonly destroy$ = new Subject<void>();

  private readonly guestApi = inject(GuestApiService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  /**
   * Performs the ng after view init operation.
   */
  public ngAfterViewInit(): void {
    // Load real statistics from API
    this.loadStatistics();
  }

  // Child Component Event Handlers
  /**
   * Performs the on file submitted operation.
   * @param uploadData - The upload data.
   */
  public onFileSubmitted(uploadData: FileUploadData): void {
    this.startAnalysis(uploadData);
  }

  /**
   * Performs the on demo requested operation.
   */
  public onDemoRequested(): void {
    this.startDemo();
  }

  /**
   * Performs the on file validation error operation.
   * @param errorMessage - The error message.
   */
  public onFileValidationError(errorMessage: string): void {
    this.errorMessage.set(errorMessage);
    this.currentState.set('error');
  }

  /**
   * Performs the on progress update operation.
   * @param update - The update.
   */
  public onProgressUpdate(update: ProgressUpdate): void {
    this.updateAnalysisProgress(update.currentStep, update.progress);
  }

  /**
   * Performs the on step change operation.
   * @param stepName - The step name.
   */
  public onStepChange(stepName: string): void {
    this.handleStepChange({ step: stepName });
  }

  /**
   * Performs the on analysis completed operation.
   * @param completion - The completion.
   */
  public onAnalysisCompleted(completion: AnalysisCompletionEvent): void {
    this.handleAnalysisCompletion(completion);
  }

  /**
   * Performs the on analysis error operation.
   * @param error - The error.
   */
  public onAnalysisError(error: AnalysisErrorEvent): void {
    this.handleAnalysisError(error);
  }

  /**
   * Performs the on analysis cancelled operation.
   */
  public onAnalysisCancelled(): void {
    this.cancelAnalysis();
  }

  /**
   * Performs the on result action operation.
   * @param action - The action.
   */
  public onResultAction(action: ResultAction): void {
    switch (action.type) {
      case 'view-detailed':
        this.viewDetailedResults();
        break;
      case 'download-report':
        this.downloadReport();
        break;
      case 'start-new':
        this.startNewAnalysis();
        break;
    }
  }

  /**
   * Performs the on error action operation.
   * @param action - The action.
   */
  public onErrorAction(action: ErrorAction): void {
    switch (action.type) {
      case 'retry':
        this.retryAnalysis();
        break;
      case 'start-new':
        this.startNewAnalysis();
        break;
      case 'contact-support':
        this.contactSupport();
        break;
    }
  }

  /**
   * Performs the on error reported operation.
   * @param _errorInfo - The error info.
   */
  public onErrorReported(_errorInfo: ErrorInfo): void {
    this.toastService.success('错误报告已发送，感谢您的反馈');
  }

  /**
   * Performs the on tip category changed operation.
   * @param _category - The category.
   */
  public onTipCategoryChanged(_category: string): void {
    // Handle tip category changes if needed
  }

  /**
   * Performs the on more tips requested operation.
   */
  public onMoreTipsRequested(): void {
    // Load more tips if needed
  }

  // File Upload Methods - now handled by child component

  // Analysis Methods
  private async startAnalysis(uploadData: FileUploadData): Promise<void> {
    this.isSubmitting.set(true);
    this.sessionId.set('');
    this.currentState.set('analyzing');
    this.resetAnalysisSteps();
    this.updateStepStatus('upload', 'active');

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
        this.handleAnalysisError({ message: errorMessage });
        return;
      }

      this.sessionId.set(sessionId);
      this.updateStepStatus('upload', 'completed');
      this.updateStepStatus('parse', 'active');
    } catch (error) {
      this.handleAnalysisError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private startDemo(): void {
    this.isSubmitting.set(true);
    this.currentState.set('analyzing');
    this.resetAnalysisSteps();

    // Generate demo session ID
    const demoSessionId = `demo_${Date.now()}`;
    this.sessionId.set(demoSessionId);

    // Start demo progress simulation
    this.guestApi.getDemoAnalysis().subscribe({
      next: () => {
        this.updateStepStatus('upload', 'active');

        // Trigger demo WebSocket events
        setTimeout(() => {
          this.webSocketService.connect(demoSessionId).subscribe();
        }, 500);

        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.handleAnalysisError(error);
        this.isSubmitting.set(false);
      },
    });
  }

  // WebSocket listeners are now handled by child components

  private updateAnalysisProgress(stepName: string, progress: number): void {
    // Map step names to step IDs
    const stepMap: Record<string, string> = {
      上传文件: 'upload',
      解析简历: 'parse',
      提取关键信息: 'extract',
      智能分析: 'analyze',
      生成报告: 'report',
    };

    const stepId = stepMap[stepName] || stepName.toLowerCase();

    const steps = this.analysisSteps();
    const updatedSteps = steps.map((step) => {
      if (step.id === stepId) {
        return { ...step, progress, status: 'active' as const };
      }
      return step;
    });

    this.analysisSteps.set(updatedSteps);
  }

  private handleStepChange(stepData: StepChangeEvent): void {
    const stepName = stepData.step || stepData.currentStep;
    if (stepName) {
      // Mark previous steps as completed and current as active
      this.updateStepProgression(stepName);
    }
  }

  private updateStepProgression(currentStepName: string): void {
    const stepMap: Record<string, string> = {
      上传文件: 'upload',
      解析简历: 'parse',
      提取关键信息: 'extract',
      智能分析: 'analyze',
      生成报告: 'report',
    };

    const currentStepId =
      stepMap[currentStepName] || currentStepName.toLowerCase();
    const steps = this.analysisSteps();
    const currentIndex = steps.findIndex((step) => step.id === currentStepId);

    const updatedSteps = steps.map((step, index) => {
      if (index < currentIndex) {
        return { ...step, status: 'completed' as const, progress: 100 };
      } else if (index === currentIndex) {
        return { ...step, status: 'active' as const, progress: 0 };
      }
      return step;
    });

    this.analysisSteps.set(updatedSteps);
  }

  private handleAnalysisCompletion(completion: AnalysisCompletionEvent): void {
    // Mark all steps as completed
    const steps = this.analysisSteps();
    const completedSteps = steps.map((step) => ({
      ...step,
      status: 'completed' as const,
      progress: 100,
    }));
    this.analysisSteps.set(completedSteps);

    // Set analysis result
    const result = completion.result ?? {};
    const details = result.details ?? {};

    this.analysisResult.set({
      score: this.normalizeScore(result.score, 0),
      summary: this.normalizeString(
        result.summary,
        '分析已完成，但暂无摘要可显示',
      ),
      keySkills: this.normalizeStringArray(details.skills),
      experience: this.normalizeString(details.experience, ''),
      education: this.normalizeString(details.education, ''),
      recommendations: this.normalizeStringArray(details.recommendations),
      reportUrl: this.normalizeUrl(result.reportUrl),
    });

    this.currentState.set('completed');
  }

  private handleAnalysisError(error: AnalysisErrorEvent): void {
    const errorMsg =
      error?.error?.message || error?.message || '分析过程中发生未知错误';
    this.errorMessage.set(errorMsg);
    this.currentState.set('error');

    // Mark current active step as error
    const steps = this.analysisSteps();
    const updatedSteps = steps.map((step) => {
      if (step.status === 'active') {
        return { ...step, status: 'error' as const };
      }
      return step;
    });
    this.analysisSteps.set(updatedSteps);
  }

  // UI Helper Methods
  private resetAnalysisSteps(): void {
    const defaultSteps: AnalysisStep[] = [
      {
        id: 'upload',
        title: '文件上传',
        description: '上传并验证简历文件',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'parse',
        title: '解析简历',
        description: '提取文本和结构化信息',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'extract',
        title: '信息提取',
        description: '识别关键技能和经验',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'analyze',
        title: '智能分析',
        description: 'AI算法分析和评估',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'report',
        title: '生成报告',
        description: '创建详细分析报告',
        status: 'pending',
        progress: 0,
      },
    ];
    this.analysisSteps.set(defaultSteps);
  }

  private updateStepStatus(
    stepId: string,
    status: AnalysisStep['status'],
  ): void {
    const steps = this.analysisSteps();
    const updatedSteps = steps.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          status,
          progress: status === 'completed' ? 100 : step.progress,
        };
      }
      return step;
    });
    this.analysisSteps.set(updatedSteps);
  }

  // Helper Methods
  /**
   * Retrieves error info.
   * @returns The ErrorInfo.
   */
  public getErrorInfo(): ErrorInfo {
    return {
      message: this.errorMessage(),
      code: 'ANALYSIS_ERROR',
      timestamp: new Date(),
      recoverable: true,
    };
  }

  /**
   * Retrieves usage statistics.
   * @returns The UsageStatistics.
   */
  public getUsageStatistics(): UsageStatistics {
    return {
      todayAnalyses: this.todayAnalyses(),
      totalAnalyses: this.totalAnalyses(),
      averageScore: this.averageScore(),
      successRate: 95.2,
      monthlyAnalyses: 156,
    };
  }

  // Action Methods
  private cancelAnalysis(): void {
    this.webSocketService.disconnect();
    this.currentState.set('upload');
    this.resetAnalysisSteps();
    this.sessionId.set('');
    this.isSubmitting.set(false);
  }

  private retryAnalysis(): void {
    this.isRetrying.set(true);
    this.currentState.set('upload');
    this.errorMessage.set('');
    this.resetAnalysisSteps();

    setTimeout(() => {
      this.isRetrying.set(false);
    }, 1000);
  }

  private startNewAnalysis(): void {
    this.analysisResult.set(null);
    this.currentState.set('upload');
    this.resetAnalysisSteps();
    this.sessionId.set('');
    this.errorMessage.set('');
    this.isSubmitting.set(false);
    this.isProcessingAction.set(false);
    this.isRetrying.set(false);
  }

  private contactSupport(): void {
    this.toastService.info('正在为您转接客户支持...');
  }

  private viewDetailedResults(): void {
    this.isProcessingAction.set(true);

    const sessionId = this.sessionId();
    if (sessionId) {
      this.router.navigate(['/results', sessionId]).finally(() => {
        this.isProcessingAction.set(false);
      });
    } else {
      this.isProcessingAction.set(false);
    }
  }

  private downloadReport(): void {
    this.isProcessingAction.set(true);

    const reportUrl = this.analysisResult()?.reportUrl;
    if (reportUrl) {
      window.open(reportUrl, '_blank');
      this.toastService.success('报告下载已开始');
    } else {
      this.toastService.error('报告链接不可用');
    }

    setTimeout(() => {
      this.isProcessingAction.set(false);
    }, 1000);
  }

  private async loadStatistics(): Promise<void> {
    try {
      // TODO: Replace with real API call
      // const stats = await this.guestApi.getStatistics().toPromise();
      // this.todayAnalyses.set(stats.todayAnalyses);
      // this.totalAnalyses.set(stats.totalAnalyses);

      // For now, using mock data
      this.todayAnalyses.set(42);
      this.totalAnalyses.set(1247);
    } catch {
      // Silent fail - statistics are not critical
    }
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }
}
