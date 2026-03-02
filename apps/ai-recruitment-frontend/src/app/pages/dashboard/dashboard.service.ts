import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { of, interval, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { map, takeUntil, catchError, shareReplay } from 'rxjs/operators';
import type {
  BentoGridItem,
} from '../../components/shared/bento-grid/bento-grid-item.component';
import type {
  DashboardStats,
  SystemHealth,
  ActivityItem,
} from '../../services/dashboard-api.service';
import { GuestApiService } from '../../services/guest/guest-api.service';
import {
  WebSocketStatsService,
  type RealtimeStats,
  type SystemMetrics,
} from '../../services/realtime/websocket-stats.service';
import { ProgressFeedbackService } from '../../services/feedback/progress-feedback.service';
import { LoggerService } from '../../services/shared/logger.service';

/**
 * Guest statistics interface
 */
export interface GuestStats {
  totalGuests: number;
  activeGuests: number;
  pendingFeedbackCodes: number;
  redeemedFeedbackCodes: number;
}

/**
 * Dashboard state containing all observables needed by components
 */
export interface DashboardState {
  stats$: Observable<DashboardStats>;
  systemHealth$: Observable<SystemHealth>;
  bentoItems$: Observable<BentoGridItem[]>;
  guestStats$: Observable<GuestStats>;
}

/**
 * Service responsible for dashboard business logic and data management.
 * Extracts data stream initialization, stats conversion, and bento items generation
 * from the dashboard component.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly destroy$ = new Subject<void>();

  private readonly guestApi = inject(GuestApiService);
  private readonly websocketStats = inject(WebSocketStatsService);
  private readonly progressFeedback = inject(ProgressFeedbackService);
  private readonly loggerService = inject(LoggerService);
  private readonly logger = this.loggerService.createLogger('DashboardService');

  // State subjects
  private readonly statsSubject$ = new BehaviorSubject<DashboardStats | null>(null);
  private readonly systemHealthSubject$ = new BehaviorSubject<SystemHealth | null>(null);

  /**
   * Creates mock realtime stats for fallback scenarios
   * @returns Mock RealtimeStats object
   */
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
      lastUpdated: new Date(),
    };
  }

  /**
   * Creates mock system metrics for fallback scenarios
   * @returns Mock SystemMetrics object
   */
  private createMockMetrics(): SystemMetrics {
    return {
      cpuUsage: 45,
      memoryUsage: 60,
      diskUsage: 35,
      networkTraffic: 125000,
      timestamp: new Date(),
    };
  }

  /**
   * Converts realtime stats to dashboard stats format
   * @param realtimeStats - The realtime stats from WebSocket
   * @returns DashboardStats object
   */
  private convertToDashboardStats(realtimeStats: RealtimeStats): DashboardStats {
    return {
      totalJobs: 12,
      totalResumes: realtimeStats.totalAnalyses,
      totalReports: realtimeStats.completedToday * 7,
      activeMatches: Math.floor(realtimeStats.totalAnalyses * 0.15),
      systemHealth: {
        status:
          realtimeStats.errorRate > 10
            ? 'error'
            : realtimeStats.errorRate > 5
              ? 'warning'
              : 'healthy',
        uptime: `${Math.floor(realtimeStats.uptime / 86400)}d ${Math.floor((realtimeStats.uptime % 86400) / 3600)}h`,
        responseTime: realtimeStats.averageProcessingTime,
      },
      recentActivity: [
        {
          id: '1',
          type: 'analysis-completed',
          title: '分析完成',
          description: `今日已完成 ${realtimeStats.completedToday} 份简历分析`,
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'completed',
        },
        {
          id: '2',
          type: 'analysis-active',
          title: '分析中',
          description: `当前有 ${realtimeStats.activeAnalyses} 份简历正在分析`,
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          status: 'processing',
        },
      ],
      serviceMetrics: {
        analysisInProgress: realtimeStats.activeAnalyses,
        completedToday: realtimeStats.completedToday,
        averageProcessingTime: `${(realtimeStats.averageProcessingTime / 60).toFixed(1)}分钟`,
        successRate: 1 - realtimeStats.errorRate / 100,
      },
    };
  }

  /**
   * Creates system health object from stats and metrics
   * @param stats - Realtime stats
   * @param metrics - System metrics
   * @returns SystemHealth object
   */
  private createSystemHealth(
    stats: RealtimeStats,
    metrics: SystemMetrics,
  ): SystemHealth {
    const getServiceStatus = (
      metric: number,
      thresholds: { warning: number; error: number },
    ): 'error' | 'warning' | 'healthy' => {
      if (metric > thresholds.error) return 'error';
      if (metric > thresholds.warning) return 'warning';
      return 'healthy';
    };

    return {
      status:
        stats.errorRate > 10
          ? 'error'
          : stats.errorRate > 5
            ? 'warning'
            : 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        gateway: { status: 'healthy', responseTime: 120 },
        resumeParser: {
          status: getServiceStatus(metrics.cpuUsage, {
            warning: 70,
            error: 90,
          }),
          responseTime: 89,
        },
        scoringEngine: {
          status: getServiceStatus(metrics.memoryUsage, {
            warning: 80,
            error: 95,
          }),
          responseTime: 156,
        },
        reportGenerator: { status: 'healthy', responseTime: 234 },
        database: {
          status: getServiceStatus(stats.queueLength, {
            warning: 10,
            error: 20,
          }),
          responseTime: 45,
        },
        messageQueue: {
          status: getServiceStatus(stats.systemLoad, {
            warning: 80,
            error: 95,
          }),
          responseTime: 23,
        },
      },
      processingMetrics: {
        queueDepth: stats.queueLength,
        averageProcessingTime: stats.averageProcessingTime,
        successRate: 1 - stats.errorRate / 100,
        errorRate: stats.errorRate / 100,
      },
    };
  }

  /**
   * Generates system health content HTML for display
   * @param health - System health data
   * @returns HTML string for health content
   */
  public getSystemHealthContent(health: SystemHealth): string {
    const services = Object.entries(health.services);
    const healthyCount = services.filter(
      ([_, service]) => service.status === 'healthy',
    ).length;

    return `
      <div class="health-overview">
        <div class="health-summary">${healthyCount}/${services.length} 服务正常</div>
        <div class="queue-status">队列深度: ${health.processingMetrics.queueDepth}</div>
        <div class="success-rate">成功率: ${(health.processingMetrics.successRate * 100).toFixed(1)}%</div>
      </div>
    `;
  }

  /**
   * Generates recent activity content HTML for display
   * @param activities - List of activity items
   * @returns HTML string for activity content
   */
  public getRecentActivityContent(activities: ActivityItem[]): string {
    if (activities.length === 0) {
      return '<div class="no-activity">暂无最近活动</div>';
    }

    return activities
      .slice(0, 5)
      .map(
        (activity) => `
      <div class="activity-item">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-desc">${activity.description}</div>
        <div class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
      </div>
    `,
      )
      .join('');
  }

  /**
   * Creates bento grid items from dashboard data
   * @param stats - Dashboard statistics
   * @param health - System health data
   * @param guestStats - Guest statistics
   * @param navigateToReports - Callback for navigation
   * @returns Array of BentoGridItem objects
   */
  public createBentoItems(
    stats: DashboardStats,
    health: SystemHealth,
    guestStats: GuestStats,
    navigateToReports: () => void,
  ): BentoGridItem[] {
    return [
      {
        id: 'total-jobs',
        title: '职位数量',
        subtitle: '当前活跃职位',
        value: stats.totalJobs,
        icon: 'jobs',
        variant: 'primary',
        size: 'medium',
        clickable: true,
      },
      {
        id: 'total-resumes',
        title: '简历总数',
        subtitle: '已分析简历',
        value: stats.totalResumes,
        icon: 'resumes',
        variant: 'success',
        size: 'medium',
        trend: { type: 'up', value: '+12%', period: '本周' },
      },
      {
        id: 'total-reports',
        title: '分析报告',
        subtitle: '已生成报告',
        value: stats.totalReports,
        icon: 'reports',
        variant: 'info',
        size: 'medium',
      },
      {
        id: 'active-matches',
        title: '活跃匹配',
        subtitle: '智能匹配结果',
        value: stats.activeMatches,
        icon: 'matches',
        variant: 'warning',
        size: 'medium',
        action: { text: '查看详情', onClick: navigateToReports },
      },
      {
        id: 'system-health',
        title: '系统健康状态',
        subtitle: `响应时间: ${health.services.gateway.responseTime}ms`,
        content: this.getSystemHealthContent(health),
        icon: 'analytics',
        variant: 'success',
        size: 'large',
        badge: '正常',
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
        size: 'wide',
      },
      {
        id: 'recent-activity',
        title: '最近活动',
        subtitle: `${stats.recentActivity.length} 条最新记录`,
        content: this.getRecentActivityContent(stats.recentActivity),
        icon: 'activity',
        variant: 'default',
        size: 'tall',
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
        size: 'medium',
      },
    ];
  }

  /**
   * Handles WebSocket events and shows appropriate notifications
   * @param event - Analysis event from WebSocket
   */
  private handleWebSocketEvent(event: {
    type: 'started' | 'progress' | 'completed' | 'failed';
    analysisId: string;
  }): void {
    switch (event.type) {
      case 'started':
        this.progressFeedback.showInfo(
          '分析开始',
          `开始分析简历: ${event.analysisId.slice(-6)}`,
        );
        break;
      case 'completed':
        this.progressFeedback.showSuccess(
          '分析完成',
          `简历分析已完成: ${event.analysisId.slice(-6)}`,
        );
        break;
      case 'failed':
        this.progressFeedback.showError(
          '分析失败',
          `简历分析失败: ${event.analysisId.slice(-6)}`,
        );
        break;
    }
  }

  /**
   * Initializes all data streams for the dashboard
   * @returns DashboardState with all observables
   */
  public initializeDataStreams(): DashboardState {
    // Use real-time WebSocket data with fallback to mock data
    const realtimeStats$ = this.websocketStats.subscribeToStats().pipe(
      takeUntil(this.destroy$),
      catchError(() => {
        this.logger.warn('WebSocket stats unavailable, using mock data');
        return of(this.createMockRealtimeStats());
      }),
    );

    // Subscribe to WebSocket events for live updates
    this.websocketStats
      .subscribeToEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleWebSocketEvent(event));

    // Convert real-time stats to dashboard stats format
    const stats$ = realtimeStats$.pipe(
      map((realtimeStats) => this.convertToDashboardStats(realtimeStats)),
      shareReplay(1),
    );

    // Subscribe to update subject
    stats$.subscribe((stats) => this.statsSubject$.next(stats));

    // Create system health from real-time metrics
    const systemHealth$ = combineLatest([
      realtimeStats$,
      this.websocketStats.subscribeToMetrics().pipe(
        takeUntil(this.destroy$),
        catchError(() => of(this.createMockMetrics())),
      ),
    ]).pipe(
      map(([stats, metrics]) => this.createSystemHealth(stats, metrics)),
      shareReplay(1),
    );

    // Subscribe to update subject
    systemHealth$.subscribe((health) => this.systemHealthSubject$.next(health));

    // Get guest stats
    const guestStats$ = this.guestApi.getServiceStats().pipe(
      takeUntil(this.destroy$),
      catchError(() =>
        of({
          totalGuests: 1247,
          activeGuests: 89,
          pendingFeedbackCodes: 23,
          redeemedFeedbackCodes: 156,
        }),
      ),
    );

    // Combine all data streams for bento items
    const bentoItems$ = combineLatest([
      stats$,
      systemHealth$,
      guestStats$,
    ]).pipe(
      map(([stats, health, guestStats]) =>
        this.createBentoItems(stats, health, guestStats, () => this.navigateToReports()),
      ),
      shareReplay(1),
    );

    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.websocketStats.refreshStats();
      });

    return {
      stats$,
      systemHealth$,
      bentoItems$,
      guestStats$,
    };
  }

  /**
   * Gets system status display text
   * @param status - The status string
   * @returns Localized status text
   */
  public getSystemStatusText(status?: string): string {
    switch (status) {
      case 'healthy':
        return '正常';
      case 'warning':
        return '警告';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  }

  /**
   * Navigation handler for reports
   */
  private navigateToReports(): void {
    this.logger.userAction('Navigate to reports');
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
