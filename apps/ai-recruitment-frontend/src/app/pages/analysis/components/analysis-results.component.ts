import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreVisualizationComponent } from './score-visualization.component';

export interface AnalysisResult {
  score: number;
  summary: string;
  keySkills: string[];
  experience: string;
  education: string;
  recommendations: string[];
  reportUrl?: string;
}

export interface ResultAction {
  type: 'view-detailed' | 'download-report' | 'start-new';
  payload?: any;
}

@Component({
  selector: 'arc-analysis-results',
  standalone: true,
  imports: [CommonModule, ScoreVisualizationComponent],
  template: `
    <div class="results-card" [@slideIn]>
      <div class="card-header">
        <h2>✅ 分析完成</h2>
        <p>AI分析已完成，以下是结果摘要</p>
      </div>

      <div class="results-content" *ngIf="result">
        <!-- Score Display -->
        <arc-score-visualization
          [score]="result.score"
          [summary]="result.summary"
          [showIndicator]="true"
          [animated]="true"
        >
        </arc-score-visualization>

        <!-- Key Insights -->
        <div class="insights-grid">
          <div class="insight-card" *ngIf="result.keySkills?.length">
            <h4>🎯 关键技能</h4>
            <div class="skill-tags">
              <span
                class="skill-tag"
                *ngFor="let skill of result.keySkills; trackBy: trackBySkill"
                [title]="'技能: ' + skill"
              >
                {{ skill }}
              </span>
            </div>
          </div>

          <div class="insight-card" *ngIf="result.experience">
            <h4>💼 工作经验</h4>
            <p>{{ result.experience }}</p>
          </div>

          <div class="insight-card" *ngIf="result.education">
            <h4>🎓 教育背景</h4>
            <p>{{ result.education }}</p>
          </div>
        </div>

        <!-- Recommendations -->
        <div
          class="recommendations-section"
          *ngIf="result.recommendations?.length"
        >
          <h4>📋 建议</h4>
          <ul class="recommendations-list" role="list">
            <li
              *ngFor="
                let rec of result.recommendations;
                trackBy: trackByRecommendation
              "
              role="listitem"
            >
              {{ rec }}
            </li>
          </ul>
        </div>

        <!-- Additional Analysis Details -->
        <div class="analysis-summary" *ngIf="showDetailedSummary">
          <h4>📊 分析详情</h4>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">技能匹配数</span>
              <span class="stat-value"
                >{{ result.keySkills.length || 0 }}/{{
                  totalRequiredSkills
                }}</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-label">综合评估</span>
              <span class="stat-value" [class]="getScoreClass()">{{
                getScoreCategory()
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">推荐优先级</span>
              <span class="stat-value" [class]="getPriorityClass()">{{
                getPriority()
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="results-actions">
        <button
          (click)="onAction('view-detailed')"
          class="primary-btn"
          [disabled]="isProcessing"
          aria-label="查看详细分析报告"
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          查看详细报告
        </button>

        <button
          (click)="onAction('download-report')"
          class="secondary-btn"
          *ngIf="result?.reportUrl"
          [disabled]="isProcessing"
          aria-label="下载分析报告PDF文件"
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          下载报告
        </button>

        <button
          (click)="onAction('start-new')"
          class="outline-btn"
          [disabled]="isProcessing"
          aria-label="开始新的简历分析"
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          新建分析
        </button>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isProcessing">
        <div class="loading-spinner"></div>
        <p>正在处理请求...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .results-content {
        margin-bottom: 2rem;
      }

      .insights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .insight-card {
        padding: 1.5rem;
        background: rgba(248, 250, 252, 0.8);
        border-radius: 16px;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
      }

      .insight-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        border-color: #d1d5db;
      }

      .insight-card h4 {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .insight-card p {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0;
      }

      .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .skill-tag {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        transition: transform 0.2s ease;
        cursor: default;
      }

      .skill-tag:hover {
        transform: scale(1.05);
      }

      .recommendations-section {
        background: rgba(236, 253, 245, 0.5);
        padding: 1.5rem;
        border-radius: 16px;
        border: 1px solid rgba(16, 185, 129, 0.2);
        margin-bottom: 2rem;
      }

      .recommendations-section h4 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .recommendations-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .recommendations-list li {
        color: #374151;
        font-size: 0.875rem;
        line-height: 1.6;
        margin-bottom: 0.75rem;
        padding-left: 1.5rem;
        position: relative;
      }

      .recommendations-list li:last-child {
        margin-bottom: 0;
      }

      .recommendations-list li::before {
        content: '•';
        color: #10b981;
        font-weight: 800;
        position: absolute;
        left: 0;
        top: 0;
      }

      .analysis-summary {
        background: rgba(243, 244, 246, 0.5);
        padding: 1.5rem;
        border-radius: 16px;
        border: 1px solid #e5e7eb;
        margin-bottom: 2rem;
      }

      .analysis-summary h4 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .stat-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
      }

      .stat-value.high {
        color: #10b981;
      }

      .stat-value.medium {
        color: #f59e0b;
      }

      .stat-value.low {
        color: #ef4444;
      }

      .results-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
        position: relative;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        border-radius: 24px;
        z-index: 10;
      }

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-overlay p {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0;
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
        .insights-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .results-actions {
          flex-direction: column;
        }

        .summary-stats {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  styleUrls: ['../unified-analysis.component.css'],
})
export class AnalysisResultsComponent {
  @Input() result: AnalysisResult | null = null;
  @Input() showDetailedSummary = false;
  @Input() totalRequiredSkills = 10;
  @Input() isProcessing = false;

  @Output() actionRequested = new EventEmitter<ResultAction>();

  onAction(type: ResultAction['type']): void {
    this.actionRequested.emit({ type });
  }

  trackBySkill(_index: number, skill: string): string {
    return skill;
  }

  trackByRecommendation(_index: number, recommendation: string): string {
    return `${_index}-${recommendation.slice(0, 20)}`;
  }

  getScoreCategory(): string {
    if (!this.result) return '未知';
    const score = this.result.score;
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '待提升';
  }

  getScoreClass(): string {
    if (!this.result) return '';
    const score = this.result.score;
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  getPriority(): string {
    if (!this.result) return '未知';
    const score = this.result.score;
    if (score >= 85) return '高优先级';
    if (score >= 70) return '中优先级';
    if (score >= 50) return '低优先级';
    return '待考虑';
  }

  getPriorityClass(): string {
    if (!this.result) return '';
    const score = this.result.score;
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  }
}
