import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'arc-stat-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-item">
      <div class="stat-content">
        <span class="stat-value" [title]="title || ''">
          {{ formattedValue }}<small *ngIf="suffix">{{ suffix }}</small>
        </span>
        <span class="stat-label">{{ label }}</span>
      </div>
      <div class="stat-icon" [class]="getIconClass()">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          [attr.width]="20"
          [attr.height]="20"
        >
          <ng-container [ngSwitch]="icon">
            <!-- Calendar Icon -->
            <g *ngSwitchCase="'calendar'">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </g>
            <!-- Check Icon -->
            <g *ngSwitchCase="'check'">
              <path d="M9 11l3 3 8-8"></path>
              <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1"></path>
            </g>
            <!-- Star Icon -->
            <g *ngSwitchCase="'star'">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              ></polygon>
            </g>
            <!-- Chart Icon -->
            <g *ngSwitchCase="'chart'">
              <path d="M3 3v18h18"></path>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
            </g>
            <!-- Check Circle Icon -->
            <g *ngSwitchCase="'check-circle'">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </g>
            <!-- Default Icon -->
            <circle *ngSwitchDefault cx="12" cy="12" r="10"></circle>
          </ng-container>
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
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
    `,
  ],
})
export class StatCardComponent {
  @Input() value = 0;
  @Input() label = '';
  @Input() icon: 'calendar' | 'check' | 'star' | 'chart' | 'check-circle' =
    'calendar';
  @Input() type: 'today' | 'total' | 'score' | 'monthly' | 'success' = 'today';
  @Input() scoreClass?: 'high' | 'medium' | 'low';
  @Input() suffix?: string;
  @Input() title?: string;

  get formattedValue(): string {
    if (this.value >= 1000000) {
      return (this.value / 1000000).toFixed(1) + 'M';
    }
    if (this.value >= 1000) {
      return (this.value / 1000).toFixed(1) + 'K';
    }
    return this.value.toString();
  }

  public getIconClass(): string {
    if (this.type === 'score' && this.scoreClass) {
      return `score ${this.scoreClass}`;
    }
    return this.type;
  }
}
