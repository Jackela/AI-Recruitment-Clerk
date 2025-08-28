import { Component, signal, OnDestroy, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
// Child Components
import { ResumeFileUploadComponent, FileUploadData } from './components/resume-file-upload.component';
import { AnalysisProgressComponent, AnalysisStep, ProgressUpdate } from './components/analysis-progress.component';
import { AnalysisResultsComponent, AnalysisResult, ResultAction } from './components/analysis-results.component';
import { AnalysisErrorComponent, ErrorAction, ErrorInfo } from './components/analysis-error.component';
import { StatisticsPanelComponent, UsageStatistics } from './components/statistics-panel.component';
// Services
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';

// Re-export types for backwards compatibility
export type { AnalysisStep } from './components/analysis-progress.component';
export type { AnalysisResult } from './components/analysis-results.component';
export type { FileUploadData } from './components/resume-file-upload.component';
export type { UsageStatistics } from './components/statistics-panel.component';

@Component({
  selector: 'arc-unified-analysis',
  standalone: true,
  imports: [
    CommonModule,
    ResumeFileUploadComponent,
    AnalysisProgressComponent, 
    AnalysisResultsComponent,
    AnalysisErrorComponent,
    StatisticsPanelComponent
  ],
  template: `
    <div class="analysis-container">
      
      <!-- Header Section -->
      <div class="header-section">
        <h1>AI智能简历分析</h1>
        <p class="subtitle">上传简历，获得专业的AI驱动分析报告</p>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid" [class.analysis-mode]="currentState() !== 'upload'">
        
        <!-- Upload Section -->
        <arc-resume-file-upload 
          *ngIf="currentState() === 'upload'"
          [isSubmitting]="isSubmitting()"
          (fileSubmitted)="onFileSubmitted($event)"
          (demoRequested)="onDemoRequested()"
          (fileValidationError)="onFileValidationError($event)">
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
          (cancelRequested)="onAnalysisCancelled()">
        </arc-analysis-progress>

        <!-- Results Section -->
        <arc-analysis-results
          *ngIf="currentState() === 'completed'"
          [result]="analysisResult()"
          [showDetailedSummary]="false"
          [isProcessing]="isProcessingAction()"
          (actionRequested)="onResultAction($event)">
        </arc-analysis-results>

        <!-- Error Section -->
        <arc-analysis-error
          *ngIf="currentState() === 'error'"
          [errorInfo]="getErrorInfo()"
          [showDetails]="true"
          [isRetrying]="isRetrying()"
          (actionRequested)="onErrorAction($event)"
          (errorReported)="onErrorReported($event)">
        </arc-analysis-error>

      </div>

      <!-- Side Panel (Statistics & Tips) -->
      <arc-statistics-panel
        *ngIf="currentState() === 'upload'"
        [statistics]="getUsageStatistics()"
        [showDailyLimit]="false"
        [showInsights]="true"
        (tipCategoryChanged)="onTipCategoryChanged($event)"
        (moreTipsRequested)="onMoreTipsRequested()">
      </arc-statistics-panel>

    </div>
  `,
  styleUrls: ['./unified-analysis.component.css']
})
export class UnifiedAnalysisComponent implements OnDestroy, AfterViewInit {
  // Component State
  currentState = signal<'upload' | 'analyzing' | 'completed' | 'error'>('upload');
  sessionId = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);
  isProcessingAction = signal(false);
  isRetrying = signal(false);

  // Analysis State
  analysisSteps = signal<AnalysisStep[]>([
    { id: 'upload', title: '文件上传', description: '上传并验证简历文件', status: 'pending', progress: 0 },
    { id: 'parse', title: '解析简历', description: '提取文本和结构化信息', status: 'pending', progress: 0 },
    { id: 'extract', title: '信息提取', description: '识别关键技能和经验', status: 'pending', progress: 0 },
    { id: 'analyze', title: '智能分析', description: 'AI算法分析和评估', status: 'pending', progress: 0 },
    { id: 'report', title: '生成报告', description: '创建详细分析报告', status: 'pending', progress: 0 }
  ]);

  analysisResult = signal<AnalysisResult | null>(null);

  // Statistics (will be replaced with real API data)
  todayAnalyses = signal(42);
  totalAnalyses = signal(1247);
  averageScore = computed(() => 76);

  private destroy$ = new Subject<void>();

  constructor(
    private readonly guestApi: GuestApiService,
    private readonly webSocketService: WebSocketService,
    private readonly router: Router,
    private readonly toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    // Load real statistics from API
    this.loadStatistics();
  }

  // Child Component Event Handlers
  onFileSubmitted(uploadData: FileUploadData): void {
    this.startAnalysis(uploadData);
  }

  onDemoRequested(): void {
    this.startDemo();
  }

  onFileValidationError(errorMessage: string): void {
    this.errorMessage.set(errorMessage);
    this.currentState.set('error');
  }

  onProgressUpdate(update: ProgressUpdate): void {
    this.updateAnalysisProgress(update.currentStep, update.progress);
  }

  onStepChange(stepName: string): void {
    this.handleStepChange({ step: stepName });
  }

  onAnalysisCompleted(completion: any): void {
    this.handleAnalysisCompletion(completion);
  }

  onAnalysisError(error: any): void {
    this.handleAnalysisError(error);
  }

  onAnalysisCancelled(): void {
    this.cancelAnalysis();
  }

  onResultAction(action: ResultAction): void {
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

  onErrorAction(action: ErrorAction): void {
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

  onErrorReported(_errorInfo: ErrorInfo): void {
    this.toastService.success('错误报告已发送，感谢您的反馈');
  }

  onTipCategoryChanged(_category: string): void {
    // Handle tip category changes if needed
  }

  onMoreTipsRequested(): void {
    // Load more tips if needed
  }

  // File Upload Methods - now handled by child component

  // Analysis Methods
  private async startAnalysis(uploadData: FileUploadData): Promise<void> {
    this.isSubmitting.set(true);
    this.currentState.set('analyzing');
    this.resetAnalysisSteps();
    this.updateStepStatus('upload', 'active');

    try {
      const response = await this.guestApi.analyzeResume(
        uploadData.file, 
        uploadData.candidateInfo.name, 
        uploadData.candidateInfo.email, 
        uploadData.candidateInfo.notes
      ).toPromise();

      const sessionId = response?.data?.analysisId || '';
      this.sessionId.set(sessionId);

      if (sessionId) {
        this.updateStepStatus('upload', 'completed');
        this.updateStepStatus('parse', 'active');
      }
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
      }
    });
  }

  // WebSocket listeners are now handled by child components

  private updateAnalysisProgress(stepName: string, progress: number): void {
    // Map step names to step IDs
    const stepMap: Record<string, string> = {
      '上传文件': 'upload',
      '解析简历': 'parse',
      '提取关键信息': 'extract',
      '智能分析': 'analyze',
      '生成报告': 'report'
    };

    const stepId = stepMap[stepName] || stepName.toLowerCase();
    
    const steps = this.analysisSteps();
    const updatedSteps = steps.map(step => {
      if (step.id === stepId) {
        return { ...step, progress, status: 'active' as const };
      }
      return step;
    });
    
    this.analysisSteps.set(updatedSteps);
  }

  private handleStepChange(stepData: any): void {
    const stepName = stepData.step || stepData.currentStep;
    if (stepName) {
      // Mark previous steps as completed and current as active
      this.updateStepProgression(stepName);
    }
  }

  private updateStepProgression(currentStepName: string): void {
    const stepMap: Record<string, string> = {
      '上传文件': 'upload',
      '解析简历': 'parse',
      '提取关键信息': 'extract',
      '智能分析': 'analyze',
      '生成报告': 'report'
    };

    const currentStepId = stepMap[currentStepName] || currentStepName.toLowerCase();
    const steps = this.analysisSteps();
    const currentIndex = steps.findIndex(step => step.id === currentStepId);

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

  private handleAnalysisCompletion(completion: any): void {
    // Mark all steps as completed
    const steps = this.analysisSteps();
    const completedSteps = steps.map(step => ({
      ...step,
      status: 'completed' as const,
      progress: 100
    }));
    this.analysisSteps.set(completedSteps);

    // Set analysis result
    this.analysisResult.set({
      score: completion.result?.score || 85,
      summary: completion.result?.summary || '该候选人具有良好的技能匹配度',
      keySkills: completion.result?.details?.skills || ['JavaScript', 'TypeScript', 'Angular', 'Node.js'],
      experience: completion.result?.details?.experience || '3-5年软件开发经验',
      education: completion.result?.details?.education || '计算机科学学士学位',
      recommendations: completion.result?.details?.recommendations || [
        '技术栈匹配度高，适合前端开发岗位',
        '建议进行技术面试验证实际能力',
        '可以考虑安排项目经验分享环节'
      ],
      reportUrl: completion.result?.reportUrl
    });

    this.currentState.set('completed');
  }

  private handleAnalysisError(error: any): void {
    const errorMsg = error?.error?.message || error?.message || '分析过程中发生未知错误';
    this.errorMessage.set(errorMsg);
    this.currentState.set('error');

    // Mark current active step as error
    const steps = this.analysisSteps();
    const updatedSteps = steps.map(step => {
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
      { id: 'upload', title: '文件上传', description: '上传并验证简历文件', status: 'pending', progress: 0 },
      { id: 'parse', title: '解析简历', description: '提取文本和结构化信息', status: 'pending', progress: 0 },
      { id: 'extract', title: '信息提取', description: '识别关键技能和经验', status: 'pending', progress: 0 },
      { id: 'analyze', title: '智能分析', description: 'AI算法分析和评估', status: 'pending', progress: 0 },
      { id: 'report', title: '生成报告', description: '创建详细分析报告', status: 'pending', progress: 0 }
    ];
    this.analysisSteps.set(defaultSteps);
  }

  private updateStepStatus(stepId: string, status: AnalysisStep['status']): void {
    const steps = this.analysisSteps();
    const updatedSteps = steps.map(step => {
      if (step.id === stepId) {
        return { ...step, status, progress: status === 'completed' ? 100 : step.progress };
      }
      return step;
    });
    this.analysisSteps.set(updatedSteps);
  }

  // Helper Methods
  getErrorInfo(): ErrorInfo {
    return {
      message: this.errorMessage(),
      code: 'ANALYSIS_ERROR',
      timestamp: new Date(),
      recoverable: true
    };
  }

  getUsageStatistics(): UsageStatistics {
    return {
      todayAnalyses: this.todayAnalyses(),
      totalAnalyses: this.totalAnalyses(),
      averageScore: this.averageScore(),
      successRate: 95.2,
      monthlyAnalyses: 156
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
    } catch (error) {
      // Silent fail - statistics are not critical
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }
}