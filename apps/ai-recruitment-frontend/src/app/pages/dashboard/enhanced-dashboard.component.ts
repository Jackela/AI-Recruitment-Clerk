import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, interval, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, catchError, shareReplay } from 'rxjs/operators';
import { SharedModule } from '../../components/shared/shared.module';
import { BentoGridComponent, BentoGridItem } from '../../components/shared/bento-grid/bento-grid.component';
import { DashboardApiService, DashboardStats, SystemHealth } from '../../services/dashboard-api.service';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketStatsService, RealtimeStats } from '../../services/realtime/websocket-stats.service';
import { ProgressFeedbackService } from '../../services/feedback/progress-feedback.service';

@Component({
  selector: 'app-enhanced-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, BentoGridComponent],
  template: `
    <div class="dashboard-container">
      <!-- Welcome Header -->
      <div class="welcome-section">
        <h1 class="welcome-title">AI 招聘助理 Dashboard</h1>
        <p class="welcome-subtitle">智能简历筛选，提升招聘效率</p>
        <div class="system-status" [class]="'status-' + (systemHealth$ | async)?.status">
          <span class="status-indicator"></span>
          系统状态: {{ getSystemStatusText((systemHealth$ | async)?.status) }}
        </div>
      </div>

      <!-- Main Bento Grid Dashboard -->
      <app-bento-grid 
        [items]="(bentoItems$ | async) || []" 
        [gridSize]="'default'"
        [ariaLabel]="'招聘系统仪表板'"
        [onItemClickHandler]="onBentoItemClick.bind(this)">
      </app-bento-grid>

      <!-- Quick Actions -->
      <div class="quick-actions-section">
        <h2 class="section-title">快速操作</h2>
        <div class="actions-grid">
          <a routerLink="/resume" class="action-card primary">
            <div class="action-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">上传简历分析</h3>
              <p class="action-description">立即上传简历进行AI智能分析</p>
            </div>
          </a>

          <a routerLink="/jobs/create" class="action-card">
            <div class="action-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">创建新职位</h3>
              <p class="action-description">添加新的招聘职位</p>
            </div>
          </a>

          <a routerLink="/jobs" class="action-card">
            <div class="action-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">管理职位</h3>
              <p class="action-description">查看和管理现有职位</p>
            </div>
          </a>

          <a routerLink="/reports" class="action-card">
            <div class="action-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">查看报告</h3>
              <p class="action-description">分析报告和统计</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    .welcome-section {
      text-align: center;
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      color: white;
      position: relative;
      overflow: hidden;
    }
    
    .welcome-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
    }
    
    .welcome-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin: 0 0 1rem 0;
    }
    
    .system-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      font-size: 0.9rem;
      backdrop-filter: blur(10px);
    }
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
    }
    
    .system-status.status-warning .status-indicator {
      background: #f59e0b;
    }
    
    .system-status.status-error .status-indicator {
      background: #ef4444;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
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
      margin: 3rem 0;
    }
    
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    
    .action-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: white;
      border-radius: 16px;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        text-decoration: none;
        color: inherit;
      }
      
      &.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        
        .action-icon {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      }
    }
    
    .action-icon {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      border-radius: 16px;
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
      margin-bottom: 0.25rem;
    }
    
    .action-description {
      font-size: 0.9rem;
      opacity: 0.8;
      margin: 0;
      line-height: 1.4;
    }
    
    /* Custom Bento Grid Styles */
    app-bento-grid {
      margin: 2rem 0;
    }
    
    /* Additional styling for bento content */
    :host ::ng-deep .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      text-align: center;
    }
    
    :host ::ng-deep .metric {
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      font-size: 0.875rem;
    }
    
    :host ::ng-deep .health-overview {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    
    :host ::ng-deep .guest-stats {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    :host ::ng-deep .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    :host ::ng-deep .stat-row:last-child {
      border-bottom: none;
    }
    
    :host ::ng-deep .activity-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    :host ::ng-deep .activity-item:last-child {
      border-bottom: none;
    }
    
    :host ::ng-deep .activity-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    :host ::ng-deep .activity-desc {
      font-size: 0.875rem;
      opacity: 0.8;
      margin-bottom: 0.25rem;
    }
    
    :host ::ng-deep .activity-time {
      font-size: 0.75rem;
      opacity: 0.6;
    }
    
    :host ::ng-deep .no-activity {
      text-align: center;
      opacity: 0.6;
      padding: 2rem 0;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 0.5rem;
      }
      
      .welcome-section {
        padding: 1.5rem;
      }
      
      .welcome-title {
        font-size: 2rem;
      }
      
      .welcome-subtitle {
        font-size: 1rem;
      }
      
      .actions-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .action-card {
        padding: 1rem;
      }
      
      .action-icon {
        width: 50px;
        height: 50px;
      }
      
      :host ::ng-deep .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class EnhancedDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  stats$!: Observable<DashboardStats>;
  systemHealth$!: Observable<SystemHealth>;
  bentoItems$!: Observable<BentoGridItem[]>;
  
  constructor(
    // @ts-expect-error Reserved for future dashboard API integration
    private _dashboardApi: DashboardApiService,
    private guestApi: GuestApiService,
    private websocketStats: WebSocketStatsService,
    private progressFeedback: ProgressFeedbackService
  ) {}

  ngOnInit() {
    this.initializeDataStreams();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeDataStreams() {
    // Use real-time WebSocket data with fallback to mock data
    const realtimeStats$ = this.websocketStats.subscribeToStats().pipe(
      takeUntil(this.destroy$),
      catchError(() => {
        console.warn('WebSocket stats unavailable, using mock data');
        return of(this.createMockRealtimeStats());
      })
    );

    // Subscribe to WebSocket events for live updates
    this.websocketStats.subscribeToEvents().pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      // Show real-time notifications for analysis events
      switch (event.type) {
        case 'started':
          this.progressFeedback.showInfo('分析开始', `开始分析简历: ${event.analysisId.slice(-6)}`);
          break;
        case 'completed':
          this.progressFeedback.showSuccess('分析完成', `简历分析已完成: ${event.analysisId.slice(-6)}`);
          break;
        case 'failed':
          this.progressFeedback.showError('分析失败', `简历分析失败: ${event.analysisId.slice(-6)}`);
          break;
      }
    });

    // Convert real-time stats to dashboard stats format
    this.stats$ = realtimeStats$.pipe(
      map(realtimeStats => this.convertToDashboardStats(realtimeStats)),
      shareReplay(1)
    );

    // Create system health from real-time metrics
    this.systemHealth$ = combineLatest([
      realtimeStats$,
      this.websocketStats.subscribeToMetrics().pipe(
        takeUntil(this.destroy$),
        catchError(() => of(this.createMockMetrics()))
      )
    ]).pipe(
      map(([stats, metrics]) => this.createSystemHealth(stats, metrics)),
      shareReplay(1)
    );

    // Get guest stats
    const guestStats$ = this.guestApi.getServiceStats().pipe(
      takeUntil(this.destroy$),
      catchError(() => of({ totalGuests: 1247, activeGuests: 89, pendingFeedbackCodes: 23, redeemedFeedbackCodes: 156 }))
    );

    // Combine all data streams for bento items
    this.bentoItems$ = combineLatest([
      this.stats$,
      this.systemHealth$,
      guestStats$
    ]).pipe(
      map(([stats, health, guestStats]) => this.createBentoItems(stats, health, guestStats)),
      shareReplay(1)
    );

    // Auto-refresh every 30 seconds
    interval(30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.websocketStats.refreshStats();
    });
  }

  private createMockRealtimeStats(): RealtimeStats {
    return {
      totalAnalyses: 1247,
      activeAnalyses: 8,
      completedToday: 89,
      averageProcessingTime: 138,
      systemLoad: 65,
      queueLength: 3,
      errorRate: 2.5,
      uptime: Math.floor(Date.now() / 1000),
      lastUpdated: new Date()
    };
  }

  private createMockMetrics() {
    return {
      cpuUsage: 45,
      memoryUsage: 60,
      diskUsage: 35,
      networkTraffic: 125000,
      timestamp: new Date()
    };
  }

  private convertToDashboardStats(realtimeStats: RealtimeStats): DashboardStats {
    return {
      totalJobs: 12, // Static for now
      totalResumes: realtimeStats.totalAnalyses,
      totalReports: realtimeStats.completedToday * 7, // Estimate weekly
      activeMatches: Math.floor(realtimeStats.totalAnalyses * 0.15), // 15% match rate
      systemHealth: { 
        status: realtimeStats.errorRate > 10 ? 'error' : realtimeStats.errorRate > 5 ? 'warning' : 'healthy',
        uptime: `${Math.floor(realtimeStats.uptime / 86400)}d ${Math.floor((realtimeStats.uptime % 86400) / 3600)}h`,
        responseTime: realtimeStats.averageProcessingTime
      },
      recentActivity: [
        { 
          id: '1', 
          type: 'analysis-completed', 
          title: '分析完成', 
          description: `今日已完成 ${realtimeStats.completedToday} 份简历分析`, 
          timestamp: new Date(Date.now() - 1000 * 60 * 30), 
          status: 'completed' 
        },
        { 
          id: '2', 
          type: 'analysis-active', 
          title: '分析中', 
          description: `当前有 ${realtimeStats.activeAnalyses} 份简历正在分析`, 
          timestamp: new Date(Date.now() - 1000 * 60 * 5), 
          status: 'processing' 
        }
      ],
      serviceMetrics: { 
        analysisInProgress: realtimeStats.activeAnalyses,
        completedToday: realtimeStats.completedToday,
        averageProcessingTime: `${(realtimeStats.averageProcessingTime / 60).toFixed(1)}分钟`,
        successRate: 1 - (realtimeStats.errorRate / 100)
      }
    };
  }

  private createSystemHealth(stats: RealtimeStats, metrics: any): SystemHealth {
    const getServiceStatus = (metric: number, thresholds: {warning: number, error: number}) => {
      if (metric > thresholds.error) return 'error';
      if (metric > thresholds.warning) return 'warning';
      return 'healthy';
    };

    return {
      status: stats.errorRate > 10 ? 'error' : stats.errorRate > 5 ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        gateway: { status: 'healthy', responseTime: 120 },
        resumeParser: { status: getServiceStatus(metrics.cpuUsage, {warning: 70, error: 90}), responseTime: 89 },
        scoringEngine: { status: getServiceStatus(metrics.memoryUsage, {warning: 80, error: 95}), responseTime: 156 },
        reportGenerator: { status: 'healthy', responseTime: 234 },
        database: { status: getServiceStatus(stats.queueLength, {warning: 10, error: 20}), responseTime: 45 },
        messageQueue: { status: getServiceStatus(stats.systemLoad, {warning: 80, error: 95}), responseTime: 23 }
      },
      processingMetrics: { 
        queueDepth: stats.queueLength,
        averageProcessingTime: stats.averageProcessingTime,
        successRate: 1 - (stats.errorRate / 100),
        errorRate: stats.errorRate / 100
      }
    };
  }

  private createBentoItems(stats: DashboardStats, health: SystemHealth, guestStats: any): BentoGridItem[] {
    return [
      {
        id: 'total-jobs',
        title: '职位数量',
        subtitle: '当前活跃职位',
        value: stats.totalJobs,
        icon: 'jobs',
        variant: 'primary',
        size: 'medium',
        clickable: true
      },
      {
        id: 'total-resumes', 
        title: '简历总数',
        subtitle: '已分析简历',
        value: stats.totalResumes,
        icon: 'resumes',
        variant: 'success',
        size: 'medium',
        trend: { type: 'up', value: '+12%', period: '本周' }
      },
      {
        id: 'total-reports',
        title: '分析报告', 
        subtitle: '已生成报告',
        value: stats.totalReports,
        icon: 'reports',
        variant: 'info',
        size: 'medium'
      },
      {
        id: 'active-matches',
        title: '活跃匹配',
        subtitle: '智能匹配结果',
        value: stats.activeMatches,
        icon: 'matches',
        variant: 'warning',
        size: 'medium',
        action: { text: '查看详情', onClick: () => this.navigateToReports() }
      },
      {
        id: 'system-health',
        title: '系统健康状态',
        subtitle: `响应时间: ${health.services.gateway.responseTime}ms`,
        content: this.getSystemHealthContent(health),
        icon: 'analytics',
        variant: 'success',
        size: 'large',
        badge: '正常'
      },
      {
        id: 'processing-metrics',
        title: '处理指标',
        subtitle: '实时处理状态',
        content: `
          <div class="metrics-grid">
            <div class="metric"><strong>${stats.serviceMetrics.analysisInProgress}</strong><br>进行中</div>
            <div class="metric"><strong>${stats.serviceMetrics.completedToday}</strong><br>今日完成</div>
            <div class="metric"><strong>${stats.serviceMetrics.averageProcessingTime}</strong><br>平均耗时</div>
            <div class="metric"><strong>${(stats.serviceMetrics.successRate * 100).toFixed(1)}%</strong><br>成功率</div>
          </div>
        `,
        icon: 'activity',
        variant: 'default',
        size: 'wide'
      },
      {
        id: 'recent-activity',
        title: '最近活动',
        subtitle: `${stats.recentActivity.length} 条最新记录`,
        content: this.getRecentActivityContent(stats.recentActivity),
        icon: 'activity',
        variant: 'default',
        size: 'tall'
      },
      {
        id: 'guest-stats',
        title: '访客统计',
        subtitle: '体验用户使用情况',
        content: `
          <div class="guest-stats">
            <div class="stat-row">总访客数: <strong>${guestStats.totalGuests}</strong></div>
            <div class="stat-row">活跃访客: <strong>${guestStats.activeGuests}</strong></div>
            <div class="stat-row">待反馈: <strong>${guestStats.pendingFeedbackCodes}</strong></div>
            <div class="stat-row">已兑换: <strong>${guestStats.redeemedFeedbackCodes}</strong></div>
          </div>
        `,
        icon: 'users',
        variant: 'info',
        size: 'medium'
      }
    ];
  }
  
  private getSystemHealthContent(health: SystemHealth): string {
    const services = Object.entries(health.services);
    const healthyCount = services.filter(([_, service]) => service.status === 'healthy').length;
    
    return `
      <div class="health-overview">
        <div class="health-summary">${healthyCount}/${services.length} 服务正常</div>
        <div class="queue-status">队列深度: ${health.processingMetrics.queueDepth}</div>
        <div class="success-rate">成功率: ${(health.processingMetrics.successRate * 100).toFixed(1)}%</div>
      </div>
    `;
  }
  
  private getRecentActivityContent(activities: any[]): string {
    if (activities.length === 0) {
      return '<div class="no-activity">暂无最近活动</div>';
    }
    
    return activities.slice(0, 5).map(activity => `
      <div class="activity-item">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-desc">${activity.description}</div>
        <div class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
  }
  
  getSystemStatusText(status?: string): string {
    switch (status) {
      case 'healthy': return '正常';
      case 'warning': return '警告'; 
      case 'error': return '错误';
      default: return '未知';
    }
  }
  
  onBentoItemClick(item: BentoGridItem): void {
    console.log('Clicked item:', item.id);
  }
  
  private navigateToReports(): void {
    console.log('Navigate to reports');
  }
}