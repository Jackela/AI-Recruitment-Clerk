import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UsageStatistics {
  todayAnalyses: number;
  totalAnalyses: number;
  averageScore: number;
  monthlyAnalyses?: number;
  successRate?: number;
}

export interface UsageTip {
  icon: string;
  title: string;
  description: string;
  category?: 'file' | 'accuracy' | 'analysis' | 'general';
}

@Component({
  selector: 'arc-statistics-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="side-panel">
      <!-- Usage Statistics Card -->
      <div class="stats-card">
        <h3>📊 使用统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-content">
              <span class="stat-value" [title]="'今日已完成 ' + statistics.todayAnalyses + ' 次分析'">
                {{ statistics.todayAnalyses }}
              </span>
              <span class="stat-label">今日分析</span>
            </div>
            <div class="stat-icon today">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-content">
              <span class="stat-value" [title]="'累计完成 ' + statistics.totalAnalyses + ' 次分析'">
                {{ formatNumber(statistics.totalAnalyses) }}
              </span>
              <span class="stat-label">总计分析</span>
            </div>
            <div class="stat-icon total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3 8-8"></path>
                <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1"></path>
              </svg>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-content">
              <span class="stat-value" [title]="'平均匹配分数为 ' + statistics.averageScore + ' 分'">
                {{ statistics.averageScore }}<small>分</small>
              </span>
              <span class="stat-label">平均得分</span>
            </div>
            <div class="stat-icon score" [class]="getScoreClass()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
              </svg>
            </div>
          </div>

          <!-- Additional Statistics -->
          <div class="stat-item" *ngIf="statistics.monthlyAnalyses">
            <div class="stat-content">
              <span class="stat-value">{{ statistics.monthlyAnalyses }}</span>
              <span class="stat-label">本月分析</span>
            </div>
            <div class="stat-icon monthly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"></path>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
              </svg>
            </div>
          </div>

          <div class="stat-item" *ngIf="statistics.successRate">
            <div class="stat-content">
              <span class="stat-value">{{ statistics.successRate }}<small>%</small></span>
              <span class="stat-label">成功率</span>
            </div>
            <div class="stat-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <!-- Progress Indicator for Daily Limit -->
        <div class="daily-progress" *ngIf="showDailyLimit">
          <div class="progress-header">
            <span class="progress-label">今日使用进度</span>
            <span class="progress-value">{{ statistics.todayAnalyses }}/{{ dailyLimit }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="getDailyProgressPercentage()"></div>
          </div>
        </div>
      </div>

      <!-- Usage Tips Card -->
      <div class="tips-card">
        <h3>💡 使用提示</h3>
        <div class="tips-container">
          <div class="tip-categories" *ngIf="showCategories">
            <button *ngFor="let category of tipCategories" 
                    (click)="selectCategory(category)"
                    [class.active]="selectedCategory === category"
                    class="category-btn">
              {{ getCategoryLabel(category) }}
            </button>
          </div>
          
          <ul class="tips-list" role="list">
            <li *ngFor="let tip of getFilteredTips(); trackBy: trackByTip" 
                role="listitem"
                class="tip-item">
              <div class="tip-icon">{{ tip.icon }}</div>
              <div class="tip-content">
                <strong class="tip-title">{{ tip.title }}</strong>
                <span class="tip-description">{{ tip.description }}</span>
              </div>
            </li>
          </ul>
          
          <button (click)="showMoreTips()" 
                  class="more-tips-btn" 
                  *ngIf="hasMoreTips()"
                  [disabled]="isLoadingTips">
            {{ isLoadingTips ? '加载中...' : '查看更多提示' }}
          </button>
        </div>
      </div>

      <!-- Performance Insights -->
      <div class="insights-card" *ngIf="showInsights">
        <h3>📈 使用洞察</h3>
        <div class="insights-list">
          <div class="insight-item" *ngFor="let insight of performanceInsights">
            <div class="insight-icon">{{ insight.icon }}</div>
            <div class="insight-text">{{ insight.text }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .side-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stats-card,
    .tips-card,
    .insights-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      transition: transform 0.2s ease;
    }

    .stats-card:hover,
    .tips-card:hover,
    .insights-card:hover {
      transform: translateY(-2px);
    }

    .stats-card h3,
    .tips-card h3,
    .insights-card h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 1.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stats-grid {
      display: grid;
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: rgba(248, 250, 252, 0.6);
      border-radius: 12px;
      border: 1px solid #f1f5f9;
      transition: all 0.2s ease;
    }

    .stat-item:hover {
      background: rgba(248, 250, 252, 0.8);
      border-color: #e2e8f0;
      transform: translateX(2px);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1f2937;
      line-height: 1;
    }

    .stat-value small {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
    }

    .stat-label {
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon svg {
      width: 20px;
      height: 20px;
    }

    .stat-icon.today {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }

    .stat-icon.total {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .stat-icon.score.high {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .stat-icon.score.medium {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }

    .stat-icon.score.low {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }

    .stat-icon.monthly {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
    }

    .stat-icon.success {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .daily-progress {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .progress-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .progress-value {
      font-size: 0.875rem;
      color: #1f2937;
      font-weight: 600;
    }

    .progress-bar {
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .tip-categories {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .category-btn {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      background: white;
      color: #6b7280;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .category-btn:hover,
    .category-btn.active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tip-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(249, 250, 251, 0.6);
      border-radius: 12px;
      transition: background 0.2s ease;
    }

    .tip-item:hover {
      background: rgba(249, 250, 251, 0.8);
    }

    .tip-item:last-child {
      margin-bottom: 0;
    }

    .tip-icon {
      font-size: 1.125rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .tip-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .tip-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.3;
    }

    .tip-description {
      font-size: 0.8125rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .more-tips-btn {
      width: 100%;
      padding: 0.75rem;
      margin-top: 1rem;
      background: rgba(243, 244, 246, 0.8);
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .more-tips-btn:hover:not(:disabled) {
      background: rgba(243, 244, 246, 1);
      color: #374151;
    }

    .more-tips-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      .side-panel {
        flex-direction: row;
        overflow-x: auto;
        gap: 1rem;
      }
      
      .stats-card,
      .tips-card,
      .insights-card {
        flex-shrink: 0;
        min-width: 300px;
      }
    }

    @media (max-width: 768px) {
      .side-panel {
        flex-direction: column;
      }
      
      .stats-card,
      .tips-card,
      .insights-card {
        min-width: auto;
      }
      
      .stat-item {
        padding: 0.75rem;
      }
      
      .stat-value {
        font-size: 1.25rem;
      }
      
      .tip-categories {
        justify-content: center;
      }
    }
  `],
  styleUrls: ['../unified-analysis.component.css']
})
export class StatisticsPanelComponent {
  @Input() statistics: UsageStatistics = {
    todayAnalyses: 0,
    totalAnalyses: 0,
    averageScore: 0
  };
  
  @Input() showDailyLimit = false;
  @Input() dailyLimit = 10;
  @Input() showCategories = false;
  @Input() showInsights = false;

  @Output() tipCategoryChanged = new EventEmitter<string>();
  @Output() moreTipsRequested = new EventEmitter<void>();

  selectedCategory = 'general';
  isLoadingTips = false;
  
  tipCategories = ['general', 'file', 'accuracy', 'analysis'];
  
  usageTips: UsageTip[] = [
    { icon: '📄', title: '文件质量', description: '确保简历文件清晰完整，避免图片格式简历', category: 'file' },
    { icon: '📝', title: '内容完整', description: '包含详细的工作经验和技能描述', category: 'accuracy' },
    { icon: '🎯', title: '职位匹配', description: '提供目标职位可显著提高匹配精度', category: 'accuracy' },
    { icon: '💾', title: '保存结果', description: '分析结果可下载保存，便于后续对比', category: 'general' },
    { icon: '⚡', title: '快速上传', description: '支持拖拽上传，操作更便捷', category: 'file' },
    { icon: '🔍', title: '详细分析', description: '查看详细报告了解候选人各维度表现', category: 'analysis' }
  ];

  performanceInsights = [
    { icon: '🚀', text: '今日分析效率比昨日提升15%' },
    { icon: '📊', text: '本周平均匹配度较上周上升8分' },
    { icon: '⏰', text: '平均分析时间: 2分30秒' }
  ];

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getScoreClass(): string {
    if (this.statistics.averageScore >= 80) return 'high';
    if (this.statistics.averageScore >= 60) return 'medium';
    return 'low';
  }

  getDailyProgressPercentage(): number {
    return Math.min((this.statistics.todayAnalyses / this.dailyLimit) * 100, 100);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.tipCategoryChanged.emit(category);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      general: '通用',
      file: '文件',
      accuracy: '准确性',
      analysis: '分析'
    };
    return labels[category] || category;
  }

  getFilteredTips(): UsageTip[] {
    if (!this.showCategories) {
      return this.usageTips;
    }
    return this.usageTips.filter(tip => 
      tip.category === this.selectedCategory || 
      (!tip.category && this.selectedCategory === 'general')
    );
  }

  trackByTip(_index: number, tip: UsageTip): string {
    return `${tip.title}-${tip.description.slice(0, 20)}`;
  }

  hasMoreTips(): boolean {
    return false; // Placeholder for pagination
  }

  async showMoreTips(): Promise<void> {
    this.isLoadingTips = true;
    this.moreTipsRequested.emit();
    // Simulate loading
    setTimeout(() => {
      this.isLoadingTips = false;
    }, 1000);
  }
}