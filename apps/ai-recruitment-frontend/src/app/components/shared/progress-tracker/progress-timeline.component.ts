import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ProgressStep } from './progress-tracker.types';

/**
 * Displays a timeline of progress steps/milestones.
 */
@Component({
  selector: 'arc-progress-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="steps-container">
      <ng-content></ng-content>
      <arc-progress-milestone
        *ngFor="let step of steps; trackBy: trackByStepId"
        [step]="step"
        [stepNumber]="getStepNumber(step.id)"
      ></arc-progress-milestone>
    </div>
  `,
  styles: [
    `
      .steps-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
    `,
  ],
})
export class ProgressTimelineComponent {
  @Input() public steps: ProgressStep[] = [];

  /**
   * Retrieves step number.
   * @param stepId - The step id.
   * @returns The number value.
   */
  public getStepNumber(stepId: string): number {
    return this.steps.findIndex((s) => s.id === stepId) + 1;
  }

  /**
   * Performs track by step id operation.
   * @param _index - The index.
   * @param step - The step.
   * @returns The string value.
   */
  public trackByStepId(_index: number, step: ProgressStep): string {
    return step.id;
  }
}
