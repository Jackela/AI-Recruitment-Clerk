/**
 * Analysis Step Error Component
 * Wrapper for error handling step
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
  ErrorInfo,
  ErrorAction} from '../analysis-error.component';
import {
  AnalysisErrorComponent
} from '../analysis-error.component';

@Component({
  selector: 'arc-analysis-step-error',
  standalone: true,
  imports: [CommonModule, AnalysisErrorComponent],
  template: `
    <arc-analysis-error
      [errorInfo]="errorInfo"
      [showDetails]="true"
      [isRetrying]="isRetrying"
      (actionRequested)="onActionRequested($event)"
      (errorReported)="onErrorReported($event)"
    >
    </arc-analysis-error>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisStepErrorComponent {
  @Input() public errorInfo: ErrorInfo | null = null;
  @Input() public isRetrying = false;

  @Output() public actionRequested = new EventEmitter<ErrorAction>();
  @Output() public errorReported = new EventEmitter<ErrorInfo>();

  public onActionRequested(action: ErrorAction): void {
    this.actionRequested.emit(action);
  }

  public onErrorReported(errorInfo: ErrorInfo): void {
    this.errorReported.emit(errorInfo);
  }
}
