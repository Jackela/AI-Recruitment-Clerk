import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SharedModule } from '../../components/shared/shared.module';
import { BentoGridItem } from '../../components/shared/bento-grid/bento-grid.component';
import { BentoCardData } from '../../components/shared/bento-grid/bento-card.component';

interface DashboardData {
  stats: {
    totalJobs: number;
    totalResumes: number;
    totalReports: number;
    activeMatches: number;
    processingJobs: number;
    successRate: number;
  };
  recentActivity: ActivityItem[];
  quickActions: QuickAction[];
  systemHealth: SystemHealthMetric[];
}

interface ActivityItem {
  id: string;
  type: 'job-created' | 'resume-uploaded' | 'report-generated' | 'match-found';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'processing' | 'completed' | 'failed';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

interface SystemHealthMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
}

@Component({
  selector: 'app-enhanced-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
  template: `
    <div class="enhanced-dashboard">
      <!-- Welcome Header with Bento Style -->
      <div class="welcome-bento">
        <div class="welcome-content">
          <h1 class="welcome-title">欢迎使用 AI 招聘助理</h1>
          <p class="welcome-subtitle">智能简历筛选，提升招聘效率</p>
          <div class="welcome-stats">
            <div class="stat-item">
              <span class="stat-value">{{ (dashboardData$ | async)?.stats?.totalJobs || 0 }}</span>
              <span class="stat-label">活跃职位</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ (dashboardData$ | async)?.stats?.totalResumes || 0 }}</span>
              <span class="stat-label">处理简历</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ (dashboardData$ | async)?.stats?.successRate || 0 }}%</span>
              <span class="stat-label">匹配成功率</span>
            </div>
          </div>
        </div>
        <div class="welcome-illustration">
          <svg width="200" height="120" viewBox="0 0 200 120" fill="none">
            <!-- AI Brain illustration -->
            <circle cx="100" cy="60" r="40" fill="url(#brainGradient)" opacity="0.2"/>
            <path d="M70 60 Q100 30 130 60 Q100 90 70 60" fill="url(#brainGradient)" opacity="0.3"/>
            <circle cx="85" cy="50" r="3" fill="currentColor" opacity="0.6"/>
            <circle cx="100" cy="45" r="3" fill="currentColor" opacity="0.8"/>
            <circle cx="115" cy="50" r="3" fill="currentColor" opacity="0.6"/>
            <defs>
              <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <!-- Main Bento Grid -->
      <div class="main-dashboard-grid" *ngIf="dashboardData$ | async as data">
        <app-bento-grid 
          [items]="bentoGridItems" 
          [gridSize]="'default'"
          [ariaLabel]="'Dashboard Overview'"
          [onItemClickHandler]="handleItemClick.bind(this)">
        </app-bento-grid>
      </div>

      <!-- Quick Actions Section -->
      <div class="quick-actions-section" *ngIf="dashboardData$ | async as data">
        <h2 class="section-title">快速操作</h2>
        <div class="quick-actions-grid">
          <div 
            *ngFor="let action of data.quickActions; trackBy: trackByActionId"
            class="quick-action-card"
            [routerLink]="action.route"
            [style.--action-color]="action.color">
            <div class="action-icon">
              <ng-container [ngSwitch]="action.icon">
                <svg *ngSwitchCase="'plus'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <svg *ngSwitchCase="'list'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                <svg *ngSwitchCase="'chart'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <svg *ngSwitchCase="'upload'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,5 17,10"></polyline>
                  <line x1="12" y1="5" x2="12" y2="15"></line>
                </svg>
              </ng-container>
            </div>
            <div class="action-content">
              <h3 class="action-title">{{ action.title }}</h3>
              <p class="action-description">{{ action.description }}</p>
            </div>
            <div class="action-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18l6-6-6-6"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- System Status Grid -->
      <div class="system-status-section" *ngIf="dashboardData$ | async as data">
        <h2 class="section-title">系统状态</h2>
        <div class="system-status-grid">
          <div 
            *ngFor="let metric of data.systemHealth; trackBy: trackByMetricName"
            class="status-card"
            [class]="'status-' + metric.status">
            <div class="status-indicator">
              <div class="status-dot" [class]="'dot-' + metric.status"></div>
            </div>
            <div class="status-content">
              <div class="status-name">{{ metric.name }}</div>
              <div class="status-value">{{ metric.value }}%</div>
              <div class="status-description">{{ metric.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .enhanced-dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Welcome Bento Header */
    .welcome-bento {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 24px;
      padding: 3rem 2rem;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .welcome-bento::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 200px;
      height: 200px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      pointer-events: none;
    }

    .welcome-content {
      flex: 1;
      z-index: 1;
    }

    .welcome-title {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
    }

    .welcome-subtitle {
      font-size: 1.25rem;
      opacity: 0.9;
      margin: 0 0 2rem 0;
      line-height: 1.4;
    }

    .welcome-stats {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .stat-divider {
      width: 1px;
      height: 3rem;
      background: rgba(255, 255, 255, 0.3);
    }

    .welcome-illustration {
      flex-shrink: 0;
      opacity: 0.8;
      color: white;
    }

    /* Main Dashboard Grid */
    .main-dashboard-grid {
      margin: 1rem 0;
    }

    /* Section Titles */
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 1.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 2px;
    }

    /* Quick Actions Grid */
    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .quick-action-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      border: 2px solid transparent;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 1rem;

      &:hover {
        border-color: var(--action-color, #667eea);
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--action-color, #667eea);
      }
    }

    .action-icon {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--action-color, #667eea), transparent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .action-content {
      flex: 1;
      min-width: 0;
    }

    .action-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
      color: #1f2937;
    }

    .action-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }

    .action-arrow {
      color: var(--action-color, #667eea);
      opacity: 0.7;
      transform: translateX(-4px);
      transition: all 0.3s ease;
    }

    .quick-action-card:hover .action-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    /* System Status Grid */
    .system-status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .status-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
    }

    .status-indicator {
      position: relative;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        opacity: 0.3;
        animation: pulse 2s infinite;
      }

      &.dot-healthy {
        background: #22c55e;
        &::before { background: #22c55e; }
      }

      &.dot-warning {
        background: #f59e0b;
        &::before { background: #f59e0b; }
      }

      &.dot-critical {
        background: #ef4444;
        &::before { background: #ef4444; }
      }
    }

    .status-content {
      flex: 1;
    }

    .status-name {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .status-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.25rem;
    }

    .status-description {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .status-healthy .status-value { color: #22c55e; }
    .status-warning .status-value { color: #f59e0b; }
    .status-critical .status-value { color: #ef4444; }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .welcome-bento {
        flex-direction: column;
        text-align: center;
        gap: 2rem;
      }

      .welcome-stats {
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .enhanced-dashboard {
        padding: 1rem;
        gap: 1.5rem;
      }

      .welcome-title {
        font-size: 2rem;
      }

      .welcome-subtitle {
        font-size: 1rem;
      }

      .welcome-stats {
        flex-direction: column;
        gap: 1rem;
      }

      .stat-divider {
        display: none;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .quick-action-card {
        padding: 1rem;
      }

      .action-icon {
        width: 48px;
        height: 48px;
      }

      .system-status-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .welcome-bento {
        padding: 2rem 1rem;
      }

      .section-title {
        font-size: 1.25rem;
      }
    }
  `]
})
export class EnhancedDashboardComponent implements OnInit {
  dashboardData$!: Observable<DashboardData>;
  bentoGridItems: BentoGridItem[] = [];

  ngOnInit() {
    this.loadDashboardData();
    this.setupBentoGridItems();
  }

  private loadDashboardData() {
    const mockData: DashboardData = {
      stats: {
        totalJobs: 24,
        totalResumes: 312,
        totalReports: 156,
        activeMatches: 45,
        processingJobs: 8,
        successRate: 87
      },
      recentActivity: [
        {
          id: '1',
          type: 'job-created',
          title: '创建新职位',
          description: 'Senior React 开发工程师职位已创建',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          status: 'completed'
        },
        {
          id: '2',
          type: 'resume-uploaded',
          title: '批量简历上传',
          description: '成功上传 12 份前端开发简历',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          status: 'processing'
        },
        {
          id: '3',
          type: 'report-generated',
          title: '分析报告完成',
          description: 'UI/UX 设计师岗位匹配报告已生成',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
          status: 'completed'
        }
      ],
      quickActions: [
        {
          id: 'create-job',
          title: '创建新职位',
          description: '发布新的招聘职位并开始筛选',
          icon: 'plus',
          route: '/jobs/create',
          color: '#3b82f6'
        },
        {
          id: 'manage-jobs',
          title: '管理职位',
          description: '查看和管理现有招聘职位',
          icon: 'list',
          route: '/jobs',
          color: '#8b5cf6'
        },
        {
          id: 'view-reports',
          title: '分析报告',
          description: '查看详细的匹配分析报告',
          icon: 'chart',
          route: '/reports',
          color: '#06b6d4'
        },
        {
          id: 'upload-resume',
          title: '上传简历',
          description: '批量上传和处理候选人简历',
          icon: 'upload',
          route: '/resume',
          color: '#10b981'
        }
      ],
      systemHealth: [
        { name: 'API 服务', value: 99, status: 'healthy', description: '服务正常运行' },
        { name: '数据库连接', value: 95, status: 'healthy', description: '连接稳定' },
        { name: 'AI 分析引擎', value: 87, status: 'warning', description: '处理负载较高' },
        { name: '文件存储', value: 78, status: 'warning', description: '存储空间充足' }
      ]
    };

    this.dashboardData$ = of(mockData);
  }

  private setupBentoGridItems() {
    this.dashboardData$.subscribe(data => {
      this.bentoGridItems = [
        // Stats Cards
        {
          id: 'total-jobs',
          title: '总职位数',
          subtitle: '当前活跃招聘职位',
          value: data.stats.totalJobs,
          icon: 'jobs',
          variant: 'primary',
          size: 'medium',
          trend: {
            type: 'up',
            value: '+12%',
            period: '本月'
          }
        },
        {
          id: 'total-resumes',
          title: '简历总数',
          subtitle: '已处理候选人简历',
          value: data.stats.totalResumes,
          icon: 'resumes',
          variant: 'success',
          size: 'medium',
          trend: {
            type: 'up',
            value: '+24%',
            period: '本月'
          }
        },
        {
          id: 'total-reports',
          title: '分析报告',
          subtitle: '已生成匹配报告',
          value: data.stats.totalReports,
          icon: 'reports',
          variant: 'info',
          size: 'medium'
        },
        {
          id: 'active-matches',
          title: '活跃匹配',
          subtitle: '待处理匹配结果',
          value: data.stats.activeMatches,
          icon: 'matches',
          variant: 'warning',
          size: 'medium',
          badge: '待处理'
        },
        // Feature Cards
        {
          id: 'recent-activity',
          title: '最近活动',
          subtitle: '系统最新动态',
          icon: 'activity',
          variant: 'default',
          size: 'wide',
          content: this.generateActivityHTML(data.recentActivity)
        },
        {
          id: 'success-rate',
          title: '匹配成功率',
          subtitle: '本月平均匹配质量',
          value: `${data.stats.successRate}%`,
          icon: 'target',
          variant: 'primary',
          size: 'large',
          trend: {
            type: 'up',
            value: '+5%',
            period: 'vs 上月'
          }
        }
      ];
    });
  }

  private generateActivityHTML(activities: ActivityItem[]): string {
    return activities.slice(0, 3).map(activity => `
      <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${this.getActivityColor(activity.type)};"></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem;">${activity.title}</div>
          <div style="font-size: 0.75rem; color: #6b7280;">${activity.description}</div>
        </div>
        <div style="font-size: 0.75rem; color: #9ca3af;">${this.formatTimeAgo(activity.timestamp)}</div>
      </div>
    `).join('');
  }

  private getActivityColor(type: string): string {
    const colors = {
      'job-created': '#3b82f6',
      'resume-uploaded': '#10b981',
      'report-generated': '#8b5cf6',
      'match-found': '#f59e0b'
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  private formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  }

  handleItemClick = (item: BentoGridItem): void => {
    console.log('Bento item clicked:', item);
    // Handle item clicks based on item.id
    switch (item.id) {
      case 'total-jobs':
        // Navigate to jobs page
        break;
      case 'recent-activity':
        // Show activity details
        break;
      // Add more cases as needed
    }
  };

  trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }

  trackByMetricName(index: number, metric: SystemHealthMetric): string {
    return metric.name;
  }
}