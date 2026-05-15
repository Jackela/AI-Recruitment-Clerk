/**
 * Analysis Step Container Component
 * Handles step switching animations and container layout
 */

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AnalysisState } from '../../types/analysis.types';

@Component({
  selector: 'arc-analysis-step-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-container" [@stepTransition]="currentState">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .step-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisStepContainerComponent {
  @Input() public currentState: AnalysisState = 'upload';
}
