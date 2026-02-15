import { Component, Input, Output, EventEmitter, Directive } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';

import type {
  MobileNavItem,
} from './mobile-navigation.component';
import type {
  SwipeEvent,
  SwipeAction,
} from './mobile-swipe.component';
import type {
  DashboardStat,
} from './dashboard-stats.component';
import type {
  DashboardChart,
} from './dashboard-charts.component';
import type {
  QuickAction,
  ActivityItem,
} from '../../services/mobile/mobile-dashboard.service';

/**
 * Mock PullToRefreshDirective to avoid DestroyRef issues
 */
@Directive({
  selector: '[arcPullToRefresh]',
  standalone: true,
})
export class MockPullToRefreshDirective {
  @Input() public threshold = 100;
  @Input() public visibleThreshold = 20;
  @Output() public refresh = new EventEmitter<void>();
  @Output() public indicatorVisible = new EventEmitter<boolean>();
}

/**
 * Mock MobileNavigationComponent for testing
 */
@Component({
  selector: 'arc-mobile-navigation',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mock-mobile-navigation"></div>',
})
export class MockMobileNavigationComponent {
  @Input() public pageTitle = '';
  @Input() public pageSubtitle = '';
  @Input() public navItems: MobileNavItem[] = [];
  @Input() public menuItems: MobileNavItem[] = [];
  @Input()
  public headerActions: { id: string; label: string; icon?: string }[] = [];
  @Output() public actionClick = new EventEmitter<{ id: string; label: string }>();
}

/**
 * Mock MobileSwipeComponent for testing
 */
@Component({
  selector: 'app-mobile-swipe',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mock-mobile-swipe"><ng-content></ng-content></div>',
})
export class MockMobileSwipeComponent {
  @Input() public actions: SwipeAction[] = [];
  @Input() public item: Record<string, unknown> = {};
  @Output() public swipeAction = new EventEmitter<SwipeEvent>();
}

/**
 * Mock MobileQuickActionsComponent for testing
 */
@Component({
  selector: 'arc-mobile-quick-actions',
  standalone: true,
  imports: [CommonModule],
  template:
    '<div class="quick-actions-bar" *ngIf="quickActions.length > 0"><div class="quick-action" *ngFor="let action of quickActions"></div></div>',
})
export class MockMobileQuickActionsComponent {
  @Input() public quickActions: QuickAction[] = [];
}

/**
 * Mock DashboardStatsComponent for testing
 */
@Component({
  selector: 'arc-dashboard-stats',
  standalone: true,
  imports: [CommonModule],
  template:
    '<div class="stats-overview" *ngIf="stats.length > 0"><div class="stat-card" *ngFor="let stat of stats"></div></div>',
})
export class MockDashboardStatsComponent {
  @Input() public stats: DashboardStat[] = [];
}

/**
 * Mock DashboardChartsComponent for testing
 */
@Component({
  selector: 'arc-dashboard-charts',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="charts-container"></div>',
})
export class MockDashboardChartsComponent {
  @Input() public charts: DashboardChart[] = [];
}

/**
 * Mock MobileActivityListComponent for testing
 */
@Component({
  selector: 'arc-mobile-activity-list',
  standalone: true,
  imports: [CommonModule],
  template:
    '<div class="recent-activity" *ngIf="activities.length > 0"><div class="activity-item" *ngFor="let activity of activities"></div></div>',
})
export class MockMobileActivityListComponent {
  @Input() public activities: ActivityItem[] = [];
  @Output() public activityClick = new EventEmitter<ActivityItem>();
}

/**
 * Setup global mocks for mobile testing
 */
export function setupGlobalMocks(): void {
  // Mock navigator.vibrate
  Object.defineProperty(navigator, 'vibrate', {
    value: jest.fn(),
    writable: true,
  });

  // Mock window.scrollY
  Object.defineProperty(window, 'scrollY', {
    value: 0,
    writable: true,
  });
}

/**
 * Export all mock imports for convenience
 */
export const mockImports = [
  CommonModule,
  RouterTestingModule,
  MockMobileNavigationComponent,
  MockMobileSwipeComponent,
  MockMobileQuickActionsComponent,
  MockDashboardStatsComponent,
  MockDashboardChartsComponent,
  MockMobileActivityListComponent,
  MockPullToRefreshDirective,
];

// Setup global mocks immediately
setupGlobalMocks();
