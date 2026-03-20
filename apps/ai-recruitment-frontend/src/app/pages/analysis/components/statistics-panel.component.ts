import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from './statistics-panel/stat-card/stat-card.component';
import { TipsPanelComponent } from './statistics-panel/tips-panel/tips-panel.component';
import { InsightsPanelComponent } from './statistics-panel/insights-panel/insights-panel.component';
import {
  UsageStatistics,
  UsageTip,
  TipCategory,
} from './statistics-panel/types/statistics.interface';
import {
  createStatCards,
  getDailyProgressPercentage,
} from './statistics-panel/utils/statistics.utils';

/**
 * Statistics panel with usage stats, tips, and insights.
 */
@Component({
  selector: 'arc-statistics-panel',
  standalone: true,
  imports: [
    CommonModule,
    StatCardComponent,
    TipsPanelComponent,
    InsightsPanelComponent,
  ],
  template: `
    <div class="side-panel">
      <div class="stats-card">
        <h3>📊 使用统计</h3>
        <div class="stats-grid">
          <arc-stat-card
            *ngFor="let card of statCards"
            [value]="card.value"
            [label]="card.label"
            [icon]="card.icon"
            [type]="card.type"
            [scoreClass]="card.scoreClass"
            [suffix]="card.suffix"
            [title]="card.title"
          ></arc-stat-card>
        </div>
        <div class="daily-progress" *ngIf="showDailyLimit">
          <div class="progress-header">
            <span class="progress-label">今日使用进度</span>
            <span class="progress-value"
              >{{ statistics.todayAnalyses }}/{{ dailyLimit }}</span
            >
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="progressPercentage"
            ></div>
          </div>
        </div>
      </div>

      <arc-tips-panel
        [tips]="usageTips"
        [showCategories]="showCategories"
        [selectedCategory]="selectedCategory"
        [isLoadingTips]="isLoadingTips"
        [hasMoreTips]="hasMoreTips()"
        (categoryChanged)="onCategoryChanged($event)"
        (moreTipsRequested)="onMoreTipsRequested()"
      ></arc-tips-panel>

      <arc-insights-panel
        *ngIf="showInsights"
        [insights]="performanceInsights"
      ></arc-insights-panel>
    </div>
  `,
  styles: [
    `
      .side-panel {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .stats-card {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: transform 0.2s ease;
      }
      .stats-card:hover {
        transform: translateY(-2px);
      }
      .stats-card h3 {
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
      @media (max-width: 1024px) {
        .side-panel {
          flex-direction: row;
          overflow-x: auto;
          gap: 1rem;
        }
        .stats-card {
          flex-shrink: 0;
          min-width: 300px;
        }
      }
      @media (max-width: 768px) {
        .side-panel {
          flex-direction: column;
        }
        .stats-card {
          min-width: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsPanelComponent {
  @Input() statistics: UsageStatistics = {
    todayAnalyses: 0,
    totalAnalyses: 0,
    averageScore: 0,
  };
  @Input() showDailyLimit = false;
  @Input() dailyLimit = 10;
  @Input() showCategories = false;
  @Input() showInsights = false;
  @Output() tipCategoryChanged = new EventEmitter<string>();
  @Output() moreTipsRequested = new EventEmitter<void>();

  selectedCategory: TipCategory = 'general';
  isLoadingTips = false;

  usageTips: UsageTip[] = [
    {
      icon: '📄',
      title: '文件质量',
      description: '确保简历文件清晰完整，避免图片格式简历',
      category: 'file',
    },
    {
      icon: '📝',
      title: '内容完整',
      description: '包含详细的工作经验和技能描述',
      category: 'accuracy',
    },
    {
      icon: '🎯',
      title: '职位匹配',
      description: '提供目标职位可显著提高匹配精度',
      category: 'accuracy',
    },
    {
      icon: '💾',
      title: '保存结果',
      description: '分析结果可下载保存，便于后续对比',
      category: 'general',
    },
    {
      icon: '⚡',
      title: '快速上传',
      description: '支持拖拽上传，操作更便捷',
      category: 'file',
    },
    {
      icon: '🔍',
      title: '详细分析',
      description: '查看详细报告了解候选人各维度表现',
      category: 'analysis',
    },
  ];

  performanceInsights = [
    { icon: '🚀', text: '今日分析效率比昨日提升15%' },
    { icon: '📊', text: '本周平均匹配度较上周上升8分' },
    { icon: '⏰', text: '平均分析时间: 2分30秒' },
  ];

  get statCards() {
    return createStatCards(this.statistics);
  }
  get progressPercentage() {
    return getDailyProgressPercentage(
      this.statistics.todayAnalyses,
      this.dailyLimit,
    );
  }

  onCategoryChanged(category: TipCategory): void {
    this.selectedCategory = category;
    this.tipCategoryChanged.emit(category);
  }

  onMoreTipsRequested(): void {
    this.isLoadingTips = true;
    this.moreTipsRequested.emit();
    setTimeout(() => {
      this.isLoadingTips = false;
    }, 1000);
  }

  hasMoreTips(): boolean {
    return false;
  }
}
