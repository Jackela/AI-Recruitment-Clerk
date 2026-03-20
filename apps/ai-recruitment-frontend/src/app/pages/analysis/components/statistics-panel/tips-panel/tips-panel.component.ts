import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  UsageTip,
  TipCategory} from '../types/statistics.interface';
import {
  CATEGORY_LABELS,
} from '../types/statistics.interface';

@Component({
  selector: 'arc-tips-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tips-card">
      <h3>💡 使用提示</h3>
      <div class="tips-container">
        <div class="tip-categories" *ngIf="showCategories">
          <button
            *ngFor="let category of tipCategories"
            (click)="onSelectCategory(category)"
            [class.active]="selectedCategory === category"
            class="category-btn"
          >
            {{ getCategoryLabel(category) }}
          </button>
        </div>

        <ul class="tips-list" role="list">
          <li
            *ngFor="let tip of getFilteredTips(); trackBy: trackByTip"
            role="listitem"
            class="tip-item"
          >
            <div class="tip-icon">{{ tip.icon }}</div>
            <div class="tip-content">
              <strong class="tip-title">{{ tip.title }}</strong>
              <span class="tip-description">{{ tip.description }}</span>
            </div>
          </li>
        </ul>

        <button
          (click)="showMoreTips()"
          class="more-tips-btn"
          *ngIf="hasMoreTips"
          [disabled]="isLoadingTips"
        >
          {{ isLoadingTips ? '加载中...' : '查看更多提示' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tips-card {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: transform 0.2s ease;
      }
      .tips-card:hover {
        transform: translateY(-2px);
      }
      .tips-card h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 1.5rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
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
      @media (max-width: 1024px) {
        .tips-card {
          flex-shrink: 0;
          min-width: 300px;
        }
      }
      @media (max-width: 768px) {
        .tips-card {
          min-width: auto;
        }
        .tip-categories {
          justify-content: center;
        }
      }
    `,
  ],
})
export class TipsPanelComponent {
  @Input() tips: UsageTip[] = [];
  @Input() showCategories = false;
  @Input() selectedCategory: TipCategory = 'general';
  @Input() isLoadingTips = false;
  @Input() hasMoreTips = false;

  @Output() categoryChanged = new EventEmitter<TipCategory>();
  @Output() moreTipsRequested = new EventEmitter<void>();

  public tipCategories: TipCategory[] = [
    'general',
    'file',
    'accuracy',
    'analysis',
  ];

  getCategoryLabel(category: TipCategory): string {
    return CATEGORY_LABELS[category] || category;
  }

  getFilteredTips(): UsageTip[] {
    if (!this.showCategories) {
      return this.tips;
    }
    return this.tips.filter(
      (tip) =>
        tip.category === this.selectedCategory ||
        (!tip.category && this.selectedCategory === 'general'),
    );
  }

  onSelectCategory(category: TipCategory): void {
    this.categoryChanged.emit(category);
  }

  showMoreTips(): void {
    this.moreTipsRequested.emit();
  }

  trackByTip(_index: number, tip: UsageTip): string {
    return `${tip.title}-${tip.description.slice(0, 20)}`;
  }
}
