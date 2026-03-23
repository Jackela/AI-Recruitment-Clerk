/**
 * Analysis Step Processing Component
 * Wrapper for analysis processing/progress step
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  AnalysisStep,
  ProgressUpdate} from '../analysis-progress.component';
import {
  AnalysisProgressComponent
} from '../analysis-progress.component';

@Component({
  selector: 'arc-analysis-step-processing',
  standalone: true,
  imports: [CommonModule, AnalysisProgressComponent],
  template: `
    <arc-analysis-progress
      [sessionId]="sessionId"
      [showMessageLog]="true"
      [steps]="steps"
      (progressUpdate)="onProgressUpdate($event)"
      (stepChange)="onStepChange($event)"
      (analysisCompleted)="onAnalysisCompleted($event)"
      (analysisError)="onAnalysisError($event)"
      (cancelRequested)="onCancelRequested()"
    >
    </arc-analysis-progress>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisStepProcessingComponent {
  @Input() public sessionId = '';
  @Input() public steps: AnalysisStep[] = [];

  @Output() public progressUpdate = new EventEmitter<ProgressUpdate>();
  @Output() public stepChange = new EventEmitter<string>();
  @Output() public analysisCompleted = new EventEmitter<
    import('../../../../services/websocket.service').CompletionData
  >();
  @Output() public analysisError = new EventEmitter<
    import('../../../../services/websocket.service').ErrorData
  >();
  @Output() public cancelRequested = new EventEmitter<void>();

  public onProgressUpdate(update: ProgressUpdate): void {
    this.progressUpdate.emit(update);
  }

  public onStepChange(step: string): void {
    this.stepChange.emit(step);
  }

  public onAnalysisCompleted(
    event: import('../../../../services/websocket.service').CompletionData,
  ): void {
    this.analysisCompleted.emit(event);
  }

  public onAnalysisError(
    event: import('../../../../services/websocket.service').ErrorData,
  ): void {
    this.analysisError.emit(event);
  }

  public onCancelRequested(): void {
    this.cancelRequested.emit();
  }
}
