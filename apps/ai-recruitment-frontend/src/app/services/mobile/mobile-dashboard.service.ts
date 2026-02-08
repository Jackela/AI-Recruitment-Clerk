import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Defines the shape of the dashboard stat.
 */
export interface DashboardStat {
  id: string;
  title: string;
  value: number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
}

/**
 * Defines the shape of the dashboard card.
 */
export interface DashboardCard {
  id: string;
  title: string;
  subtitle?: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  route?: string;
  actions?: SwipeAction[];
  priority: 'high' | 'medium' | 'low';
  size: 'small' | 'medium' | 'large';
}

/**
 * Defines the shape of the swipe action.
 */
export interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  width: number;
}

/**
 * Defines the shape of the quick action.
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  badge?: number;
}

/**
 * Defines the shape of the activity item.
 */
export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timeAgo: string;
  type: 'success' | 'info' | 'warning' | 'error';
  icon: string;
}

/**
 * Defines the shape of the FAB action.
 */
export interface FabAction {
  label: string;
  icon: string;
}

/**
 * Defines the shape of the chart data point.
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Defines the shape of the dashboard chart.
 */
export interface DashboardChart {
  id: string;
  title: string;
  type: 'sparkline' | 'bar' | 'donut' | 'line';
  data: ChartDataPoint[];
  height?: number;
  showLabels?: boolean;
  showLegend?: boolean;
}

/**
 * Defines the shape of the navigation configuration.
 */
export interface NavigationConfig {
  navItems: NavItem[];
  menuItems: NavItem[];
  headerActions: HeaderAction[];
}

/**
 * Defines the shape of the navigation item.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

/**
 * Defines the shape of the header action.
 */
export interface HeaderAction {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

/**
 * Dashboard state containing all data for the dashboard view.
 */
export interface DashboardState {
  stats: DashboardStat[];
  cards: DashboardCard[];
  quickActions: QuickAction[];
  activities: ActivityItem[];
  isRefreshing: boolean;
}

/**
 * Mobile dashboard service.
 * Handles data aggregation, state management, and refresh logic for the mobile dashboard.
 * This service extracts business logic from the dashboard component for better
 * testability and reusability.
 *
 * @example
 * ```typescript
 * constructor(private dashboardService: MobileDashboardService) {}
 *
 * ngOnInit() {
 *   this.state$ = this.dashboardService.state$;
 *   this.dashboardService.loadDashboardData();
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MobileDashboardService {
  private readonly destroy$ = new Subject<void>();

  // State sources
  private readonly statsSource = new BehaviorSubject<DashboardStat[]>([]);
  private readonly cardsSource = new BehaviorSubject<DashboardCard[]>([]);
  private readonly quickActionsSource = new BehaviorSubject<QuickAction[]>([]);
  private readonly activitiesSource = new BehaviorSubject<ActivityItem[]>([]);
  private readonly isRefreshingSource = new BehaviorSubject<boolean>(false);

  // Computed state
  private readonly stateSource = new BehaviorSubject<DashboardState>({
    stats: [],
    cards: [],
    quickActions: [],
    activities: [],
    isRefreshing: false,
  });

  // Public observables
  public readonly stats$ = this.statsSource.asObservable();
  public readonly cards$ = this.cardsSource.asObservable();
  public readonly quickActions$ = this.quickActionsSource.asObservable();
  public readonly activities$ = this.activitiesSource.asObservable();
  public readonly isRefreshing$ = this.isRefreshingSource.asObservable();
  public readonly state$ = this.stateSource.asObservable();

  /**
   * Loads all dashboard data.
   * In production, this would fetch data from an API.
   */
  public loadDashboardData(): void {
    // Default dashboard stats
    const stats: DashboardStat[] = [
      {
        id: 'total-resumes',
        title: 'Total Resumes',
        value: 147,
        icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
        color: 'primary',
        change: { value: 12, type: 'increase', period: 'this week' },
      },
      {
        id: 'active-jobs',
        title: 'Active Jobs',
        value: 8,
        icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z',
        color: 'success',
      },
      {
        id: 'pending-reviews',
        title: 'Pending Reviews',
        value: 23,
        icon: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z',
        color: 'warning',
      },
      {
        id: 'hired-candidates',
        title: 'Hired This Month',
        value: 5,
        icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z',
        color: 'success',
        change: { value: 25, type: 'increase', period: 'vs last month' },
      },
    ];

    // Default dashboard cards
    const cards: DashboardCard[] = [
      {
        id: 'recent-uploads',
        title: 'Recent Uploads',
        subtitle: 'Latest resume submissions',
        value: '12 new',
        icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
        color: 'primary',
        route: '/uploads/recent',
        priority: 'high',
        size: 'medium',
        actions: [
          {
            id: 'view',
            label: 'View',
            icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z',
            color: 'primary',
            width: 80,
          },
          {
            id: 'process',
            label: 'Process',
            icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
            color: 'success',
            width: 80,
          },
        ],
      },
      {
        id: 'top-matches',
        title: 'Top Matches',
        subtitle: 'Candidates with highest scores',
        value: '8 candidates',
        icon: 'M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4Z',
        color: 'success',
        route: '/matches/top',
        priority: 'high',
        size: 'medium',
        actions: [
          {
            id: 'review',
            label: 'Review',
            icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z',
            color: 'primary',
            width: 80,
          },
          {
            id: 'shortlist',
            label: 'Shortlist',
            icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
            color: 'success',
            width: 80,
          },
        ],
      },
    ];

    // Default quick actions
    const quickActions: QuickAction[] = [
      {
        id: 'upload',
        label: 'Upload Resume',
        icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
        route: '/resume/upload',
        color: 'primary',
      },
      {
        id: 'create-job',
        label: 'Create Job',
        icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
        route: '/jobs/create',
        color: 'success',
      },
      {
        id: 'candidates',
        label: 'Candidates',
        icon: 'M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4M16,13.4C18.39,13.4 22.2,14.6 22.2,17V19.2H9.8V17C9.8,14.6 13.61,13.4 16,13.4Z',
        route: '/candidates',
        color: 'warning',
        badge: 12,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21Z',
        route: '/analytics',
        color: 'danger',
      },
    ];

    // Default recent activities
    const activities: ActivityItem[] = [
      {
        id: '1',
        title: 'New resume uploaded',
        subtitle: 'Senior Developer position',
        timeAgo: '2 minutes ago',
        type: 'success',
        icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
      },
      {
        id: '2',
        title: 'Analysis completed',
        subtitle: 'Marketing Manager - 3 candidates',
        timeAgo: '15 minutes ago',
        type: 'info',
        icon: 'M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z',
      },
      {
        id: '3',
        title: 'Job posting expires soon',
        subtitle: 'Frontend Developer - 2 days left',
        timeAgo: '1 hour ago',
        type: 'warning',
        icon: 'M13,14H11V10H13M13,18H11V16H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
      },
    ];

    this.statsSource.next(stats);
    this.cardsSource.next(cards);
    this.quickActionsSource.next(quickActions);
    this.activitiesSource.next(activities);
    this.updateState();
  }

  /**
   * Refreshes dashboard data from the server.
   * In production, this would make an API call to fetch updated data.
   */
  public refreshDashboard(): void {
    if (this.isRefreshingSource.value) {
      return;
    }

    this.isRefreshingSource.next(true);
    this.updateState();

    // Simulate API call with timeout
    setTimeout(() => {
      // In production, fetch new data here
      this.loadDashboardData();
      this.isRefreshingSource.next(false);
      this.updateState();
    }, 1500);
  }

  /**
   * Sets the stats manually.
   * @param stats - The dashboard stats to set.
   */
  public setStats(stats: DashboardStat[]): void {
    this.statsSource.next(stats);
    this.updateState();
  }

  /**
   * Sets the cards manually.
   * @param cards - The dashboard cards to set.
   */
  public setCards(cards: DashboardCard[]): void {
    this.cardsSource.next(cards);
    this.updateState();
  }

  /**
   * Sets the quick actions manually.
   * @param quickActions - The quick actions to set.
   */
  public setQuickActions(quickActions: QuickAction[]): void {
    this.quickActionsSource.next(quickActions);
    this.updateState();
  }

  /**
   * Sets the activities manually.
   * @param activities - The activity items to set.
   */
  public setActivities(activities: ActivityItem[]): void {
    this.activitiesSource.next(activities);
    this.updateState();
  }

  /**
   * Returns the FAB (floating action button) configuration.
   */
  public getFabAction(): FabAction {
    return {
      label: 'Upload Resume',
      icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
    };
  }

  /**
   * Returns the current state snapshot.
   */
  public getStateSnapshot(): DashboardState {
    return this.stateSource.value;
  }

  /**
   * Checks if a refresh is currently in progress.
   */
  public isRefreshing(): boolean {
    return this.isRefreshingSource.value;
  }

  /**
   * Cleanup method for service destruction.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Updates the computed state based on current values.
   */
  private updateState(): void {
    this.stateSource.next({
      stats: this.statsSource.value,
      cards: this.cardsSource.value,
      quickActions: this.quickActionsSource.value,
      activities: this.activitiesSource.value,
      isRefreshing: this.isRefreshingSource.value,
    });
  }
}
