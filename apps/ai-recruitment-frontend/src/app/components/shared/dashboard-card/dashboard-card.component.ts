import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-card',
  template: `
    <div class="dashboard-card" [class]="variant">
      <div class="card-icon" *ngIf="icon">
        <ng-container [ngSwitch]="icon">
          <!-- Jobs icon -->
          <svg *ngSwitchCase="'jobs'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          
          <!-- Resumes icon -->
          <svg *ngSwitchCase="'resumes'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2 L6,2 C4.9,2 4,2.9 4,4 L4,20 C4,21.1 4.89,22 5.99,22 L18,22 C19.1,22 20,21.1 20,20 L20,8 L14,2 Z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          
          <!-- Reports icon -->
          <svg *ngSwitchCase="'reports'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          
          <!-- Matches icon -->
          <svg *ngSwitchCase="'matches'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
          <svg *ngIf="trend.type === 'up'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <svg *ngIf="trend.type === 'down'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
          </svg>
          {{ trend.value }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      border: 1px solid rgba(0, 0, 0, 0.05);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      &.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        
        .card-icon {
          background: rgba(255, 255, 255, 0.2);
        }
      }
      
      &.success {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
        
        .card-icon {
          background: rgba(255, 255, 255, 0.2);
        }
      }
      
      &.warning {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        color: white;
        
        .card-icon {
          background: rgba(255, 255, 255, 0.2);
        }
      }
      
      &.info {
        background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        color: #2c3e50;
        
        .card-icon {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
        }
      }
    }
    
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
      margin-bottom: 1rem;
    }
    
    .card-content {
      margin-bottom: 1rem;
    }
    
    .card-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.25rem;
    }
    
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      opacity: 0.9;
    }
    
    .card-subtitle {
      font-size: 0.875rem;
      opacity: 0.7;
      line-height: 1.4;
    }
    
    .card-trend {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .trend-indicator {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      
      &.trend-up {
        color: #10b981;
      }
      
      &.trend-down {
        color: #ef4444;
      }
    }
  `]
})
export class DashboardCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() value = '';
  @Input() icon: 'jobs' | 'resumes' | 'reports' | 'matches' | null = null;
  @Input() variant: 'default' | 'primary' | 'success' | 'warning' | 'info' = 'default';
  @Input() trend: { type: 'up' | 'down', value: string } | null = null;
}