import type { OnInit, OnDestroy } from '@angular/core';
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  WebSocketService,
} from '../../../services/websocket.service';
import type { ProgressUpdate } from '../../../services/websocket.service';
import { ToastService } from '../../../services/toast.service';
import { ProgressTimelineComponent } from './progress-timeline.component';
import { ProgressMilestoneComponent } from './progress-milestone.component';
import { ProgressLogComponent } from './progress-log.component';
import type {
  ProgressMessage,
  WebSocketProgressMessage,
  StepChangeData,
  ProgressErrorData,
  ProgressStep,
} from './progress-tracker.types';

/**
 * Represents progress tracker component.
 */
@Component({
  selector: 'arc-progress-tracker',
  standalone: true,
  imports: [
    CommonModule,
    ProgressTimelineComponent,
    ProgressMilestoneComponent,
    ProgressLogComponent,
  ],
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
      <arc-progress-timeline [steps]="steps"></arc-progress-timeline>

      <!-- 实时消息日志 -->
      <arc-progress-log
        *ngIf="showMessageLog"
        [messages]="messages"
      ></arc-progress-log>
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

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      @media (max-width: 768px) {
        .progress-tracker {
          padding: 1rem;
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
  private readonly webSocketService = inject(WebSocketService);
  private readonly toastService = inject(ToastService);

  @Input() public sessionId = '';
  @Input() public steps: ProgressStep[] = [];
  @Input() public showMessageLog = true;

  public connectionStatus$ = new BehaviorSubject<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  public isConnected$ = new BehaviorSubject<boolean>(false);
  public overallProgress$ = new BehaviorSubject<number>(0);
  public currentStep$ = new BehaviorSubject<string>('');
  public estimatedTimeRemaining$ = new BehaviorSubject<number | null>(null);
  public messages: ProgressMessage[] = [];

  private destroy$ = new Subject<void>();

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    if (!this.sessionId) {
      this.toastService.error('会话ID缺失，无法跟踪进度');
      return;
    }

    this.initializeDefaultSteps();
    this.connectToWebSocket();
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
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
    const allowed: ProgressMessage['type'][] = [
      'info',
      'success',
      'error',
      'progress',
    ];
    const msgType = message.type as ProgressMessage['type'];
    const t: ProgressMessage['type'] = allowed.includes(msgType) ? msgType : 'info';
    this.addMessage(t, message.data?.message || '状态更新');

    switch (message.type) {
      case 'step_change':
        if (message.data?.currentStep) {
          const progressValue = message.data['progress'];
          this.handleStepChange({
            currentStep: message.data.currentStep,
            message: message.data?.message as string | undefined,
            progress:
              typeof progressValue === 'number'
                ? progressValue
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

  private handleCompletion(_completion: unknown): void {
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
    const targetIndex = this.steps.findIndex(
      (step) => step.label.includes(stepName) || step.id === stepName,
    );

    if (targetIndex === -1) return;

    this.steps.forEach((step, index) => {
      if (index < targetIndex) {
        step.status = 'completed';
      } else if (index === targetIndex) {
        step.status = 'active';
      }
    });
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
  }

  /**
   * Retrieves status text.
   * @param status - The status.
   * @returns The string value.
   */
  public getStatusText(status: string | null): string {
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

  /**
   * Performs format time operation.
   * @param seconds - The seconds.
   * @returns The string value.
   */
  public formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分${seconds % 60}秒`;
  }
}
