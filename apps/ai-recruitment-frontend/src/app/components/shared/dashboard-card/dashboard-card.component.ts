import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents the dashboard card component.
 */
@Component({
  selector: 'arc-dashboard-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-card" [class]="variant">
      <div class="card-icon" *ngIf="icon">
        <ng-container [ngSwitch]="icon">
          <!-- Jobs icon -->
          <svg
            *ngSwitchCase="'jobs'"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>

          <!-- Resumes icon -->
          <svg
            *ngSwitchCase="'resumes'"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M14,2 L6,2 C4.9,2 4,2.9 4,4 L4,20 C4,21.1 4.89,22 5.99,22 L18,22 C19.1,22 20,21.1 20,20 L20,8 L14,2 Z"
            ></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>

          <!-- Reports icon -->
          <svg
            *ngSwitchCase="'reports'"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>

          <!-- Matches icon -->
          <svg
            *ngSwitchCase="'matches'"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </ng-container>
      </div>

      <div class="card-content">
        <div class="card-value">{{ value }}</div>
        <div class="card-title">{{ title }}</div>
        <div class="card-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
      </div>

      <div class="card-trend" *ngIf="trend">
        <span class="trend-indicator" [class]="'trend-' + trend.type">
          <svg
            *ngIf="trend.type === 'up'"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <svg
            *ngIf="trend.type === 'down'"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
          </svg>
          {{ trend.value }}
        </span>
      </div>
    </div>
  `,
  styles: [
    `
    .dashboard-card {
      background: var(--color-bg-primary);
      border-radius: var(--radius-2xl);
      padding: var(--space-6);
      box-shadow: var(--shadow-lg);
      transition: all var(--transition-base);
      border: 1px solid var(--color-border-secondary);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--color-primary-300), transparent);
        opacity: 0;
        transition: opacity var(--transition-base);
      }
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-2xl);
        border-color: var(--color-primary-300);
        
        &::before {
          opacity: 1;
        }
      }
      
      &:active {
        transform: translateY(-2px);
      }
      
      &.primary {
        background: linear-gradient(135deg, var(--color-primary-600), var(--color-royal-600));
        color: white;
        border-color: var(--color-primary-500);
        
        .card-icon {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      }
      
      &.success {
        background: linear-gradient(135deg, var(--color-success-600), var(--color-emerald-600));
        color: white;
        border-color: var(--color-success-500);
        
        .card-icon {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      }
      
      &.warning {
        background: linear-gradient(135deg, var(--color-warning-600), var(--color-ember-600));
        color: white;
        border-color: var(--color-warning-500);
        
        .card-icon {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      }
      
      &.info {
        background: linear-gradient(135deg, var(--color-info-100), var(--color-moonlight-100));
        color: var(--color-text-fantasy);
        border-color: var(--color-info-200);
        
        .card-icon {
          background: linear-gradient(135deg, var(--color-info-100), var(--color-info-50));
          color: var(--color-info-700);
          border: 1px solid var(--color-info-200);
        }
      }
    }
    
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
      color: var(--color-primary-800);
      margin-bottom: var(--space-4);
      border: 1px solid var(--color-primary-200);
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-base);
      
      .dashboard-card:hover & {
        transform: scale(1.05);
        box-shadow: var(--shadow-md);
      }
    }
    
    .card-content {
      margin-bottom: var(--space-4);
    }
    
    .card-value {
      font-family: var(--font-family-fantasy-heading);
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-fantasy-h1);
      line-height: var(--line-height-tight);
      margin-bottom: var(--space-1);
      background: linear-gradient(135deg, var(--color-primary-800), var(--color-royal-700));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }
    
    .card-title {
      font-family: var(--font-family-fantasy-heading);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-fantasy-large);
      margin-bottom: var(--space-1);
      color: var(--color-text-fantasy);
      opacity: 0.95;
      letter-spacing: -0.01em;
    }
    
    .card-subtitle {
      font-family: var(--font-family-body);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      opacity: 0.8;
      line-height: var(--line-height-normal);
      color: var(--color-text-secondary);
    }
    
    .card-trend {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    
    .trend-indicator {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-family: var(--font-family-body);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-lg);
      transition: all var(--transition-base);
      
      &.trend-up {
        color: var(--color-success-700);
        background: linear-gradient(135deg, var(--color-success-50), var(--color-emerald-50));
        border: 1px solid var(--color-success-200);
        
        svg {
          filter: drop-shadow(0 1px 2px rgba(16, 185, 129, 0.2));
        }
      }
      
      &.trend-down {
        color: var(--color-error-700);
        background: linear-gradient(135deg, var(--color-error-50), var(--color-error-100));
        border: 1px solid var(--color-error-200);
        
        svg {
          filter: drop-shadow(0 1px 2px rgba(239, 68, 68, 0.2));
        }
      }
    }
    \n    /* Responsive design */\n    @media (max-width: 768px) {\n      .dashboard-card {\n        padding: var(--space-4);\n        \n        &:hover {\n          transform: translateY(-2px);\n        }\n      }\n      \n      .card-icon {\n        width: 40px;\n        height: 40px;\n        margin-bottom: var(--space-3);\n      }\n      \n      .card-value {\n        font-size: var(--font-size-2xl);\n      }\n      \n      .card-title {\n        font-size: var(--font-size-sm);\n      }\n      \n      .card-subtitle {\n        font-size: var(--font-size-xs);\n      }\n      \n      .trend-indicator {\n        font-size: var(--font-size-xs);\n        padding: var(--space-0-5) var(--space-1-5);\n      }\n    }\n    \n    @media (max-width: 480px) {\n      .dashboard-card {\n        padding: var(--space-3);\n      }\n      \n      .card-icon {\n        width: 36px;\n        height: 36px;\n      }\n      \n      .card-value {\n        font-size: var(--font-size-xl);\n      }\n    }\n  `,
  ],
})
export class DashboardCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() value = '';
  @Input() icon: 'jobs' | 'resumes' | 'reports' | 'matches' | null = null;
  @Input() variant: 'default' | 'primary' | 'success' | 'warning' | 'info' =
    'default';
  @Input() trend: { type: 'up' | 'down'; value: string } | null = null;
}
