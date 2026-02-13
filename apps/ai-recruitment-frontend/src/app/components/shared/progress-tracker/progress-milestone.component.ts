import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ProgressStep } from './progress-tracker.types';

/**
 * Displays an individual progress step milestone with status icon and details.
 */
@Component({
  selector: 'arc-progress-milestone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-item" [class]="step.status">
      <div class="step-icon">
        <ng-container [ngSwitch]="step.status">
          <svg
            *ngSwitchCase="'completed'"
            class="icon-completed"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <svg
            *ngSwitchCase="'error'"
            class="icon-error"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <div *ngSwitchCase="'active'" class="spinner"></div>
          <div *ngSwitchDefault class="step-number">
            {{ stepNumber }}
          </div>
        </ng-container>
      </div>
      <div class="step-content">
        <div class="step-label">{{ step.label }}</div>
        <div class="step-description" *ngIf="step.description">
          {{ step.description }}
        </div>
        <div
          class="step-progress"
          *ngIf="step.status === 'active' && step.progress !== undefined"
        >
          <div class="mini-progress-bar">
            <div
              class="mini-progress-fill"
              [style.width.%]="step.progress"
            ></div>
          </div>
          <span class="step-percentage">{{ step.progress }}%</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .step-item {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
      }

      .step-item.active {
        background: #f0f9ff;
        border-color: #0ea5e9;
      }

      .step-item.completed {
        background: #f0fdf4;
        border-color: #10b981;
      }

      .step-item.error {
        background: #fef2f2;
        border-color: #ef4444;
      }

      .step-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .icon-completed,
      .icon-error {
        width: 20px;
        height: 20px;
      }

      .icon-completed {
        color: #10b981;
      }
      .icon-error {
        color: #ef4444;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #0ea5e9;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .step-number {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #e5e7eb;
        color: #6b7280;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .step-content {
        flex: 1;
      }

      .step-label {
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.25rem;
      }

      .step-description {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }

      .step-progress {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .mini-progress-bar {
        flex: 1;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
      }

      .mini-progress-fill {
        height: 100%;
        background: #0ea5e9;
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .step-percentage {
        font-size: 0.75rem;
        color: #0ea5e9;
        font-weight: 500;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 768px) {
        .step-item {
          padding: 0.75rem;
        }
      }
    `,
  ],
})
export class ProgressMilestoneComponent {
  @Input() public step!: ProgressStep;
  @Input() public stepNumber = 0;
}
