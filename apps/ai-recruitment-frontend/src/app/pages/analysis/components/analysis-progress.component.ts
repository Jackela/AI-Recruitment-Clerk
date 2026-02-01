import type {
  OnDestroy,
  OnChanges,
  SimpleChanges} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
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
    <div class="progress-container">
      <!-- Progress Bento Card -->
      <article class="progress-bento-card" role="status" aria-live="polite">
        <div class="card-header">
          <div class="header-content">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </div>
            <div class="header-text">
              <h2 class="card-title">正在分析</h2>
              <p class="card-subtitle">AI正在处理您的简历，请稍候...</p>
            </div>
          </div>
          <button
            *ngIf="!isCancelling"
            type="button"
            class="cancel-icon-btn"
            (click)="onCancelClick()"
            aria-label="取消分析"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="card-body">
          <!-- Steps List -->
          <div class="steps-list" role="list" aria-label="分析步骤">
            <div
              *ngFor="let step of steps; trackBy: trackByStepId; let i = index"
              class="step-card"
              [class.step-pending]="step.status === 'pending'"
              [class.step-active]="step.status === 'active'"
              [class.step-completed]="step.status === 'completed'"
              [class.step-error]="step.status === 'error'"
              role="listitem"
              [attr.aria-current]="step.status === 'active' ? 'step' : null"
            >
              <div class="step-icon-wrapper">
                <div class="step-icon-circle">
                  <!-- Active (Processing) State -->
                  <svg
                    *ngIf="step.status === 'active'"
                    class="icon-spinner"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <!-- Completed State -->
                  <svg
                    *ngIf="step.status === 'completed'"
                    class="icon-check"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <!-- Error State -->
                  <svg
                    *ngIf="step.status === 'error'"
                    class="icon-error"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <!-- Pending State -->
                  <svg
                    *ngIf="step.status === 'pending'"
                    class="icon-pending"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="6" x2="12" y2="12"></line>
                    <line x1="16" y1="14" x2="8" y2="14"></line>
                  </svg>
                </div>
              </div>

              <div class="step-content">
                <div class="step-header">
                  <div class="step-info">
                    <h3 class="step-title">{{ step.title }}</h3>
                    <p class="step-description">{{ step.description }}</p>
                  </div>
                  <span
                    class="step-badge"
                    [attr.aria-label]="'进度: ' + step.progress + '%'"
                  >
                    {{ step.progress }}%
                  </span>
                </div>

                <!-- Progress Bar (shown for active and completed steps) -->
                <div class="progress-bar-wrapper" *ngIf="step.status !== 'pending'">
                  <div class="progress-bar-track">
                    <div
                      class="progress-bar-fill"
                      [style.width.%]="step.progress"
                      [attr.aria-valuenow]="step.progress"
                      [attr.aria-valuemin]="0"
                      [attr.aria-valuemax]="100"
                      role="progressbar"
                    >
                      <div *ngIf="step.status === 'active'" class="progress-shimmer"></div>
                    </div>
                  </div>
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
        </div>

        <!-- Cancel Section -->
        <div class="card-footer">
          <button
            type="button"
            (click)="onCancelClick()"
            class="btn-cancel"
            [disabled]="isCancelling"
            [attr.aria-label]="isCancelling ? '取消中...' : '取消分析'"
          >
            <svg
              *ngIf="!isCancelling"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span *ngIf="isCancelling" class="spinner" aria-hidden="true"></span>
            <span>{{ isCancelling ? '取消中...' : '取消分析' }}</span>
          </button>
        </div>
      </article>
    </div>
  `,
  styleUrls: ['./analysis-progress.component.scss'],
})
export class AnalysisProgressComponent implements OnChanges, OnDestroy {
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
   * Reacts to session id changes to wire or tear down WebSocket listeners.
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const sessionIdChange = changes['sessionId'];
    if (!sessionIdChange) {
      return;
    }

    const newSessionId: string = sessionIdChange.currentValue;
    const previousSessionId: string | undefined =
      sessionIdChange.previousValue;

    if (newSessionId && newSessionId !== previousSessionId) {
      this.destroy$.next();
      this.setupWebSocketListeners(newSessionId);
      return;
    }

    if (!newSessionId && previousSessionId) {
      this.destroy$.next();
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
          const stepVal =
            (message.data as any)?.['step'] ??
            (message.data as any)?.['currentStep'] ??
            '';
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

}
