import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BentoProgressData } from '../types/bento-card.types';

@Component({
  selector: 'arc-bento-progress-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="card-progress"
      *ngIf="progress"
      [attr.aria-label]="progressLabel"
    >
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPercentage"></div>
      </div>
      <div class="progress-text">
        <span class="progress-value"
          >{{ progress.value }} / {{ progress.max }}</span
        >
        <span class="progress-label" *ngIf="progress.label">{{
          progress.label
        }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .card-progress {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .progress-bar {
        width: 100%;
        height: 10px;
        background: var(--color-neutral-200);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(
          90deg,
          var(--color-primary-600),
          var(--color-royal-600)
        );
        border-radius: var(--radius-lg);
        transition: width var(--transition-base);
        box-shadow: var(--shadow-sm);
        position: relative;

        &::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }
      }

      .progress-text {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
      }

      .progress-value {
        font-weight: 600;
      }

      .progress-label {
        opacity: 0.8;
      }
    `,
  ],
})
export class BentoProgressBarComponent {
  @Input() progress?: BentoProgressData;

  get progressPercentage(): number {
    if (!this.progress) return 0;
    return Math.min((this.progress.value / this.progress.max) * 100, 100);
  }

  get progressLabel(): string {
    if (!this.progress) return '';
    const percentage = this.progressPercentage.toFixed(0);
    return `Progress: ${percentage}% (${this.progress.value} of ${this.progress.max})`;
  }
}
