/**
 * Analysis Step Results Component
 * Wrapper for analysis results step
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
  AnalysisResult,
  ResultAction} from '../analysis-results.component';
import {
  AnalysisResultsComponent
} from '../analysis-results.component';

@Component({
  selector: 'arc-analysis-step-results',
  standalone: true,
  imports: [CommonModule, AnalysisResultsComponent],
  template: `
    <arc-analysis-results
      [result]="result"
      [showDetailedSummary]="false"
      [isProcessing]="isProcessing"
      (actionRequested)="onActionRequested($event)"
    >
    </arc-analysis-results>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisStepResultsComponent {
  @Input() public result: AnalysisResult | null = null;
  @Input() public isProcessing = false;

  @Output() public actionRequested = new EventEmitter<ResultAction>();

  public onActionRequested(action: ResultAction): void {
    this.actionRequested.emit(action);
  }
}
