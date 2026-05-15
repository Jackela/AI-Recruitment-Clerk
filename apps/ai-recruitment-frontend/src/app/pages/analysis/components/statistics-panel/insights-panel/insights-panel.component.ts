import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PerformanceInsight } from '../types/statistics.interface';

@Component({
  selector: 'arc-insights-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-card">
      <h3>📈 使用洞察</h3>
      <div class="insights-list">
        <div class="insight-item" *ngFor="let insight of insights">
          <div class="insight-icon">{{ insight.icon }}</div>
          <div class="insight-text">{{ insight.text }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .insights-card {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: transform 0.2s ease;
      }
      .insights-card:hover {
        transform: translateY(-2px);
      }
      .insights-card h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 1.5rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .insights-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .insight-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: rgba(249, 250, 251, 0.6);
        border-radius: 8px;
      }
      .insight-icon {
        font-size: 1.125rem;
      }
      .insight-text {
        flex: 1;
        font-size: 0.875rem;
        color: #374151;
        line-height: 1.4;
      }
      @media (max-width: 1024px) {
        .insights-card {
          flex-shrink: 0;
          min-width: 300px;
        }
      }
      @media (max-width: 768px) {
        .insights-card {
          min-width: auto;
        }
      }
    `,
  ],
})
export class InsightsPanelComponent {
  @Input() insights: PerformanceInsight[] = [];
}
