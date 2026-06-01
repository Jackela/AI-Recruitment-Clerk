import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'arc-score-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-display">
      <div class="score-circle">
        <span class="score-value">{{ score }}</span>
        <span class="score-label">分</span>
      </div>
      <div class="candidate-info" *ngIf="candidateName">
        <h3 class="candidate-name">{{ candidateName }}</h3>
        <p class="candidate-email" *ngIf="candidateEmail">
          {{ candidateEmail }}
        </p>
        <p class="target-position" *ngIf="targetPosition">
          目标职位: {{ targetPosition }}
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .score-display {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .score-circle {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
      }
      .score-value {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
      }
      .score-label {
        font-size: 0.875rem;
        opacity: 0.9;
      }
      .candidate-info {
        flex: 1;
        min-width: 200px;
      }
      .candidate-name {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
      }
      .candidate-email,
      .target-position {
        margin: 0;
        color: #6b7280;
        font-size: 0.875rem;
      }
      @media (max-width: 640px) {
        .score-display {
          flex-direction: column;
          text-align: center;
        }
        .candidate-info {
          min-width: auto;
        }
      }
    `,
  ],
})
export class ScoreDisplayComponent {
  @Input() score = 0;
  @Input() candidateName = '';
  @Input() candidateEmail = '';
  @Input() targetPosition = '';
}
