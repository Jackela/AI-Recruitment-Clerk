import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService } from '../../../services/websocket.service';
import { ProgressTrackerComponent } from '../../../components/shared/progress-tracker/progress-tracker.component';

/**
 * Defines the shape of the analysis step.
 */
export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
}

/**
 * Defines the shape of the progress update.
 */
export interface ProgressUpdate {
  currentStep: string;
  progress: number;
}

/**
 * Represents the analysis progress component.
 */
@Component({
  selector: 'arc-analysis-progress',
  standalone: true,
  imports: [CommonModule, ProgressTrackerComponent],
  template: `
    <div class="progress-card" [@slideIn]>
      <div class="card-header">
        <h2>🔄 正在分析</h2>
        <p>AI正在处理您的简历，请稍候...</p>
      </div>

      <!-- Steps Overview -->
      <div class="steps-overview">
        <div
          class="step-item"
          *ngFor="let step of steps; trackBy: trackByStepId"
          [class]="step.status"
        >
          <div class="step-indicator">
            <svg
              *ngIf="step.status === 'completed'"
              class="check-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 11l3 3 8-8"></path>
            </svg>
            <svg
              *ngIf="step.status === 'error'"
              class="error-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
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
                <div
                  class="progress-fill"
                  [style.width.%]="step.progress"
                ></div>
              </div>
              <span class="progress-text">{{ step.progress }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Progress Tracker -->
      <arc-progress-tracker
        [sessionId]="sessionId"
        [showMessageLog]="showMessageLog"
        class="progress-tracker-embedded"
      >
      </arc-progress-tracker>

      <!-- Cancel Option -->
      <div class="cancel-section">
        <button
          (click)="onCancelClick()"
          class="cancel-btn"
          [disabled]="isCancelling"
        >
          {{ isCancelling ? '取消中...' : '取消分析' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['../unified-analysis.component.css'],
})
export class AnalysisProgressComponent implements OnInit, OnDestroy {
  @Input() sessionId = '';
  @Input() showMessageLog = true;
  @Input() steps: AnalysisStep[] = [];

  @Output() progressUpdate = new EventEmitter<ProgressUpdate>();
  @Output() stepChange = new EventEmitter<string>();
  @Output() analysisCompleted = new EventEmitter<any>();
  @Output() analysisError = new EventEmitter<any>();
  @Output() cancelRequested = new EventEmitter<void>();

  isCancelling = false;
  private destroy$ = new Subject<void>();

  private readonly webSocketService = inject(WebSocketService);

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    if (this.sessionId) {
      this.setupWebSocketListeners(this.sessionId);
    }
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupWebSocketListeners(sessionId: string): void {
    // Listen for progress updates
    this.webSocketService
      .onProgress(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((progress) => {
        this.progressUpdate.emit({
          currentStep: progress.currentStep || '',
          progress: progress.progress || 0,
        });
      });

    // Listen for step changes
    this.webSocketService
      .connect(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
          if (message.type === 'step_change') {
            const stepVal = (message.data as any)?.['step'] ?? (message.data as any)?.['currentStep'] ?? '';
            this.stepChange.emit(String(stepVal));
          }
      });

    // Listen for completion
    this.webSocketService
      .onCompletion(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((completion) => {
        this.analysisCompleted.emit(completion);
      });

    // Listen for errors
    this.webSocketService
      .onError(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.analysisError.emit(error);
      });
  }

  /**
   * Performs the on cancel click operation.
   */
  onCancelClick(): void {
    this.isCancelling = true;
    this.webSocketService.disconnect();
    setTimeout(() => {
      this.cancelRequested.emit();
      this.isCancelling = false;
    }, 1000);
  }

  /**
   * Performs the track by step id operation.
   * @param _index - The index.
   * @param step - The step.
   * @returns The string value.
   */
  trackByStepId(_index: number, step: AnalysisStep): string {
    return step.id;
  }

  /**
   * Updates session id.
   * @param sessionId - The session id.
   */
  updateSessionId(sessionId: string): void {
    if (sessionId && sessionId !== this.sessionId) {
      // Clean up existing listeners
      this.destroy$.next();

      // Setup new listeners
      this.setupWebSocketListeners(sessionId);
    }
  }
}
