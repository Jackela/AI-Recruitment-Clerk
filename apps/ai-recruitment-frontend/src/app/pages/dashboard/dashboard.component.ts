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

/**
 * Represents the dashboard component.
 */
@Component({
  selector: 'arc-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
  template: `
    <div
      class="dashboard-container"
      role="main"
      aria-labelledby="dashboard-title"
    >
      <!-- Welcome Header -->
      <header class="welcome-section" role="banner">
        <h1 id="dashboard-title" class="welcome-title">
          <span class="sr-only">Dashboard - </span>
          欢迎使用 AI 招聘助理
        </h1>
        <p class="welcome-subtitle" role="doc-subtitle">
          智能简历筛选，提升招聘效率
        </p>
      </header>

      <!-- Stats Cards -->
      <section class="stats-section" aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="sr-only">System Statistics</h2>
        <div
          class="stats-grid"
          role="group"
          aria-label="Dashboard statistics cards"
          *ngIf="stats$ | async as stats"
        >
          <arc-dashboard-card
            title="职位数量"
            [value]="stats.totalJobs.toString()"
            subtitle="当前活跃职位"
            icon="jobs"
            variant="primary"
            role="article"
            [attr.aria-label]="
              'Jobs statistics: ' + stats.totalJobs + ' active positions'
            "
          >
          </arc-dashboard-card>

          <arc-dashboard-card
            title="简历总数"
            [value]="stats.totalResumes.toString()"
            subtitle="已上传简历"
            icon="resumes"
            variant="success"
            role="article"
            [attr.aria-label]="
              'Resume statistics: ' + stats.totalResumes + ' uploaded resumes'
            "
          >
          </arc-dashboard-card>

          <arc-dashboard-card
            title="分析报告"
            [value]="stats.totalReports.toString()"
            subtitle="已生成报告"
            icon="reports"
            variant="info"
            role="article"
            [attr.aria-label]="
              'Reports statistics: ' + stats.totalReports + ' generated reports'
            "
          >
          </arc-dashboard-card>

          <arc-dashboard-card
            title="匹配结果"
            [value]="stats.activeMatches.toString()"
            subtitle="待处理匹配"
            icon="matches"
            variant="warning"
            role="article"
            [attr.aria-label]="
              'Matches statistics: ' + stats.activeMatches + ' pending matches'
            "
          >
          </arc-dashboard-card>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions-section" aria-labelledby="actions-heading">
        <h2 id="actions-heading" class="section-title">快速操作</h2>
        <nav
          class="actions-grid"
          role="navigation"
          aria-label="Quick action navigation"
        >
          <a
            routerLink="/jobs/create"
            class="action-card"
            role="button"
            aria-label="Create new job position - Add new recruitment position and start screening"
            title="创建新职位 - 添加新的招聘职位并开始筛选"
          >
            <div class="action-icon" aria-hidden="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
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

          <a
            routerLink="/jobs"
            class="action-card"
            role="button"
            aria-label="Manage positions - View and manage existing positions"
            title="管理职位 - 查看和管理现有职位"
          >
            <div class="action-icon" aria-hidden="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                ></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">管理职位</h3>
              <p class="action-description">查看和管理现有职位</p>
            </div>
          </a>

          <a
            routerLink="/reports"
            class="action-card"
            role="button"
            aria-label="View reports - View analysis reports and matching results"
            title="查看报告 - 查看分析报告和匹配结果"
          >
            <div class="action-icon" aria-hidden="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
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
            *ngFor="
              let activity of stats.recentActivity;
              trackBy: trackByActivityId
            "
            class="activity-item"
          >
            <div class="activity-icon" [class]="'activity-' + activity.type">
              <svg
                *ngIf="activity.type === 'job-created'"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <svg
                *ngIf="activity.type === 'resume-uploaded'"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                ></path>
                <polyline points="14,2 14,8 20,8"></polyline>
              </svg>
              <svg
                *ngIf="activity.type === 'report-generated'"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <svg
                *ngIf="activity.type === 'match-found'"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-timestamp">
                {{ activity.timestamp | date: 'MM-dd HH:mm' }}
              </div>
            </div>
            <div
              *ngIf="activity.status"
              class="activity-status"
              [class]="'status-' + activity.status"
            >
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
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats$!: Observable<DashboardStats>;

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
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
          status: 'completed',
        },
        {
          id: '2',
          type: 'resume-uploaded',
          title: '简历上传',
          description: '上传了 5 份新简历',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          status: 'processing',
        },
        {
          id: '3',
          type: 'report-generated',
          title: '报告生成完成',
          description: 'Java开发工程师岗位分析报告已生成',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          status: 'completed',
        },
        {
          id: '4',
          type: 'match-found',
          title: '发现匹配',
          description: '找到 3 个高匹配度候选人',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
          status: 'completed',
        },
      ],
    };

    this.stats$ = of(mockStats);
  }

  /**
   * Performs the track by activity id operation.
   * @param _index - The index.
   * @param activity - The activity.
   * @returns The string value.
   */
  trackByActivityId(_index: number, activity: ActivityItem): string {
    return activity.id;
  }

  /**
   * Retrieves status text.
   * @param status - The status.
   * @returns The string value.
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  }
}
