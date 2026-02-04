import type {
  OnInit,
  OnDestroy} from '@angular/core';
import {
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type {
  MobileNavItem} from './mobile-navigation.component';
import {
  MobileNavigationComponent
} from './mobile-navigation.component';
import type {
  SwipeEvent} from './mobile-swipe.component';
import {
  MobileSwipeComponent
} from './mobile-swipe.component';
import { TouchGestureService } from '../../services/mobile/touch-gesture.service';
import type { DashboardStat } from './dashboard-stats.component';
import { DashboardStatsComponent } from './dashboard-stats.component';
import type {
  DashboardChart,
  ChartDataPoint,
} from './dashboard-charts.component';
import {
  DashboardChartsComponent
} from './dashboard-charts.component';
import {
  MobileQuickActionsComponent
} from './mobile-quick-actions.component';
import {
  MobileActivityListComponent
} from './mobile-activity-list.component';
import type {
  DashboardCard,
  QuickAction,
  ActivityItem,
  FabAction,
  DashboardState,
} from '../../services/mobile/mobile-dashboard.service';
import {
  MobileDashboardService
} from '../../services/mobile/mobile-dashboard.service';

/**
 * Defines the shape of the swipe action (re-exported for template).
 */
export interface SwipeActionExport {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  width: number;
}

/**
 * Represents the mobile dashboard component.
 * A thin orchestrator that delegates business logic to MobileDashboardService.
 */
@Component({
  selector: 'arc-mobile-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MobileNavigationComponent,
    MobileSwipeComponent,
    DashboardStatsComponent,
    DashboardChartsComponent,
    MobileQuickActionsComponent,
    MobileActivityListComponent,
  ],
  template: `
    <!-- Mobile Navigation -->
    <arc-mobile-navigation
      [pageTitle]="pageTitle"
      [pageSubtitle]="pageSubtitle"
      [navItems]="navItems"
      [menuItems]="menuItems"
      [headerActions]="headerActions"
      (actionClick)="onHeaderAction($event)"
    >
    </arc-mobile-navigation>

    <!-- Dashboard Content -->
    <div class="mobile-dashboard-content">
      <!-- Pull to Refresh Indicator -->
      <div
        class="pull-refresh-indicator"
        [class.visible]="isPullRefreshVisible"
        [class.loading]="isRefreshing"
      >
        <div class="refresh-spinner"></div>
        <span class="refresh-text">{{
          isRefreshing ? 'Refreshing...' : 'Pull to refresh'
        }}</span>
      </div>

      <!-- Quick Actions Bar -->
      <arc-mobile-quick-actions
        [quickActions]="quickActions"
      ></arc-mobile-quick-actions>

      <!-- Stats Overview -->
      <arc-dashboard-stats [stats]="overviewStats"></arc-dashboard-stats>

      <!-- Charts Section -->
      <arc-dashboard-charts [charts]="dashboardCharts"></arc-dashboard-charts>

      <!-- Dashboard Cards -->
      <div class="dashboard-cards" *ngIf="dashboardCards.length > 0">
        <h2 class="section-title">Dashboard</h2>
        <div class="cards-container" #dashboardContainer>
          <app-mobile-swipe
            *ngFor="let card of dashboardCards"
            [actions]="card.actions || []"
            [item]="card"
            (swipeAction)="onCardSwipe($event)"
          >
            <div
              class="dashboard-card"
              [class]="'dashboard-card--' + card.size + ' dashboard-card--' + card.color"
              [class.interactive]="!!card.route"
              [routerLink]="card.route"
              (click)="onCardClick(card)"
              (keydown.enter)="onCardClick(card)"
              (keydown.space)="onCardClick(card)"
              [attr.tabindex]="card.route ? 0 : null"
            >
              <div class="card-header">
                <div class="card-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path [attr.d]="card.icon" />
                  </svg>
                </div>
                <div
                  class="card-priority"
                  [class]="'priority--' + card.priority"
                ></div>
              </div>

              <div class="card-content">
                <h3 class="card-title">{{ card.title }}</h3>
                <p class="card-subtitle" *ngIf="card.subtitle">
                  {{ card.subtitle }}
                </p>
                <div class="card-value">{{ card.value }}</div>
                <div class="card-change" *ngIf="card.change">
                  <span
                    class="change-indicator"
                    [class]="'change-' + card.change.type"
                  >
                    {{ card.change.type === 'increase' ? '↗' : '↘' }}
                    {{ Math.abs(card.change.value) }}%
                  </span>
                  <span class="change-period">vs {{ card.change.period }}</span>
                </div>
              </div>
            </div>
          </app-mobile-swipe>
        </div>
      </div>

      <!-- Recent Activity -->
      <arc-mobile-activity-list
        [activities]="recentActivity"
        (activityClick)="onActivityClick($event)"
      ></arc-mobile-activity-list>
    </div>

    <!-- Floating Action Button -->
    <button
      class="mobile-fab"
      [attr.aria-label]="fabAction.label"
      (click)="onFabClick()"
      (keydown.enter)="onFabClick()"
      (keydown.space)="onFabClick()"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path [attr.d]="fabAction.icon" />
      </svg>
    </button>
  `,
  styles: [
    `
      .mobile-dashboard-content {
        padding: calc(var(--spacing-16, 4rem) + var(--spacing-2, 0.5rem))
          var(--spacing-4, 1rem) var(--spacing-20, 5rem);
        min-height: 100vh;
        background: var(--color-background, #f8f9fa);
      }

      .pull-refresh-indicator {
        position: fixed;
        top: calc(var(--spacing-14, 3.5rem) + var(--spacing-2, 0.5rem));
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        background: var(--color-surface, white);
        border-radius: var(--border-radius-xl, 20px);
        padding: var(--spacing-3, 0.75rem) var(--spacing-5, 1.25rem);
        box-shadow: var(--shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.15));
        display: flex;
        align-items: center;
        gap: var(--spacing-2, 0.5rem);
        z-index: 500;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.8);

        &.visible {
          transform: translateX(-50%) translateY(10px);
        }

        &.loading {
          pointer-events: none;

          .refresh-spinner {
            animation-duration: 0.8s;
          }
        }

        @supports (top: env(safe-area-inset-top)) {
          top: calc(56px + env(safe-area-inset-top));
        }

        .refresh-spinner {
          width: var(--spacing-4, 1rem);
          height: var(--spacing-4, 1rem);
          border: 2px solid var(--color-border, #e9ecef);
          border-top: 2px solid var(--color-primary, #3498db);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          will-change: transform;

          @media (prefers-reduced-motion: reduce) {
            animation-duration: 2s;
          }
        }

        .refresh-text {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
          user-select: none;
          pointer-events: none;
        }
      }

      .dashboard-cards {
        margin-bottom: var(--spacing-6, 1.5rem);

        .cards-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-3, 0.75rem);

          .dashboard-card {
            background: var(--color-surface, white);
            border-radius: var(--border-radius-lg, 12px);
            padding: var(--spacing-4, 1rem);
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));
            text-decoration: none;
            color: inherit;
            position: relative;
            overflow: hidden;

            &.interactive:active {
              transform: scale(0.98);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .card-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: var(--spacing-3, 0.75rem);

              .card-icon {
                width: var(--spacing-10, 2.5rem);
                height: var(--spacing-10, 2.5rem);
                border-radius: var(--border-radius-md, 8px);
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--color-background, #f8f9fa);
                color: var(--color-text-secondary, #6c757d);
              }

              .card-priority {
                width: var(--spacing-2, 0.5rem);
                height: var(--spacing-2, 0.5rem);
                border-radius: 50%;

                &.priority--high {
                  background: #e74c3c;
                }

                &.priority--medium {
                  background: #f39c12;
                }

                &.priority--low {
                  background: #95a5a6;
                }
              }
            }

            .card-content {
              .card-title {
                font-size: 16px;
                font-weight: 600;
                color: #2c3e50;
                margin: 0 0 4px 0;
                line-height: 1.3;
              }

              .card-subtitle {
                font-size: 12px;
                color: #6c757d;
                margin: 0 0 8px 0;
                line-height: 1.4;
              }

              .card-value {
                font-size: 24px;
                font-weight: 700;
                color: #2c3e50;
                margin-bottom: 8px;
                line-height: 1.2;
              }

              .card-change {
                display: flex;
                align-items: center;
                gap: var(--spacing-2, 0.5rem);

                .change-indicator {
                  font-size: 0.75rem;
                  font-weight: 600;
                  padding: var(--spacing-1, 0.25rem) var(--spacing-2, 0.5rem);
                  border-radius: var(--border-radius-sm, 4px);

                  &.change-increase {
                    background: rgba(40, 167, 69, 0.1);
                    color: #28a745;
                  }

                  &.change-decrease {
                    background: rgba(231, 76, 60, 0.1);
                    color: #e74c3c;
                  }
                }

                .change-period {
                  font-size: 11px;
                  color: #95a5a6;
                }
              }
            }

            &--large {
              grid-column: span 2;
            }

            &--primary {
              .card-header .card-icon {
                background: rgba(52, 152, 219, 0.1);
                color: #3498db;
              }
            }

            &--success {
              .card-header .card-icon {
                background: rgba(40, 167, 69, 0.1);
                color: #28a745;
              }
            }

            &--warning {
              .card-header .card-icon {
                background: rgba(255, 193, 7, 0.1);
                color: #ffc107;
              }
            }

            &--danger {
              .card-header .card-icon {
                background: rgba(231, 76, 60, 0.1);
                color: #e74c3c;
              }
            }
          }
        }
      }

      .mobile-fab {
        position: fixed;
        bottom: 80px;
        right: 16px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #3498db;
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 999;

        &:active {
          transform: scale(0.9);
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.6);
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (min-width: 768px) {
        .mobile-dashboard-content {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-cards .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .mobile-fab {
          display: none;
        }
      }
    `,
  ],
})
export class MobileDashboardComponent implements OnInit, OnDestroy {
  public pageTitle = 'Dashboard';
  public pageSubtitle = 'Recruitment insights at a glance';

  private readonly destroy$ = new Subject<void>();

  // Navigation
  public navItems: MobileNavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3',
      route: '/dashboard',
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
      route: '/resume/upload',
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z',
      route: '/jobs',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z',
      route: '/reports',
    },
  ];

  public menuItems: MobileNavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
      route: '/settings',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'M11,18H13V16H11V18M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z',
      route: '/help',
    },
  ];

  public headerActions = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,21A1.5,1.5 0 0,0 9,19.5H15A1.5,1.5 0 0,0 16.5,21A1.5,1.5 0 0,0 15,22.5H9A1.5,1.5 0 0,0 7.5,21Z',
      badge: 3,
    },
  ];

  // Charts data (static for now)
  public dashboardCharts: DashboardChart[] = [
    {
      id: 'weekly-resumes',
      title: 'Resumes This Week',
      type: 'sparkline',
      data: [
        { label: 'Mon', value: 12 },
        { label: 'Tue', value: 19 },
        { label: 'Wed', value: 8 },
        { label: 'Thu', value: 15 },
        { label: 'Fri', value: 22 },
        { label: 'Sat', value: 10 },
        { label: 'Sun', value: 5 },
      ] as ChartDataPoint[],
      height: 120,
    },
    {
      id: 'candidate-sources',
      title: 'Candidate Sources',
      type: 'bar',
      data: [
        { label: 'LinkedIn', value: 45, color: '#0077b5' },
        { label: 'Indeed', value: 32, color: '#2557a7' },
        { label: 'Referral', value: 28, color: '#27ae60' },
        { label: 'Direct', value: 18, color: '#3498db' },
      ] as ChartDataPoint[],
      showLabels: true,
      height: 180,
    },
    {
      id: 'hiring-status',
      title: 'Hiring Pipeline',
      type: 'donut',
      data: [
        { label: 'Applied', value: 147, color: '#3498db' },
        { label: 'Screening', value: 52, color: '#f39c12' },
        { label: 'Interview', value: 23, color: '#9b59b6' },
        { label: 'Offer', value: 8, color: '#1abc9c' },
        { label: 'Hired', value: 5, color: '#27ae60' },
      ] as ChartDataPoint[],
      showLegend: true,
      height: 200,
    },
  ];

  // State from service
  public overviewStats: DashboardStat[] = [];
  public dashboardCards: DashboardCard[] = [];
  public quickActions: QuickAction[] = [];
  public recentActivity: ActivityItem[] = [];
  public fabAction: FabAction = { label: '', icon: '' };
  public isRefreshing = false;

  // Pull-to-refresh state
  public isPullRefreshVisible = false;

  private readonly _touchGesture = inject(TouchGestureService);
  private readonly _dashboardService = inject(MobileDashboardService);

  /**
   * Initializes a new instance of the Mobile Dashboard Component.
   */
  constructor() {
    void this._touchGesture;
  }

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Subscribe to dashboard state
    this._dashboardService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: DashboardState) => {
        this.overviewStats = state.stats;
        this.dashboardCards = state.cards;
        this.quickActions = state.quickActions;
        this.recentActivity = state.activities;
        this.isRefreshing = state.isRefreshing;
      });

    // Load dashboard data
    this._dashboardService.loadDashboardData();

    // Get FAB configuration
    this.fabAction = this._dashboardService.getFabAction();

    // Setup pull-to-refresh gesture handling
    this.setupPullToRefresh();
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs the on header action operation.
   */
  public onHeaderAction(action: {
    id: string;
    label: string;
    icon: string;
    badge?: number;
  }): void {
    switch (action.id) {
      case 'notifications':
        break;
      default:
        break;
    }
  }

  /**
   * Performs the on card click operation.
   */
  public onCardClick(card: DashboardCard): void {
    if (card.route) {
      // Router navigation handled by routerLink
    }
  }

  /**
   * Performs the on card swipe operation.
   */
  public onCardSwipe(event: SwipeEvent): void {
    switch (event.action.id) {
      case 'view':
      case 'process':
      case 'review':
      case 'shortlist':
        break;
      default:
        break;
    }
  }

  /**
   * Performs the on activity click operation.
   */
  public onActivityClick(activity: ActivityItem): void {
    switch (activity.type) {
      case 'success':
      case 'info':
      case 'warning':
        break;
      default:
        break;
    }
  }

  /**
   * Performs the on fab click operation.
   */
  public onFabClick(): void {
    // Navigate to upload page
  }

  /**
   * Sets up pull-to-refresh gesture handling.
   */
  private setupPullToRefresh(): void {
    let startY = 0;
    let startX = 0;
    let currentY = 0;
    let currentX = 0;
    let isPulling = false;
    let touchIdentifier: number | null = null;

    const handleTouchStart = (e: TouchEvent): void => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      touchIdentifier = touch.identifier;
      startY = touch.clientY;
      startX = touch.clientX;
      currentY = startY;
      currentX = startX;
      isPulling = false;
    };

    const handleTouchMove = (e: TouchEvent): void => {
      if (touchIdentifier === null) return;

      let targetTouch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdentifier) {
          targetTouch = e.touches[i];
          break;
        }
      }

      if (!targetTouch) return;

      currentY = targetTouch.clientY;
      currentX = targetTouch.clientX;
      const deltaY = currentY - startY;
      const deltaX = Math.abs(currentX - startX);
      const isVerticalPull = deltaY > 0;
      const isHorizontalScroll = deltaX > 30;
      const isPrimaryVertical = Math.abs(deltaY) > deltaX * 1.5;

      if (isVerticalPull && !isHorizontalScroll && isPrimaryVertical) {
        isPulling = true;

        if (deltaY > 20 && deltaY < 100) {
          this.isPullRefreshVisible = true;
        } else if (deltaY >= 100) {
          this.isPullRefreshVisible = true;

          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }

          if (deltaY > deltaX * 2) {
            e.preventDefault();
          }
        }
      } else if (isHorizontalScroll || !isPrimaryVertical) {
        this.isPullRefreshVisible = false;
        isPulling = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent): void => {
      if (touchIdentifier === null) {
        this.resetPullState();
        return;
      }

      let touchEnded = true;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdentifier) {
          touchEnded = false;
          break;
        }
      }

      if (touchEnded) {
        const deltaY = currentY - startY;
        const deltaX = Math.abs(currentX - startX);

        if (isPulling && deltaY >= 100 && deltaX < 50) {
          this.triggerRefresh();
        } else {
          this.resetPullState();
        }

        touchIdentifier = null;
      }
    };

    const handleTouchCancel = (): void => {
      this.resetPullState();
      touchIdentifier = null;
    };

    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, {
      passive: true,
    });

    this.destroy$.subscribe(() => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    });
  }

  /**
   * Resets the pull-to-refresh state.
   */
  private resetPullState(): void {
    this.isPullRefreshVisible = false;
  }

  /**
   * Triggers the dashboard refresh.
   */
  private triggerRefresh(): void {
    if (this.isRefreshing) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30]);
    }

    this._dashboardService.refreshDashboard();
    this.resetPullState();
  }
}
