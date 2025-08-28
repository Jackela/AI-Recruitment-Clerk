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
      margin-bottom: 3rem;
      padding: 2rem 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      color: white;
      margin-bottom: 3rem;
    }
    
    .welcome-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
    }
    
    .welcome-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin: 0;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #ecf0f1;
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
      gap: 1rem;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      border: 1px solid rgba(0, 0, 0, 0.05);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        text-decoration: none;
        color: inherit;
      }
    }
    
    .action-icon {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .action-content {
      flex: 1;
    }
    
    .action-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }
    
    .action-description {
      font-size: 0.9rem;
      color: #7f8c8d;
      margin: 0;
      line-height: 1.4;
    }
    
    .recent-activity-section {
      margin-bottom: 3rem;
    }
    
    .activity-list {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .activity-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #ecf0f1;
      
      &:last-child {
        border-bottom: none;
      }
    }
    
    .activity-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.activity-job-created {
        background: rgba(52, 152, 219, 0.1);
        color: #3498db;
      }
      
      &.activity-resume-uploaded {
        background: rgba(46, 204, 113, 0.1);
        color: #2ecc71;
      }
      
      &.activity-report-generated {
        background: rgba(155, 89, 182, 0.1);
        color: #9b59b6;
      }
      
      &.activity-match-found {
        background: rgba(241, 196, 15, 0.1);
        color: #f1c40f;
      }
    }
    
    .activity-content {
      flex: 1;
    }
    
    .activity-title {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }
    
    .activity-description {
      font-size: 0.9rem;
      color: #7f8c8d;
      margin-bottom: 0.25rem;
    }
    
    .activity-timestamp {
      font-size: 0.8rem;
      color: #95a5a6;
    }
    
    .activity-status {
      flex-shrink: 0;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      
      &.status-processing {
        background: #fff3cd;
        color: #856404;
      }
      
      &.status-completed {
        background: #d4edda;
        color: #155724;
      }
      
      &.status-failed {
        background: #f8d7da;
        color: #721c24;
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