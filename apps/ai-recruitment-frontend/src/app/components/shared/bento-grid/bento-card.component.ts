import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BentoCardData {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: string;
  badge?: string;
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  metrics?: Array<{
    label: string;
    value: string | number;
    trend?: {
      type: 'up' | 'down' | 'neutral';
      value: string;
    };
  }>;
  actions?: Array<{
    label: string;
    icon?: string;
    primary?: boolean;
    onClick: () => void;
  }>;
  status?: 'active' | 'inactive' | 'warning' | 'error' | 'success';
}

@Component({
  selector: 'app-bento-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bento-card" [class]="getCardClasses()">
      <!-- Header -->
      <div class="card-header" *ngIf="data.icon || data.badge || data.title">
        <div class="header-left">
          <div class="card-icon" *ngIf="data.icon" [attr.aria-hidden]="'true'">
            <ng-container [ngSwitch]="data.icon">
              <!-- Stats Icons -->
              <svg *ngSwitchCase="'stats'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              
              <!-- Users Icon -->
              <svg *ngSwitchCase="'users'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              
              <!-- Trend Up Icon -->
              <svg *ngSwitchCase="'trend-up'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              
              <!-- Clock Icon -->
              <svg *ngSwitchCase="'clock'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12,6 12,12 16,14"></polyline>
              </svg>
              
              <!-- Target Icon -->
              <svg *ngSwitchCase="'target'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
              
              <!-- Default Dashboard Icon -->
              <svg *ngSwitchDefault width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </ng-container>
          </div>
          
          <div class="header-text" *ngIf="data.title">
            <h3 class="card-title">{{ data.title }}</h3>
            <p class="card-subtitle" *ngIf="data.subtitle">{{ data.subtitle }}</p>
          </div>
        </div>
        
        <div class="card-badge" *ngIf="data.badge" [class]="'badge-' + (data.status || 'default')">
          {{ data.badge }}
        </div>
      </div>
      
      <!-- Value Display -->
      <div class="card-value-section" *ngIf="data.value !== undefined">
        <div class="card-value" [attr.aria-live]="'polite'">
          {{ formatValue(data.value) }}
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="card-progress" *ngIf="data.progress" [attr.aria-label]="getProgressLabel()">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="getProgressPercentage()"></div>
        </div>
        <div class="progress-text">
          <span class="progress-value">{{ data.progress.value }} / {{ data.progress.max }}</span>
          <span class="progress-label" *ngIf="data.progress.label">{{ data.progress.label }}</span>
        </div>
      </div>
      
      <!-- Metrics List -->
      <div class="card-metrics" *ngIf="data.metrics && data.metrics.length > 0">
        <div 
          class="metric-item" 
          *ngFor="let metric of data.metrics; trackBy: trackByMetricLabel"
          [attr.aria-label]="getMetricAriaLabel(metric)">
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-value-container">
            <span class="metric-value">{{ formatValue(metric.value) }}</span>
            <span 
              class="metric-trend" 
              *ngIf="metric.trend"
              [class]="'trend-' + metric.trend.type"
              [attr.aria-label]="getTrendAriaLabel(metric.trend)">
              <svg *ngIf="metric.trend.type === 'up'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              <svg *ngIf="metric.trend.type === 'down'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                <polyline points="17 18 23 18 23 12"></polyline>
              </svg>
              <svg *ngIf="metric.trend.type === 'neutral'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {{ metric.trend.value }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="card-actions" *ngIf="data.actions && data.actions.length > 0">
        <button 
          *ngFor="let action of data.actions; trackBy: trackByActionLabel"
          class="card-action-btn"
          [class.primary]="action.primary"
          (click)="onActionClick(action)"
          [attr.aria-label]="action.label">
          <svg *ngIf="action.icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <ng-container [ngSwitch]="action.icon">
              <path *ngSwitchCase="'plus'" d="M12 5v14m-7-7h14"></path>
              <path *ngSwitchCase="'eye'" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle *ngSwitchCase="'eye'" cx="12" cy="12" r="3"></circle>
              <path *ngSwitchCase="'edit'" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              <path *ngSwitchCase="'download'" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
              <path *ngSwitchDefault d="M9 5l7 7-7 7"></path>
            </ng-container>
          </svg>
          {{ action.label }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .bento-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
    }
    
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
      flex-shrink: 0;
    }
    
    .header-text {
      flex: 1;
      min-width: 0; /* Prevent text overflow */
    }
    
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
      line-height: 1.4;
      color: inherit;
    }
    
    .card-subtitle {
      font-size: 0.875rem;
      margin: 0;
      opacity: 0.8;
      line-height: 1.4;
    }
    
    .card-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      flex-shrink: 0;
      
      &.badge-active {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }
      
      &.badge-inactive {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }
      
      &.badge-warning {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }
      
      &.badge-error {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }
      
      &.badge-success {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }
      
      &.badge-default {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }
    }
    
    .card-value-section {
      margin: 0.5rem 0;
    }
    
    .card-value {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1;
      color: inherit;
    }
    
    .card-progress {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }
    
    .progress-value {
      font-weight: 600;
    }
    
    .progress-label {
      opacity: 0.8;
    }
    
    .card-metrics {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      
      &:last-child {
        border-bottom: none;
      }
    }
    
    .metric-label {
      font-size: 0.875rem;
      opacity: 0.8;
      flex: 1;
    }
    
    .metric-value-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .metric-value {
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .metric-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      
      &.trend-up {
        color: #10b981;
      }
      
      &.trend-down {
        color: #ef4444;
      }
      
      &.trend-neutral {
        color: #6b7280;
      }
    }
    
    .card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
      flex-wrap: wrap;
    }
    
    .card-action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.8);
      color: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(0, 0, 0, 0.2);
        transform: translateY(-1px);
      }
      
      &.primary {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.3);
        color: #3b82f6;
        
        &:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
        }
      }
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      
      .card-value {
        font-size: 1.875rem;
      }
      
      .card-actions {
        flex-direction: column;
      }
      
      .card-action-btn {
        justify-content: center;
      }
    }
    
    /* Animation for value changes */
    .card-value {
      animation: valueUpdate 0.5s ease-out;
    }
    
    @keyframes valueUpdate {
      0% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }
  `]
})
export class BentoCardComponent {
  @Input() data!: BentoCardData;
  @Output() actionClick = new EventEmitter<any>();

  getCardClasses(): string {
    const classes = ['bento-card'];
    
    if (this.data.status) {
      classes.push(`status-${this.data.status}`);
    }
    
    return classes.join(' ');
  }

  formatValue(value: string | number): string {
    if (typeof value === 'number') {
      // Format large numbers with appropriate suffixes
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toString();
    }
    return value;
  }

  getProgressPercentage(): number {
    if (!this.data.progress) return 0;
    return Math.min((this.data.progress.value / this.data.progress.max) * 100, 100);
  }

  getProgressLabel(): string {
    if (!this.data.progress) return '';
    const percentage = this.getProgressPercentage().toFixed(0);
    return `Progress: ${percentage}% (${this.data.progress.value} of ${this.data.progress.max})`;
  }

  getMetricAriaLabel(metric: any): string {
    let label = `${metric.label}: ${this.formatValue(metric.value)}`;
    if (metric.trend) {
      const direction = metric.trend.type === 'up' ? 'increased' : 
                       metric.trend.type === 'down' ? 'decreased' : 'unchanged';
      label += `, ${direction} by ${metric.trend.value}`;
    }
    return label;
  }

  getTrendAriaLabel(trend: any): string {
    const direction = trend.type === 'up' ? 'increased' : 
                     trend.type === 'down' ? 'decreased' : 'unchanged';
    return `Trend: ${direction} by ${trend.value}`;
  }

  onActionClick(action: any): void {
    this.actionClick.emit(action);
    if (action.onClick) {
      action.onClick();
    }
  }

  trackByMetricLabel(_index: number, metric: any): string {
    return metric.label;
  }

  trackByActionLabel(_index: number, action: any): string {
    return action.label;
  }
}