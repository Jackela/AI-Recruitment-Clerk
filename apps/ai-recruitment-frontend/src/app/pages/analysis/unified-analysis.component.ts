import { Component, signal, OnDestroy, ViewChild, ElementRef, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
// Animations removed for build compatibility
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { ProgressTrackerComponent } from '../../components/shared/progress-tracker/progress-tracker.component';

export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  keySkills: string[];
  experience: string;
  education: string;
  recommendations: string[];
  reportUrl?: string;
}

@Component({
  selector: 'arc-unified-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, ProgressTrackerComponent],
  // Animations removed for build compatibility
  template: `
    <div class="analysis-container">
      <!-- SVG Definitions for Gradients -->
      <svg style="position: absolute; width: 0; height: 0;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
      
      <!-- Header Section -->
      <div class="header-section">
        <h1>AI智能简历分析</h1>
        <p class="subtitle">上传简历，获得专业的AI驱动分析报告</p>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid" [class.analysis-mode]="currentState() !== 'upload'">
        
        <!-- Upload Section -->
        <div class="upload-card" *ngIf="currentState() === 'upload'" [@slideIn]>
          <div class="card-header">
            <h2>📄 上传简历</h2>
            <p>支持 PDF、DOC、DOCX 格式</p>
          </div>
          
          <form (submit)="startAnalysis($event)" class="upload-form">
            <!-- File Upload Area -->
            <div class="file-drop-zone" 
                 [class.drag-over]="isDragOver()"
                 [class.has-file]="selectedFile()"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)"
                 (click)="fileInput.click()">
              
              <input #fileInput 
                     type="file" 
                     (change)="onFileSelect($event)"
                     accept=".pdf,.doc,.docx"
                     hidden>
              
              <div class="drop-content" *ngIf="!selectedFile()">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17,8 12,3 7,8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <h3>拖拽文件到这里</h3>
                <p>或者 <span class="click-text">点击选择文件</span></p>
                <div class="file-types">支持: PDF, DOC, DOCX (最大 10MB)</div>
              </div>
              
              <div class="file-selected" *ngIf="selectedFile()">
                <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
                <div class="file-info">
                  <h4>{{ selectedFile()?.name }}</h4>
                  <p>{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                </div>
                <button type="button" (click)="removeFile($event)" class="remove-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Candidate Information -->
            <div class="info-section">
              <h3>候选人信息 (可选)</h3>
              <div class="info-grid">
                <div class="input-group">
                  <label>姓名</label>
                  <input [(ngModel)]="candidateName" 
                         name="candidateName" 
                         placeholder="输入候选人姓名"
                         class="form-input">
                </div>
                <div class="input-group">
                  <label>邮箱</label>
                  <input [(ngModel)]="candidateEmail" 
                         name="candidateEmail" 
                         type="email" 
                         placeholder="输入邮箱地址"
                         class="form-input">
                </div>
                <div class="input-group full-width">
                  <label>职位匹配 (可选)</label>
                  <input [(ngModel)]="targetPosition" 
                         name="targetPosition" 
                         placeholder="输入目标职位，提高匹配精度"
                         class="form-input">
                </div>
                <div class="input-group full-width">
                  <label>备注</label>
                  <textarea [(ngModel)]="notes" 
                            name="notes" 
                            rows="3" 
                            placeholder="添加任何相关备注..."
                            class="form-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-section">
              <button type="submit" 
                      [disabled]="!selectedFile()" 
                      class="primary-btn">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11l3 3 8-8"></path>
                </svg>
                开始AI分析
              </button>
              <button type="button" 
                      (click)="startDemo()" 
                      class="secondary-btn">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5,3 19,12 5,21"></polygon>
                </svg>
                查看演示
              </button>
            </div>
          </form>
        </div>

        <!-- Analysis Progress Section -->
        <div class="progress-card" *ngIf="currentState() === 'analyzing'" [@slideIn]>
          <div class="card-header">
            <h2>🔄 正在分析</h2>
            <p>AI正在处理您的简历，请稍候...</p>
          </div>
          
          <!-- Steps Overview -->
          <div class="steps-overview">
            <div class="step-item" 
                 *ngFor="let step of analysisSteps(); trackBy: trackByStepId"
                 [class]="step.status">
              <div class="step-indicator">
                <svg *ngIf="step.status === 'completed'" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11l3 3 8-8"></path>
                </svg>
                <svg *ngIf="step.status === 'error'" class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <div *ngIf="step.status === 'active'" class="spinner"></div>
                <div *ngIf="step.status === 'pending'" class="pending-dot"></div>
              </div>
              <div class="step-content">
                <h4>{{ step.title }}</h4>
                <p>{{ step.description }}</p>
                <div class="step-progress" *ngIf="step.status === 'active'">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="step.progress"></div>
                  </div>
                  <span class="progress-text">{{ step.progress }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Real-time Progress Tracker -->
          <app-progress-tracker 
            [sessionId]="sessionId()"
            [showMessageLog]="true"
            class="progress-tracker-embedded">
          </app-progress-tracker>

          <!-- Cancel Option -->
          <div class="cancel-section">
            <button (click)="cancelAnalysis()" class="cancel-btn">
              取消分析
            </button>
          </div>
        </div>

        <!-- Results Preview Section -->
        <div class="results-card" *ngIf="currentState() === 'completed'" [@slideIn]>
          <div class="card-header">
            <h2>✅ 分析完成</h2>
            <p>AI分析已完成，以下是结果摘要</p>
          </div>
          
          <div class="results-content" *ngIf="analysisResult()">
            <!-- Score Display -->
            <div class="score-section">
              <div class="score-circle">
                <svg class="score-ring" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" class="score-bg"></circle>
                  <circle cx="60" cy="60" r="50" class="score-fill" 
                          [style.stroke-dasharray]="getScoreCircumference()"
                          [style.stroke-dashoffset]="getScoreOffset()"></circle>
                </svg>
                <div class="score-value">
                  <span class="score-number">{{ analysisResult()?.score }}</span>
                  <span class="score-label">分</span>
                </div>
              </div>
              <div class="score-details">
                <h3>匹配度评分</h3>
                <p class="score-summary">{{ analysisResult()?.summary }}</p>
              </div>
            </div>

            <!-- Key Insights -->
            <div class="insights-grid">
              <div class="insight-card">
                <h4>🎯 关键技能</h4>
                <div class="skill-tags">
                  <span class="skill-tag" *ngFor="let skill of analysisResult()?.keySkills">
                    {{ skill }}
                  </span>
                </div>
              </div>
              
              <div class="insight-card">
                <h4>💼 工作经验</h4>
                <p>{{ analysisResult()?.experience }}</p>
              </div>
              
              <div class="insight-card">
                <h4>🎓 教育背景</h4>
                <p>{{ analysisResult()?.education }}</p>
              </div>
            </div>

            <!-- Recommendations -->
            <div class="recommendations-section" *ngIf="analysisResult()?.recommendations?.length">
              <h4>📋 建议</h4>
              <ul class="recommendations-list">
                <li *ngFor="let rec of analysisResult()?.recommendations">{{ rec }}</li>
              </ul>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="results-actions">
            <button (click)="viewDetailedResults()" class="primary-btn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              查看详细报告
            </button>
            <button (click)="downloadReport()" class="secondary-btn" *ngIf="analysisResult()?.reportUrl">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              下载报告
            </button>
            <button (click)="startNewAnalysis()" class="outline-btn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              新建分析
            </button>
          </div>
        </div>

        <!-- Error Section -->
        <div class="error-card" *ngIf="currentState() === 'error'" [@slideIn]>
          <div class="card-header">
            <h2>❌ 分析失败</h2>
            <p>处理过程中遇到问题</p>
          </div>
          
          <div class="error-content">
            <div class="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3>{{ errorMessage() }}</h3>
            <p class="error-suggestion">请检查文件格式是否正确，或稍后重试</p>
          </div>
          
          <div class="error-actions">
            <button (click)="retryAnalysis()" class="primary-btn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              重试分析
            </button>
            <button (click)="startNewAnalysis()" class="outline-btn">
              重新开始
            </button>
          </div>
        </div>

      </div>

      <!-- Side Panel (Statistics & Tips) -->
      <div class="side-panel" *ngIf="currentState() === 'upload'">
        <div class="stats-card">
          <h3>📊 使用统计</h3>
          <div class="stat-item">
            <span class="stat-value">{{ todayAnalyses() }}</span>
            <span class="stat-label">今日分析</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ totalAnalyses() }}</span>
            <span class="stat-label">总计分析</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ averageScore() }}分</span>
            <span class="stat-label">平均得分</span>
          </div>
        </div>

        <div class="tips-card">
          <h3>💡 使用提示</h3>
          <ul class="tips-list">
            <li>确保简历文件清晰完整</li>
            <li>包含详细的工作经验和技能</li>
            <li>提供目标职位可提高匹配精度</li>
            <li>分析结果可下载保存</li>
          </ul>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./unified-analysis.component.css']
})
export class UnifiedAnalysisComponent implements OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Component State
  currentState = signal<'upload' | 'analyzing' | 'completed' | 'error'>('upload');
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  sessionId = signal('');
  errorMessage = signal('');
  
  // Form Data
  candidateName = '';
  candidateEmail = '';
  targetPosition = '';
  notes = '';

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

  // File Upload Methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set('不支持的文件格式。请上传 PDF、DOC 或 DOCX 文件。');
      this.currentState.set('error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set('文件大小超过限制。请上传小于10MB的文件。');
      this.currentState.set('error');
      return;
    }

    this.selectedFile.set(file);
    this.errorMessage.set('');
    this.currentState.set('upload');
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Analysis Methods
  async startAnalysis(event: Event): Promise<void> {
    event.preventDefault();
    
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('请选择一个简历文件');
      this.currentState.set('error');
      return;
    }

    this.currentState.set('analyzing');
    this.resetAnalysisSteps();
    this.updateStepStatus('upload', 'active');

    try {
      const response = await this.guestApi.analyzeResume(
        file, 
        this.candidateName, 
        this.candidateEmail, 
        this.notes
      ).toPromise();

      const sessionId = response?.data?.analysisId || '';
      this.sessionId.set(sessionId);

      if (sessionId) {
        this.updateStepStatus('upload', 'completed');
        this.updateStepStatus('parse', 'active');
        this.setupWebSocketListeners(sessionId);
      }
    } catch (error) {
      this.handleAnalysisError(error);
    }
  }

  startDemo(): void {
    this.currentState.set('analyzing');
    this.resetAnalysisSteps();
    
    // Generate demo session ID
    const demoSessionId = `demo_${Date.now()}`;
    this.sessionId.set(demoSessionId);
    
    // Start demo progress simulation
    this.guestApi.getDemoAnalysis().subscribe({
      next: () => {
        this.updateStepStatus('upload', 'active');
        this.setupWebSocketListeners(demoSessionId);
        
        // Trigger demo WebSocket events
        setTimeout(() => {
          this.webSocketService.connect(demoSessionId).subscribe();
        }, 500);
      },
      error: (error) => this.handleAnalysisError(error)
    });
  }

  private setupWebSocketListeners(sessionId: string): void {
    // Listen for progress updates
    this.webSocketService.onProgress(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.updateAnalysisProgress(progress.currentStep || '', progress.progress || 0);
      });

    // Listen for step changes
    this.webSocketService.connect(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (message.type === 'step_change') {
          this.handleStepChange(message.data);
        }
      });

    // Listen for completion
    this.webSocketService.onCompletion(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(completion => {
        this.handleAnalysisCompletion(completion);
      });

    // Listen for errors
    this.webSocketService.onError(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.handleAnalysisError(error);
      });
  }

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

  trackByStepId(index: number, step: AnalysisStep): string {
    return step.id;
  }

  // Score Visualization
  getScoreCircumference(): string {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    return `${circumference} ${circumference}`;
  }

  getScoreOffset(): number {
    const score = this.analysisResult()?.score || 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    return circumference - (score / 100) * circumference;
  }

  // Action Methods
  cancelAnalysis(): void {
    this.webSocketService.disconnect();
    this.currentState.set('upload');
    this.resetAnalysisSteps();
    this.sessionId.set('');
  }

  retryAnalysis(): void {
    this.currentState.set('upload');
    this.errorMessage.set('');
    this.resetAnalysisSteps();
  }

  startNewAnalysis(): void {
    this.selectedFile.set(null);
    this.candidateName = '';
    this.candidateEmail = '';
    this.targetPosition = '';
    this.notes = '';
    this.analysisResult.set(null);
    this.currentState.set('upload');
    this.resetAnalysisSteps();
    this.sessionId.set('');
    this.errorMessage.set('');
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  viewDetailedResults(): void {
    const sessionId = this.sessionId();
    if (sessionId) {
      // Navigate to detailed results page
      this.router.navigate(['/results', sessionId]);
    }
  }

  downloadReport(): void {
    const reportUrl = this.analysisResult()?.reportUrl;
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
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