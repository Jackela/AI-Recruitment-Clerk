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
import {
  PullToRefreshDirective
} from '../../directives/pull-to-refresh.directive';
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
    PullToRefreshDirective,
    DashboardStatsComponent,
    DashboardChartsComponent,
    MobileQuickActionsComponent,
    MobileActivityListComponent,
  ],
  templateUrl: './mobile-dashboard.component.html',
  styleUrl: './mobile-dashboard.component.scss',
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

  private readonly _dashboardService = inject(MobileDashboardService);

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
   * Handles the refresh event from the pull-to-refresh directive.
   */
  public onRefresh(): void {
    if (this.isRefreshing) return;
    this._dashboardService.refreshDashboard();
  }

  /**
   * Handles the indicator visibility event from the pull-to-refresh directive.
   */
  public onIndicatorVisible(visible: boolean): void {
    this.isPullRefreshVisible = visible;
  }
}
