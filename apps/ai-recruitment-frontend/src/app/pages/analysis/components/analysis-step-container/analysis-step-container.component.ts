/**
 * Analysis Step Container Component
 * Handles step switching animations and container layout
 */

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
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
  animations: [
    trigger('stepTransition', [
      transition('* => *', [
        style({ opacity: 0.96, transform: 'translateY(2px)' }),
        animate(
          '120ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisStepContainerComponent {
  @Input() public currentState: AnalysisState = 'upload';
}
