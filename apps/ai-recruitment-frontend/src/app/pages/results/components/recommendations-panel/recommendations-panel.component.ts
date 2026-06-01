import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'arc-recommendations-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="recommendations-card card">
      <h2>🤖 AI建议</h2>
      <div class="recommendations-content">
        <div class="recommendation-list" *ngIf="recommendations.length > 0">
          <div class="recommendation-item" *ngFor="let rec of recommendations">
            <span class="rec-icon">💡</span>
            <p>{{ rec }}</p>
          </div>
        </div>

        <div class="strengths-section" *ngIf="strengths.length > 0">
          <h4>优势分析</h4>
          <ul>
            <li *ngFor="let strength of strengths">{{ strength }}</li>
          </ul>
        </div>

        <div class="improvements-section" *ngIf="improvements.length > 0">
          <h4>改进建议</h4>
          <ul>
            <li *ngFor="let improvement of improvements">{{ improvement }}</li>
          </ul>
        </div>

        <div
          class="no-data"
          *ngIf="
            recommendations.length === 0 &&
            strengths.length === 0 &&
            improvements.length === 0
          "
        >
          <p>暂无AI建议</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .recommendations-card {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .recommendations-card h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      .recommendations-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .recommendation-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .recommendation-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem;
        background: rgba(251, 191, 36, 0.1);
        border-radius: 8px;
        border-left: 4px solid #f59e0b;
      }
      .rec-icon {
        flex-shrink: 0;
        font-size: 1.125rem;
      }
      .recommendation-item p {
        margin: 0;
        color: #4b5563;
        line-height: 1.5;
      }
      .strengths-section,
      .improvements-section {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 8px;
      }
      .strengths-section h4,
      .improvements-section h4 {
        font-size: 0.875rem;
        font-weight: 600;
        margin: 0 0 0.75rem 0;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
      .strengths-section h4 {
        color: #059669;
      }
      .improvements-section h4 {
        color: #dc2626;
      }
      .strengths-section ul,
      .improvements-section ul {
        margin: 0;
        padding-left: 1.25rem;
      }
      .strengths-section li,
      .improvements-section li {
        margin-bottom: 0.5rem;
        color: #4b5563;
        line-height: 1.5;
      }
      .strengths-section li:last-child,
      .improvements-section li:last-child {
        margin-bottom: 0;
      }
      .no-data {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
      }
    `,
  ],
})
export class RecommendationsPanelComponent {
  @Input() recommendations: string[] = [];
  @Input() strengths: string[] = [];
  @Input() improvements: string[] = [];
}
