import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreDisplayComponent } from '../score-display/score-display.component';

@Component({
  selector: 'arc-result-overview',
  standalone: true,
  imports: [CommonModule, ScoreDisplayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overview-card card">
      <h2>📊 分析概览</h2>
      <div class="overview-content">
        <arc-score-display
          [score]="score"
          [candidateName]="candidateName"
          [candidateEmail]="candidateEmail"
          [targetPosition]="targetPosition"
        ></arc-score-display>
        <div class="analysis-time" *ngIf="analysisTime">
          <p>分析时间: {{ analysisTime }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .overview-card {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .overview-card h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      .overview-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .analysis-time {
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class ResultOverviewComponent {
  @Input() score = 0;
  @Input() candidateName = '';
  @Input() candidateEmail = '';
  @Input() targetPosition = '';
  @Input() analysisTime = '';
}
