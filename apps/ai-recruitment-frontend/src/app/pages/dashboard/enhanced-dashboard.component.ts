import type { OnInit, OnDestroy } from '@angular/core';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { Observable } from 'rxjs';
import { SharedModule } from '../../components/shared/shared.module';
import type { BentoGridItem } from '../../components/shared/bento-grid/bento-grid-item.component';
import { BentoGridComponent } from '../../components/shared/bento-grid/bento-grid.component';
import type { DashboardStats, SystemHealth } from '../../services/dashboard-api.service';
import { DashboardService, type GuestStats } from './dashboard.service';
import { StatsDisplayComponent } from './stats-display.component';
import { MetricsComponent } from './metrics.component';
import { ChartsComponent } from './charts.component';

/**
 * Main dashboard component that orchestrates the display of recruitment system statistics.
 * Uses extracted components and services for better maintainability.
 */
@Component({
  selector: 'arc-enhanced-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    BentoGridComponent,
    StatsDisplayComponent,
    MetricsComponent,
    ChartsComponent,
  ],
  template: `
    <div class="dashboard-container">
      <!-- Welcome Header -->
      <div class="welcome-section">
        <h1 class="welcome-title">AI 招聘助理 Dashboard</h1>
        <p class="welcome-subtitle">智能简历筛选，提升招聘效率</p>
        <arc-stats-display
          [systemHealth]="(systemHealth$ | async) || null"
          [guestStats]="(guestStats$ | async) || null"
        ></arc-stats-display>
      </div>

      <!-- Main Bento Grid Dashboard -->
      <arc-bento-grid
        [items]="(bentoItems$ | async) || []"
        [gridSize]="'default'"
        [ariaLabel]="'招聘系统仪表板'"
        [onItemClickHandler]="onBentoItemClick.bind(this)"
      >
      </arc-bento-grid>

      <!-- Quick Actions -->
      <div class="quick-actions-section">
        <h2 class="section-title">快速操作</h2>
        <div class="actions-grid">
          <a routerLink="/resume" class="action-card primary">
            <div class="action-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                ></path>
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
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
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
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
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
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
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
  styles: [
    `
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
    `,
  ],
})
export class EnhancedDashboardComponent implements OnInit, OnDestroy {
  public stats$!: Observable<DashboardStats>;
  public systemHealth$!: Observable<SystemHealth>;
  public bentoItems$!: Observable<BentoGridItem[]>;
  public guestStats$!: Observable<GuestStats>;

  private readonly dashboardService = inject(DashboardService);

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    const state = this.dashboardService.initializeDataStreams();
    this.stats$ = state.stats$;
    this.systemHealth$ = state.systemHealth$;
    this.bentoItems$ = state.bentoItems$;
    this.guestStats$ = state.guestStats$;
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.dashboardService.destroy();
  }

  /**
   * Performs the on bento item click operation.
   * @param item - The item.
   */
  public onBentoItemClick(item: BentoGridItem): void {
    // Log the click event - can be enhanced with router navigation
    console.log('Bento item clicked:', item.id);
  }
}
