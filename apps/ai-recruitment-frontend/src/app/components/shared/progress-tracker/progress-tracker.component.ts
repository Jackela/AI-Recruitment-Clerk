import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, BehaviorSubject } from 'rxjs';
// import { Observable } from 'rxjs'; // Reserved for future use
import { takeUntil } from 'rxjs/operators';
import {
  WebSocketService,
  ProgressUpdate,
} from '../../../services/websocket.service';
import { ToastService } from '../../../services/toast.service';

export interface ProgressMessage {
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  timestamp: Date;
}

export interface WebSocketProgressMessage {
  type: string;
  data?: {
    message?: string;
    currentStep?: string;
    [key: string]: unknown;
  };
}

export interface StepChangeData {
  currentStep: string;
  message?: string;
  progress?: number;
}

export interface ProgressCompletionData {
  progress?: number;
  message?: string;
  finalStep?: string;
}

export interface ProgressErrorData {
  error?: string;
  message?: string;
  code?: string | number;
}

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
}

@Component({
  selector: 'app-progress-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-tracker" [class.connected]="isConnected$ | async">
      <!-- 连接状态指示器 -->
      <div class="connection-status">
        <div class="status-indicator" [class]="connectionStatus$ | async"></div>
        <span class="status-text">{{
          getStatusText(connectionStatus$ | async)
        }}</span>
      </div>

      <!-- 整体进度条 -->
      <div class="overall-progress">
        <div class="progress-header">
          <h3>分析进度</h3>
          <span class="progress-percentage"
            >{{ (overallProgress$ | async) || 0 }}%</span
          >
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            [style.width.%]="(overallProgress$ | async) || 0"
          ></div>
        </div>
        <div class="progress-info">
          <span class="current-step">{{
            (currentStep$ | async) || '等待开始...'
          }}</span>
          <span class="eta" *ngIf="estimatedTimeRemaining$ | async as eta">
            预计剩余: {{ formatTime(eta) }}
          </span>
        </div>
      </div>

      <!-- 步骤详情 -->
      <div class="steps-container">
        <div
          class="step-item"
          *ngFor="let step of steps; trackBy: trackByStepId"
          [class]="step.status"
        >
          <div class="step-icon">
            <ng-container [ngSwitch]="step.status">
              <svg
                *ngSwitchCase="'completed'"
                class="icon-completed"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg
                *ngSwitchCase="'error'"
                class="icon-error"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <div *ngSwitchCase="'active'" class="spinner"></div>
              <div *ngSwitchDefault class="step-number">
                {{ getStepNumber(step.id) }}
              </div>
            </ng-container>
          </div>
          <div class="step-content">
            <div class="step-label">{{ step.label }}</div>
            <div class="step-description" *ngIf="step.description">
              {{ step.description }}
            </div>
            <div
              class="step-progress"
              *ngIf="step.status === 'active' && step.progress !== undefined"
            >
              <div class="mini-progress-bar">
                <div
                  class="mini-progress-fill"
                  [style.width.%]="step.progress"
                ></div>
              </div>
              <span class="step-percentage">{{ step.progress }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时消息日志 -->
      <div class="message-log" *ngIf="showMessageLog">
        <h4>实时日志</h4>
        <div class="log-container">
          <div
            class="log-entry"
            *ngFor="
              let message of recentMessages$ | async;
              trackBy: trackByMessage
            "
            [class]="message.type"
          >
            <span class="timestamp">{{
              formatTimestamp(message.timestamp)
            }}</span>
            <span class="message">{{ message.message }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .progress-tracker {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        border: 2px solid #e5e7eb;
        transition: all 0.3s ease;
      }

      .progress-tracker.connected {
        border-color: #10b981;
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background: #f9fafb;
        border-radius: 8px;
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      .status-indicator.connected {
        background: #10b981;
      }
      .status-indicator.connecting {
        background: #f59e0b;
      }
      .status-indicator.disconnected {
        background: #ef4444;
      }
      .status-indicator.error {
        background: #dc2626;
      }

      .status-text {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
      }

      .overall-progress {
        margin-bottom: 1.5rem;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .progress-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
      }

      .progress-percentage {
        font-size: 1rem;
        font-weight: 600;
        color: #059669;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #059669, #10b981);
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .current-step {
        font-weight: 500;
      }

      .eta {
        color: #059669;
      }

      .steps-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .step-item {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
      }

      .step-item.active {
        background: #f0f9ff;
        border-color: #0ea5e9;
      }

      .step-item.completed {
        background: #f0fdf4;
        border-color: #10b981;
      }

      .step-item.error {
        background: #fef2f2;
        border-color: #ef4444;
      }

      .step-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .icon-completed,
      .icon-error {
        width: 20px;
        height: 20px;
      }

      .icon-completed {
        color: #10b981;
      }
      .icon-error {
        color: #ef4444;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #0ea5e9;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .step-number {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #e5e7eb;
        color: #6b7280;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .step-content {
        flex: 1;
      }

      .step-label {
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.25rem;
      }

      .step-description {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }

      .step-progress {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .mini-progress-bar {
        flex: 1;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
      }

      .mini-progress-fill {
        height: 100%;
        background: #0ea5e9;
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .step-percentage {
        font-size: 0.75rem;
        color: #0ea5e9;
        font-weight: 500;
      }

      .message-log {
        margin-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
      }

      .message-log h4 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
      }

      .log-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.75rem;
        background: #f9fafb;
      }

      .log-entry {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .log-entry:last-child {
        margin-bottom: 0;
      }

      .timestamp {
        color: #6b7280;
        font-family: monospace;
        flex-shrink: 0;
      }

      .message {
        color: #111827;
      }

      .log-entry.error .message {
        color: #dc2626;
      }

      .log-entry.progress .message {
        color: #059669;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 768px) {
        .progress-tracker {
          padding: 1rem;
        }

        .step-item {
          padding: 0.75rem;
        }

        .progress-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }
      }
    `,
  ],
})
export class ProgressTrackerComponent implements OnInit, OnDestroy {
  @Input() sessionId = '';
  @Input() steps: ProgressStep[] = [];
  @Input() showMessageLog = true;

  connectionStatus$ = new BehaviorSubject<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  isConnected$ = new BehaviorSubject<boolean>(false);
  overallProgress$ = new BehaviorSubject<number>(0);
  currentStep$ = new BehaviorSubject<string>('');
  estimatedTimeRemaining$ = new BehaviorSubject<number | null>(null);
  recentMessages$ = new BehaviorSubject<ProgressMessage[]>([]);

  private destroy$ = new Subject<void>();
  private messages: ProgressMessage[] = [];

  constructor(
    private webSocketService: WebSocketService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    if (!this.sessionId) {
      this.toastService.error('会话ID缺失，无法跟踪进度');
      return;
    }

    this.initializeDefaultSteps();
    this.connectToWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  private initializeDefaultSteps(): void {
    if (this.steps.length === 0) {
      this.steps = [
        { id: 'upload', label: '文件上传', status: 'completed' },
        { id: 'parse', label: '解析简历', status: 'pending' },
        { id: 'extract', label: '提取信息', status: 'pending' },
        { id: 'analyze', label: '智能分析', status: 'pending' },
        { id: 'generate', label: '生成报告', status: 'pending' },
      ];
    }
  }

  private connectToWebSocket(): void {
    // 监听连接状态
    this.webSocketService
      .getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.connectionStatus$.next(status);
        this.isConnected$.next(status === 'connected');
      });

    // 连接WebSocket
    this.webSocketService
      .connect(this.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.handleWebSocketMessage(message);
      });

    // 监听进度更新
    this.webSocketService
      .onProgress(this.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((progress) => {
        this.handleProgressUpdate(progress);
      });

    // 监听完成事件
    this.webSocketService
      .onCompletion(this.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((completion) => {
        this.handleCompletion(completion);
      });

    // 监听错误事件
    this.webSocketService
      .onError(this.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.handleError(error);
      });
  }

  private handleWebSocketMessage(message: WebSocketProgressMessage): void {
    this.addMessage(message.type, message.data?.message || '状态更新');

    switch (message.type) {
      case 'step_change':
        if (message.data?.currentStep) {
          this.handleStepChange({
            currentStep: message.data.currentStep,
            message: message.data.message,
            progress:
              typeof message.data.progress === 'number'
                ? message.data.progress
                : undefined,
          });
        }
        break;
      case 'status_update':
        this.addMessage('info', message.data?.message || '状态更新');
        break;
    }
  }

  private handleProgressUpdate(progress: ProgressUpdate): void {
    this.overallProgress$.next(progress.progress);
    this.currentStep$.next(progress.currentStep);

    if (progress.estimatedTimeRemaining) {
      this.estimatedTimeRemaining$.next(progress.estimatedTimeRemaining);
    }

    // 更新步骤状态
    this.updateStepProgress(progress.currentStep, progress.progress);
    this.addMessage(
      'progress',
      `${progress.currentStep}: ${progress.progress}%`,
    );
  }

  private handleStepChange(data: StepChangeData): void {
    const stepName = data.currentStep;
    this.currentStep$.next(stepName);

    // 更新步骤状态
    this.markStepAsActive(stepName);
    this.addMessage('info', data.message || `开始 ${stepName}`);
  }

  private handleCompletion(_completion: ProgressCompletionData): void {
    this.overallProgress$.next(100);
    this.currentStep$.next('分析完成');
    this.markAllStepsCompleted();
    this.addMessage('success', '分析已完成');
  }

  private handleError(error: ProgressErrorData): void {
    this.addMessage('error', error.error || '处理过程中发生错误');
    this.markCurrentStepAsError();
  }

  private updateStepProgress(currentStep: string, progress: number): void {
    const step = this.steps.find(
      (s) => s.label.includes(currentStep) || s.id === currentStep,
    );
    if (step) {
      step.status = 'active';
      step.progress = progress;
    }
  }

  private markStepAsActive(stepName: string): void {
    // 先完成之前的步骤
    let foundActive = false;
    for (const step of this.steps) {
      if (step.label.includes(stepName) || step.id === stepName) {
        step.status = 'active';
        foundActive = true;
        break;
      } else if (!foundActive) {
        step.status = 'completed';
      }
    }
  }

  private markAllStepsCompleted(): void {
    this.steps.forEach((step) => {
      step.status = 'completed';
      step.progress = 100;
    });
  }

  private markCurrentStepAsError(): void {
    const activeStep = this.steps.find((s) => s.status === 'active');
    if (activeStep) {
      activeStep.status = 'error';
    }
  }

  private addMessage(type: ProgressMessage['type'], message: string): void {
    const newMessage: ProgressMessage = {
      type,
      message,
      timestamp: new Date(),
    };

    this.messages.unshift(newMessage);
    if (this.messages.length > 20) {
      this.messages = this.messages.slice(0, 20);
    }

    this.recentMessages$.next([...this.messages]);
  }

  getStatusText(status: string | null): string {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'disconnected':
        return '已断开';
      case 'error':
        return '连接错误';
      default:
        return '未知状态';
    }
  }

  getStepNumber(stepId: string): number {
    return this.steps.findIndex((s) => s.id === stepId) + 1;
  }

  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分${seconds % 60}秒`;
  }

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  trackByStepId(_index: number, step: ProgressStep): string {
    return step.id;
  }

  trackByMessage(index: number, message: ProgressMessage): string {
    return `${message.timestamp.getTime()}_${index}`;
  }
}
