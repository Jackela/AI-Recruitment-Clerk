import { Component, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Handles reproduction steps input with dynamic add/remove functionality.
 * Allows users to document steps to reproduce an error.
 */
@Component({
  selector: 'arc-reproduction-steps',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-group">
      <label for="reproduction-steps">重现步骤</label>
      <div class="step-inputs">
        <div
          *ngFor="let step of steps(); let i = index"
          class="step-input"
        >
          <span class="step-number">{{ i + 1 }}.</span>
          <input
            type="text"
            id="reproduction-steps"
            [value]="step"
            (input)="handleStepUpdate(i, $event)"
            class="form-control"
            placeholder="描述操作步骤..."
          />
          <button
            type="button"
            (click)="handleRemoveStep(i)"
            class="remove-step"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <button
        type="button"
        (click)="handleAddStep()"
        class="add-step-btn"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        添加步骤
      </button>
    </div>
  `,
  styles: [
    `
      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
      }

      .step-inputs {
        margin-bottom: 1rem;
      }

      .step-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .step-number {
        flex-shrink: 0;
        width: 24px;
        text-align: center;
        font-weight: 500;
        color: #667eea;
      }

      .step-input .form-control {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 0.2s;
      }

      .step-input .form-control:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .remove-step {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .remove-step:hover {
        background: #fee2e2;
      }

      .add-step-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: 2px dashed #d1d5db;
        color: #6b7280;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s;
      }

      .add-step-btn:hover {
        border-color: #667eea;
        color: #667eea;
        background: #f8faff;
      }
    `,
  ],
})
export class ReproductionStepsComponent {
  /**
   * Current reproduction steps (two-way bindable).
   */
  public readonly steps = model<string[]>(['']);

  /**
   * Emits when steps change (for parent access to filtered steps).
   */
  public readonly stepsChange = output<string[]>();

  /**
   * Adds a new reproduction step.
   */
  public handleAddStep(): void {
    const newSteps = [...this.steps()];
    newSteps.push('');
    this.steps.set(newSteps);
    this.emitChange(newSteps);
  }

  /**
   * Removes a reproduction step.
   * @param index - The index of the step to remove.
   */
  public handleRemoveStep(index: number): void {
    const newSteps = [...this.steps()];
    newSteps.splice(index, 1);
    if (newSteps.length === 0) {
      newSteps.push('');
    }
    this.steps.set(newSteps);
    this.emitChange(newSteps);
  }

  /**
   * Updates a reproduction step.
   * @param index - The index of the step to update.
   * @param event - The input event.
   */
  public handleStepUpdate(index: number, event: Event): void {
    const newSteps = [...this.steps()];
    newSteps[index] = (event.target as HTMLInputElement).value;
    this.steps.set(newSteps);
    this.emitChange(newSteps);
  }

  /**
   * Gets the filtered reproduction steps (non-empty).
   * @returns Array of non-empty reproduction steps.
   */
  public getFilteredSteps(): string[] {
    return this.steps().filter((step) => step.trim() !== '');
  }

  /**
   * Resets steps to initial state.
   */
  public reset(): void {
    this.steps.set(['']);
  }

  /**
   * Emits steps change event.
   * @param steps - The current steps.
   */
  private emitChange(steps: string[]): void {
    this.stepsChange.emit(steps);
  }
}
