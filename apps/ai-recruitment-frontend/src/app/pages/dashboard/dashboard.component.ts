import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SharedModule } from '../../components/shared/shared.module';

interface DashboardStats {
  totalJobs: number;
  totalResumes: number;
  totalReports: number;
  activeMatches: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'job-created' | 'resume-uploaded' | 'report-generated' | 'match-found';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'processing' | 'completed' | 'failed';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
  template: `
    <div class="dashboard-container" role="main" aria-labelledby="dashboard-title">
      <!-- Welcome Header -->
      <header class="welcome-section" role="banner">
        <h1 id="dashboard-title" class="welcome-title">
          <span class="sr-only">Dashboard - </span>
          欢迎使用 AI 招聘助理
        </h1>
        <p class="welcome-subtitle" role="doc-subtitle">智能简历筛选，提升招聘效率</p>
      </header>

      <!-- Stats Cards -->
      <section class="stats-section" aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="sr-only">System Statistics</h2>
        <div class="stats-grid" 
             role="group" 
             aria-label="Dashboard statistics cards"
             *ngIf="stats$ | async as stats">
          <app-dashboard-card
            title="职位数量"
            [value]="stats.totalJobs.toString()"
            subtitle="当前活跃职位"
            icon="jobs"
            variant="primary"
            role="article"
            [attr.aria-label]="'Jobs statistics: ' + stats.totalJobs + ' active positions'">
          </app-dashboard-card>

          <app-dashboard-card
            title="简历总数"
            [value]="stats.totalResumes.toString()"
            subtitle="已上传简历"
            icon="resumes"
            variant="success"
            role="article"
            [attr.aria-label]="'Resume statistics: ' + stats.totalResumes + ' uploaded resumes'">
          </app-dashboard-card>

          <app-dashboard-card
            title="分析报告"
            [value]="stats.totalReports.toString()"
            subtitle="已生成报告"
            icon="reports"
            variant="info"
            role="article"
            [attr.aria-label]="'Reports statistics: ' + stats.totalReports + ' generated reports'">
          </app-dashboard-card>

          <app-dashboard-card
            title="匹配结果"
            [value]="stats.activeMatches.toString()"
            subtitle="待处理匹配"
            icon="matches"
            variant="warning"
            role="article"
            [attr.aria-label]="'Matches statistics: ' + stats.activeMatches + ' pending matches'">
          </app-dashboard-card>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions-section" aria-labelledby="actions-heading">
        <h2 id="actions-heading" class="section-title">快速操作</h2>
        <nav class="actions-grid" 
             role="navigation" 
             aria-label="Quick action navigation">
          <a routerLink="/jobs/create" 
             class="action-card"
             role="button"
             aria-label="Create new job position - Add new recruitment position and start screening"
             title="创建新职位 - 添加新的招聘职位并开始筛选">
            <div class="action-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">创建新职位</h3>
              <p class="action-description">添加新的招聘职位并开始筛选</p>
            </div>
          </a>

          <a routerLink="/jobs" 
             class="action-card"
             role="button"
             aria-label="Manage positions - View and manage existing positions"
             title="管理职位 - 查看和管理现有职位">
            <div class="action-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">管理职位</h3>
              <p class="action-description">查看和管理现有职位</p>
            </div>
          </a>

          <a routerLink="/reports" 
             class="action-card"
             role="button"
             aria-label="View reports - View analysis reports and matching results"
             title="查看报告 - 查看分析报告和匹配结果">
            <div class="action-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">查看报告</h3>
              <p class="action-description">查看分析报告和匹配结果</p>
            </div>
          </a>
        </nav>
      </section>

      <!-- Recent Activity -->
      <div class="recent-activity-section" *ngIf="stats$ | async as stats">
        <h2 class="section-title">最近活动</h2>
        <div class="activity-list">
          <div 
            *ngFor="let activity of stats.recentActivity; trackBy: trackByActivityId" 
            class="activity-item">
            <div class="activity-icon" [class]="'activity-' + activity.type">
              <svg *ngIf="activity.type === 'job-created'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <svg *ngIf="activity.type === 'resume-uploaded'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
              </svg>
              <svg *ngIf="activity.type === 'report-generated'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <svg *ngIf="activity.type === 'match-found'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-timestamp">{{ activity.timestamp | date:'MM-dd HH:mm' }}</div>
            </div>
            <div *ngIf="activity.status" class="activity-status" [class]="'status-' + activity.status">
              {{ getStatusText(activity.status) }}
            </div>
          </div>
          
          <div *ngIf="stats.recentActivity.length === 0" class="activity-empty">
            <p class="text-muted">暂无最近活动</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .welcome-section {
      text-align: center;
      margin-bottom: var(--space-2xl);
      padding: var(--space-8) var(--space-6);
      background: var(--color-bg-fantasy);
      border-radius: var(--radius-2xl);
      color: white;
      box-shadow: var(--shadow-2xl);
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1), transparent 50%);
        pointer-events: none;
      }
    }
    
    .welcome-title {
      font-family: var(--font-family-fantasy-heading);
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-fantasy-h1);
      margin: 0 0 var(--space-2) 0;
      line-height: var(--line-height-tight);
      letter-spacing: -0.02em;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      position: relative;
      z-index: 1;
    }
    
    .welcome-subtitle {
      font-family: var(--font-family-body);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-fantasy-large);
      opacity: 0.95;
      margin: 0;
      line-height: var(--line-height-normal);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 1;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }
    
    .section-title {
      font-family: var(--font-family-fantasy-heading);
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-fantasy-h2);
      color: var(--color-text-fantasy);
      margin-bottom: var(--space-6);
      padding-bottom: var(--space-2);
      border-bottom: 2px solid var(--color-primary-200);
      background: linear-gradient(90deg, var(--color-primary-700), var(--color-royal-600));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 60px;
        height: 2px;
        background: linear-gradient(90deg, var(--color-primary-600), var(--color-royal-500));
        border-radius: var(--radius-full);
      }
    }
    
    .quick-actions-section {
      margin-bottom: 3rem;
    }
    
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    
    .action-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-6);
      background: var(--color-bg-primary);
      border-radius: var(--radius-2xl);
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow-md);
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
        text-decoration: none;
        color: inherit;
        border-color: var(--color-primary-300);
        
        &::before {
          opacity: 1;
        }
      }
      
      &:active {
        transform: translateY(-2px);
      }
    }
    
    .action-icon {
      flex-shrink: 0;
      width: var(--space-16);
      height: var(--space-16);
      background: linear-gradient(135deg, var(--color-primary-600), var(--color-royal-600));
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: var(--shadow-lg);
      border: 2px solid rgba(255, 255, 255, 0.2);
      transition: all var(--transition-base);
      
      .action-card:hover & {
        transform: scale(1.1) rotate(3deg);
        box-shadow: var(--shadow-xl);
      }
    }
    
    .action-content {
      flex: 1;
    }
    
    .action-title {
      font-family: var(--font-family-fantasy-heading);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-fantasy-large);
      color: var(--color-text-fantasy);
      margin-bottom: var(--space-1);
      line-height: var(--line-height-tight);
      letter-spacing: -0.01em;
    }
    
    .action-description {
      font-family: var(--font-family-body);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
      line-height: var(--line-height-normal);
    }
    
    .recent-activity-section {
      margin-bottom: 3rem;
    }
    
    .activity-list {
      background: var(--color-bg-primary);
      border-radius: var(--radius-2xl);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--color-border-secondary);
    }
    
    .activity-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--color-border-secondary);
      transition: all var(--transition-base);
      position: relative;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover {
        background: var(--color-bg-secondary);
        transform: translateX(4px);
      }
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 0;
        background: linear-gradient(180deg, var(--color-primary-600), var(--color-royal-600));
        border-radius: var(--radius-full);
        transition: height var(--transition-base);
      }
      
      &:hover::before {
        height: 60%;
      }
    }
    
    .activity-icon {
      flex-shrink: 0;
      width: var(--space-10);
      height: var(--space-10);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-base);
      
      &.activity-job-created {
        background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
        border: 1px solid var(--color-primary-200);
        color: var(--color-primary-700);
      }
      
      &.activity-resume-uploaded {
        background: linear-gradient(135deg, var(--color-success-100), var(--color-success-50));
        border: 1px solid var(--color-success-200);
        color: var(--color-success-700);
      }
      
      &.activity-report-generated {
        background: linear-gradient(135deg, var(--color-royal-100), var(--color-royal-50));
        border: 1px solid var(--color-royal-200);
        color: var(--color-royal-700);
      }
      
      &.activity-match-found {
        background: linear-gradient(135deg, var(--color-warning-100), var(--color-warning-50));
        border: 1px solid var(--color-warning-200);
        color: var(--color-warning-700);
      }
      
      .activity-item:hover & {
        transform: scale(1.1);
        box-shadow: var(--shadow-md);
      }
    }
    
    .activity-content {
      flex: 1;
    }
    
    .activity-title {
      font-family: var(--font-family-fantasy-heading);
      font-weight: var(--font-weight-fantasy-large);
      color: var(--color-text-fantasy);
      margin-bottom: var(--space-1);
      font-size: var(--font-size-base);
      line-height: var(--line-height-tight);
    }
    
    .activity-description {
      font-family: var(--font-family-body);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-bottom: var(--space-1);
      line-height: var(--line-height-normal);
    }
    
    .activity-timestamp {
      font-family: var(--font-family-body);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      font-weight: var(--font-weight-medium);
    }
    
    .activity-status {
      flex-shrink: 0;
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-xl);
      font-family: var(--font-family-body);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: 1px solid transparent;
      transition: all var(--transition-base);
      
      &.status-processing {
        background: linear-gradient(135deg, var(--color-warning-50), var(--color-ember-50));
        color: var(--color-warning-800);
        border-color: var(--color-warning-200);
        box-shadow: var(--shadow-xs);
        
        &::before {
          content: '⚡';
          margin-right: var(--space-1);
        }
      }
      
      &.status-completed {
        background: linear-gradient(135deg, var(--color-success-50), var(--color-emerald-50));
        color: var(--color-success-800);
        border-color: var(--color-success-200);
        box-shadow: var(--shadow-xs);
        
        &::before {
          content: '✓';
          margin-right: var(--space-1);
        }
      }
      
      &.status-failed {
        background: linear-gradient(135deg, var(--color-error-50), var(--color-error-100));
        color: var(--color-error-800);
        border-color: var(--color-error-200);
        box-shadow: var(--shadow-xs);
        
        &::before {
          content: '⚠';
          margin-right: var(--space-1);
        }
      }
    }
    
    .activity-empty {
      padding: 3rem;
      text-align: center;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .welcome-title {
        font-size: 2rem;
      }
      
      .welcome-subtitle {
        font-size: 1rem;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .actions-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .activity-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats$!: Observable<DashboardStats>;

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    // Mock data - replace with real API calls
    const mockStats: DashboardStats = {
      totalJobs: 12,
      totalResumes: 156,
      totalReports: 89,
      activeMatches: 23,
      recentActivity: [
        {
          id: '1',
          type: 'job-created',
          title: '创建新职位',
          description: '前端开发工程师职位已创建',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'completed'
        },
        {
          id: '2',
          type: 'resume-uploaded',
          title: '简历上传',
          description: '上传了 5 份新简历',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          status: 'processing'
        },
        {
          id: '3',
          type: 'report-generated',
          title: '报告生成完成',
          description: 'Java开发工程师岗位分析报告已生成',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          status: 'completed'
        },
        {
          id: '4',
          type: 'match-found',
          title: '发现匹配',
          description: '找到 3 个高匹配度候选人',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
          status: 'completed'
        }
      ]
    };

    this.stats$ = of(mockStats);
  }

  trackByActivityId(_index: number, activity: ActivityItem): string {
    return activity.id;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'processing': return '处理中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status;
    }
  }
}