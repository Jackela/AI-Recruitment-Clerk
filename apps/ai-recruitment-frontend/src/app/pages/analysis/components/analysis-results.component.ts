import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreVisualizationComponent } from './score-visualization.component';

/**
 * Defines the shape of the analysis result.
 */
export interface AnalysisResult {
  score: number;
  summary: string;
  keySkills: string[];
  experience: string;
  education: string;
  recommendations: string[];
  reportUrl?: string;
}

/**
 * Defines the shape of the result action.
 */
export interface ResultAction {
  type: 'view-detailed' | 'download-report' | 'start-new';
  payload?: any;
}

/**
 * Represents the analysis results component.
 */
@Component({
  selector: 'arc-analysis-results',
  standalone: true,
  imports: [CommonModule, ScoreVisualizationComponent],
  template: `
    <div class="results-container">
      <!-- Fantasy Header Section -->
      <header class="page-header" role="banner">
        <div class="header-content">
          <h1 class="page-title">分析完成</h1>
          <p class="page-subtitle">AI分析已完成，以下是您的综合评估结果</p>
        </div>
      </header>

      <div class="results-grid" *ngIf="result">
        <!-- Score Bento Card -->
        <article class="score-bento-card">
          <div class="card-header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 class="card-title">综合评分</h2>
          </div>
          <div class="card-body">
            <arc-score-visualization
              [score]="scoreValue"
              [summary]="summaryText"
              [showIndicator]="true"
              [animated]="true"
            >
            </arc-score-visualization>
          </div>
        </article>

        <!-- Skills Bento Card -->
        <article class="skills-bento-card" *ngIf="keySkills.length">
          <div class="card-header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
            </div>
            <h2 class="card-title">关键技能</h2>
            <span class="skills-count">{{ keySkills.length }} 项</span>
          </div>
          <div class="card-body">
            <div class="skill-tags">
              <span
                class="skill-tag"
                *ngFor="let skill of visibleSkills; trackBy: trackBySkill"
                [title]="'技能: ' + skill"
              >
                {{ skill }}
              </span>
            </div>
            <button
              *ngIf="keySkills.length > initialSkillCount"
              type="button"
              class="expand-btn"
              (click)="toggleSkillsExpanded()"
            >
              {{ skillsExpanded ? '收起' : '查看全部 ' + keySkills.length + ' 项技能' }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <polyline [attr.points]="skillsExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"></polyline>
              </svg>
            </button>
          </div>
        </article>

        <!-- Experience Bento Card -->
        <article class="info-bento-card experience-card" *ngIf="experienceText">
          <div class="card-header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <h2 class="card-title">工作经验</h2>
          </div>
          <div class="card-body">
            <p class="info-value">{{ experienceText }}</p>
            <p class="info-label">专业开发经验</p>
          </div>
        </article>

        <!-- Education Bento Card -->
        <article class="info-bento-card education-card" *ngIf="educationText">
          <div class="card-header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <h2 class="card-title">教育背景</h2>
          </div>
          <div class="card-body">
            <p class="info-value">{{ educationText }}</p>
            <p class="info-label">学历背景</p>
          </div>
        </article>

        <!-- Additional Stats Card -->
        <article class="stats-bento-card" *ngIf="showDetailedSummary">
          <div class="card-header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <line x1="12" y1="20" x2="12" y2="10"></line>
                <line x1="18" y1="20" x2="18" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="16"></line>
              </svg>
            </div>
            <h2 class="card-title">关键指标</h2>
          </div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">综合评估</span>
                <span class="stat-value" [class]="getScoreClass()">{{ getScoreCategory() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">技能匹配</span>
                <span class="stat-value">{{ keySkills.length }}/{{ totalRequiredSkills }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">推荐优先级</span>
                <span class="stat-value" [class]="getPriorityClass()">{{ getPriority() }}</span>
              </div>
            </div>
          </div>
        </article>

        <!-- Recommendations Bento Card (Full Width) -->
        <article class="recommendations-bento-card" *ngIf="recommendations.length">
          <div class="card-header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4M12 8h.01"></path>
              </svg>
            </div>
            <h2 class="card-title">发展建议</h2>
            <span class="recommendations-count">{{ recommendations.length }} 条建议</span>
          </div>
          <div class="card-body">
            <ul class="recommendations-list" role="list">
              <li
                *ngFor="let rec of recommendations; let i = index; trackBy: trackByRecommendation"
                class="recommendation-item"
                role="listitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span>{{ rec }}</span>
              </li>
            </ul>
          </div>
        </article>
      </div>

      <!-- Action Buttons -->
      <div class="results-actions">
        <button
          type="button"
          (click)="onAction('view-detailed')"
          class="btn-primary"
          [disabled]="isProcessing"
          [attr.aria-label]="'查看详细分析报告'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          <span>查看详细报告</span>
        </button>

        <button
          type="button"
          (click)="onAction('download-report')"
          class="btn-secondary"
          *ngIf="hasReport"
          [disabled]="isProcessing"
          [attr.aria-label]="'下载分析报告PDF文件'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>下载报告</span>
        </button>

        <button
          type="button"
          (click)="onAction('start-new')"
          class="btn-outline"
          [disabled]="isProcessing"
          [attr.aria-label]="'开始新的简历分析'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>新建分析</span>
        </button>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isProcessing" role="alert" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>正在处理请求...</p>
      </div>
    </div>
  `,
  styleUrls: ['./analysis-results.component.scss'],
})
export class AnalysisResultsComponent {
  @Input() result: AnalysisResult | null = null;
  @Input() showDetailedSummary = false;
  @Input() totalRequiredSkills = 10;
  @Input() isProcessing = false;

  @Output() actionRequested = new EventEmitter<ResultAction>();

  get keySkills(): string[] {
    const skills = this.result?.keySkills;
    if (!Array.isArray(skills)) {
      return [];
    }
    return skills
      .filter((skill): skill is string => typeof skill === 'string')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
  }

  get recommendations(): string[] {
    const recs = this.result?.recommendations;
    if (!Array.isArray(recs)) {
      return [];
    }
    return recs
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  get experienceText(): string {
    const experience = this.result?.experience;
    return typeof experience === 'string' ? experience.trim() : '';
  }

  get educationText(): string {
    const education = this.result?.education;
    return typeof education === 'string' ? education.trim() : '';
  }

  get summaryText(): string {
    const summary = this.result?.summary;
    return typeof summary === 'string' && summary.trim().length > 0
      ? summary.trim()
      : '暂无摘要';
  }

  get scoreValue(): number {
    const score = this.result?.score;
    if (typeof score === 'number' && Number.isFinite(score)) {
      return Math.max(0, Math.min(100, score));
    }
    return 0;
  }

  get hasReport(): boolean {
    const url = this.result?.reportUrl;
    return typeof url === 'string' && url.trim().length > 0;
  }

  /**
   * Performs the on action operation.
   * @param type - The type.
   */
  onAction(type: ResultAction['type']): void {
    this.actionRequested.emit({ type });
  }

  /**
   * Performs the track by skill operation.
   * @param _index - The index.
   * @param skill - The skill.
   * @returns The string value.
   */
  trackBySkill(_index: number, skill: string): string {
    return skill;
  }

  /**
   * Performs the track by recommendation operation.
   * @param _index - The index.
   * @param recommendation - The recommendation.
   * @returns The string value.
   */
  trackByRecommendation(_index: number, recommendation: string): string {
    return `${_index}-${recommendation.slice(0, 20)}`;
  }

  /**
   * Retrieves score category.
   * @returns The string value.
   */
  getScoreCategory(): string {
    if (!this.result) return '未知';
    const score = this.scoreValue;
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '待提升';
  }

  /**
   * Retrieves score class.
   * @returns The string value.
   */
  getScoreClass(): string {
    if (!this.result) return '';
    const score = this.scoreValue;
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Retrieves priority.
   * @returns The string value.
   */
  getPriority(): string {
    if (!this.result) return '未知';
    const score = this.scoreValue;
    if (score >= 85) return '高优先级';
    if (score >= 70) return '中优先级';
    if (score >= 50) return '低优先级';
    return '待考虑';
  }

  /**
   * Retrieves priority class.
   * @returns The string value.
   */
  getPriorityClass(): string {
    if (!this.result) return '';
    const score = this.scoreValue;
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  }

  // Skills expansion logic
  skillsExpanded = false;
  initialSkillCount = 8;

  get visibleSkills(): string[] {
    return this.skillsExpanded
      ? this.keySkills
      : this.keySkills.slice(0, this.initialSkillCount);
  }

  /**
   * Toggles skills expanded state.
   */
  toggleSkillsExpanded(): void {
    this.skillsExpanded = !this.skillsExpanded;
  }
}
