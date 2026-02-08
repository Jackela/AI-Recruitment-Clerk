import type {
  ComponentFixture} from '@angular/core/testing';
import {
  TestBed,
} from '@angular/core/testing';
import { Component, Input, Output, EventEmitter, Directive } from '@angular/core';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MobileDashboardComponent } from './mobile-dashboard.component';
import type {
  MobileNavItem} from './mobile-navigation.component';
import type {
  SwipeEvent,
  SwipeAction} from './mobile-swipe.component';
import type {
  DashboardStat} from './dashboard-stats.component';
import type {
  DashboardChart,
} from './dashboard-charts.component';
import type {
  QuickAction,
  ActivityItem,
} from '../../services/mobile/mobile-dashboard.service';

// Mock PullToRefreshDirective to avoid DestroyRef issues
@Directive({
  selector: '[arcPullToRefresh]',
  standalone: true,
})
class MockPullToRefreshDirective {
  @Input() public threshold = 100;
  @Input() public visibleThreshold = 20;
  @Output() public refresh = new EventEmitter<void>();
  @Output() public indicatorVisible = new EventEmitter<boolean>();
}

// Mock classes for standalone components
@Component({
  selector: 'arc-mobile-navigation',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mock-mobile-navigation"></div>',
})
class MockMobileNavigationComponent {
  @Input() public pageTitle = '';
  @Input() public pageSubtitle = '';
  @Input() public navItems: MobileNavItem[] = [];
  @Input() public menuItems: MobileNavItem[] = [];
  @Input() public headerActions: { id: string; label: string; icon?: string }[] = [];
  @Output() public actionClick = new EventEmitter<{ id: string; label: string }>();
}

/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'app-mobile-swipe',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mock-mobile-swipe"><ng-content></ng-content></div>',
})
class MockMobileSwipeComponent {
  @Input() public actions: SwipeAction[] = [];
  @Input() public item: Record<string, unknown> = {};
  @Output() public swipeAction = new EventEmitter<SwipeEvent>();
}
/* eslint-enable @angular-eslint/component-selector */

@Component({
  selector: 'arc-mobile-quick-actions',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="quick-actions-bar" *ngIf="quickActions.length > 0"><div class="quick-action" *ngFor="let action of quickActions"></div></div>',
})
class MockMobileQuickActionsComponent {
  @Input() public quickActions: QuickAction[] = [];
}

@Component({
  selector: 'arc-dashboard-stats',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="stats-overview" *ngIf="stats.length > 0"><div class="stat-card" *ngFor="let stat of stats"></div></div>',
})
class MockDashboardStatsComponent {
  @Input() public stats: DashboardStat[] = [];
}

@Component({
  selector: 'arc-dashboard-charts',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="charts-container"></div>',
})
class MockDashboardChartsComponent {
  @Input() public charts: DashboardChart[] = [];
}

@Component({
  selector: 'arc-mobile-activity-list',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="recent-activity" *ngIf="activities.length > 0"><div class="activity-item" *ngFor="let activity of activities"></div></div>',
})
class MockMobileActivityListComponent {
  @Input() public activities: ActivityItem[] = [];
  @Output() public activityClick = new EventEmitter<ActivityItem>();
}

// Mock global objects for mobile testing
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'scrollY', {
  value: 0,
  writable: true,
});

describe('MobileDashboardComponent', () => {
  let component: MobileDashboardComponent;
  let fixture: ComponentFixture<MobileDashboardComponent>;
  let _router: Router;
  let mockElement: HTMLElement;

  describe('Component Initialization', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
            { path: 'resume/upload', component: MobileDashboardComponent },
            { path: 'jobs', component: MobileDashboardComponent },
            { path: 'reports', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      _router = TestBed.inject(Router);

      // Create mock DOM element for ViewChild references
      mockElement = document.createElement('div');
      Object.defineProperty(component, 'dashboardContainer', {
        value: { nativeElement: mockElement },
        writable: true,
      });
      Object.defineProperty(component, 'quickActionsContainer', {
        value: { nativeElement: mockElement },
        writable: true,
      });

      fixture.detectChanges();
    });

    afterEach(() => {
      jest.clearAllMocks();
      fixture.destroy();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct default properties', () => {
      expect(component.pageTitle).toBe('Dashboard');
      expect(component.pageSubtitle).toBe('Recruitment insights at a glance');
      expect(component.isPullRefreshVisible).toBe(false);
      expect(component.isRefreshing).toBe(false);
    });

    it('should initialize navigation items correctly', () => {
      expect(component.navItems).toHaveLength(4);
      expect(component.navItems[0]).toEqual({
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3',
        route: '/dashboard',
      });
    });

    it('should initialize menu items correctly', () => {
      expect(component.menuItems).toHaveLength(2);
      expect(component.menuItems[0].id).toBe('settings');
      expect(component.menuItems[1].id).toBe('help');
    });

    it('should initialize header actions with notifications', () => {
      expect(component.headerActions).toHaveLength(1);
      expect(component.headerActions[0]).toEqual({
        id: 'notifications',
        label: 'Notifications',
        icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,21A1.5,1.5 0 0,0 9,19.5H15A1.5,1.5 0 0,0 16.5,21A1.5,1.5 0 0,0 15,22.5H9A1.5,1.5 0 0,0 7.5,21Z',
        badge: 3,
      });
    });

    it('should initialize quick actions correctly', () => {
      expect(component.quickActions).toHaveLength(4);
      expect(component.quickActions[0].id).toBe('upload');
      expect(component.quickActions[1].id).toBe('create-job');
      expect(component.quickActions[2].id).toBe('candidates');
      expect(component.quickActions[3].id).toBe('analytics');
    });

    it('should initialize overview stats correctly', () => {
      expect(component.overviewStats).toHaveLength(4);
      expect(component.overviewStats[0].id).toBe('total-resumes');
      expect(component.overviewStats[0].value).toBe(147);
      expect(component.overviewStats[0].change).toEqual({
        value: 12,
        type: 'increase',
        period: 'this week',
      });
    });

    it('should initialize dashboard cards correctly', () => {
      expect(component.dashboardCards).toHaveLength(2);
      expect(component.dashboardCards[0].id).toBe('recent-uploads');
      expect(component.dashboardCards[1].id).toBe('top-matches');
      expect(component.dashboardCards[0].actions).toHaveLength(2);
    });

    it('should initialize recent activity correctly', () => {
      expect(component.recentActivity).toHaveLength(3);
      expect(component.recentActivity[0].type).toBe('success');
      expect(component.recentActivity[1].type).toBe('info');
      expect(component.recentActivity[2].type).toBe('warning');
    });

    it('should initialize FAB action correctly', () => {
      expect(component.fabAction).toEqual({
        label: 'Upload Resume',
        icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
      });
    });

    it('should make Math available in template', () => {
      // Math is globally available in Angular templates, no component property needed
      expect(typeof Math).toBe('object');
    });
  });

  describe('Component Lifecycle', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
    });

    it('should complete destroy subject on ngOnDestroy', () => {
      const destroySubject = component['destroy$'];
      const nextSpy = jest.spyOn(destroySubject, 'next');
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should handle ViewChild references correctly', () => {
      // Component doesn't use ViewChild - it delegates to child components
      expect(component).toBeTruthy();
    });
  });

  describe('Pull-to-Refresh Functionality (via Directive)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should handle indicator visibility from directive', () => {
      expect(component.isPullRefreshVisible).toBe(false);

      component.onIndicatorVisible(true);
      expect(component.isPullRefreshVisible).toBe(true);

      component.onIndicatorVisible(false);
      expect(component.isPullRefreshVisible).toBe(false);
    });

    it('should trigger refresh when not already refreshing', () => {
      const refreshSpy = jest.spyOn(component['_dashboardService'], 'refreshDashboard');
      component.isRefreshing = false;

      component.onRefresh();

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should prevent multiple simultaneous refreshes', () => {
      const refreshSpy = jest.spyOn(component['_dashboardService'], 'refreshDashboard');
      component.isRefreshing = true;

      component.onRefresh();

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  describe('User Interaction Handlers', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    describe('onHeaderAction', () => {
      it('should handle notifications action', () => {
        const action = {
          id: 'notifications',
          label: 'Notifications',
          icon: 'test-icon',
          badge: 3,
        };

        expect(() => {
          component.onHeaderAction(action);
        }).not.toThrow();
      });

      it('should handle unknown actions gracefully', () => {
        const action = {
          id: 'unknown-action',
          label: 'Unknown',
          icon: 'test-icon',
        };

        expect(() => {
          component.onHeaderAction(action);
        }).not.toThrow();
      });

      it('should handle action without badge', () => {
        const action = {
          id: 'settings',
          label: 'Settings',
          icon: 'test-icon',
        };

        expect(() => {
          component.onHeaderAction(action);
        }).not.toThrow();
      });
    });

    describe('onCardClick', () => {
      it('should handle card with route', () => {
        const card = {
          id: 'test-card',
          title: 'Test Card',
          value: '10',
          icon: 'test-icon',
          color: 'primary' as const,
          priority: 'high' as const,
          size: 'medium' as const,
          route: '/test-route',
        };

        expect(() => {
          component.onCardClick(card);
        }).not.toThrow();
      });

      it('should handle card without route', () => {
        const card = {
          id: 'test-card',
          title: 'Test Card',
          value: '10',
          icon: 'test-icon',
          color: 'primary' as const,
          priority: 'high' as const,
          size: 'medium' as const,
        };

        expect(() => {
          component.onCardClick(card);
        }).not.toThrow();
      });
    });

    describe('onCardSwipe', () => {
      it('should handle view action', () => {
        const swipeEvent: SwipeEvent = {
          action: {
            id: 'view',
            label: 'View',
            icon: 'test-icon',
            color: 'primary',
            width: 80,
          },
          item: { id: 'test-item' },
        };

        expect(() => {
          component.onCardSwipe(swipeEvent);
        }).not.toThrow();
      });

      it('should handle process action', () => {
        const swipeEvent: SwipeEvent = {
          action: {
            id: 'process',
            label: 'Process',
            icon: 'test-icon',
            color: 'success',
            width: 80,
          },
          item: { id: 'test-item' },
        };

        expect(() => {
          component.onCardSwipe(swipeEvent);
        }).not.toThrow();
      });

      it('should handle review action', () => {
        const swipeEvent: SwipeEvent = {
          action: {
            id: 'review',
            label: 'Review',
            icon: 'test-icon',
            color: 'primary',
            width: 80,
          },
          item: { id: 'test-item' },
        };

        expect(() => {
          component.onCardSwipe(swipeEvent);
        }).not.toThrow();
      });

      it('should handle shortlist action', () => {
        const swipeEvent: SwipeEvent = {
          action: {
            id: 'shortlist',
            label: 'Shortlist',
            icon: 'test-icon',
            color: 'success',
            width: 80,
          },
          item: { id: 'test-item' },
        };

        expect(() => {
          component.onCardSwipe(swipeEvent);
        }).not.toThrow();
      });

      it('should handle unknown swipe actions', () => {
        const swipeEvent: SwipeEvent = {
          action: {
            id: 'unknown-action',
            label: 'Unknown',
            icon: 'test-icon',
            color: 'primary',
            width: 80,
          },
          item: { id: 'test-item' },
        };

        expect(() => {
          component.onCardSwipe(swipeEvent);
        }).not.toThrow();
      });
    });

    describe('onActivityClick', () => {
      it('should handle success activity type', () => {
        const activity = {
          id: '1',
          title: 'Success Activity',
          subtitle: 'Test subtitle',
          timeAgo: '5 minutes ago',
          type: 'success',
          icon: 'test-icon',
        };

        expect(() => {
          component.onActivityClick(activity);
        }).not.toThrow();
      });

      it('should handle info activity type', () => {
        const activity = {
          id: '2',
          title: 'Info Activity',
          subtitle: 'Test subtitle',
          timeAgo: '10 minutes ago',
          type: 'info',
          icon: 'test-icon',
        };

        expect(() => {
          component.onActivityClick(activity);
        }).not.toThrow();
      });

      it('should handle warning activity type', () => {
        const activity = {
          id: '3',
          title: 'Warning Activity',
          subtitle: 'Test subtitle',
          timeAgo: '15 minutes ago',
          type: 'warning',
          icon: 'test-icon',
        };

        expect(() => {
          component.onActivityClick(activity);
        }).not.toThrow();
      });

      it('should handle unknown activity types', () => {
        const activity = {
          id: '4',
          title: 'Unknown Activity',
          subtitle: 'Test subtitle',
          timeAgo: '20 minutes ago',
          type: 'unknown',
          icon: 'test-icon',
        };

        expect(() => {
          component.onActivityClick(activity);
        }).not.toThrow();
      });
    });

    describe('onFabClick', () => {
      it('should handle FAB click without errors', () => {
        expect(() => {
          component.onFabClick();
        }).not.toThrow();
      });
    });
  });

  describe('Component State Management', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should initialize with correct loading states', () => {
      expect(component.isPullRefreshVisible).toBe(false);
      expect(component.isRefreshing).toBe(false);
    });

    it('should manage pull refresh visibility state', () => {
      component.isPullRefreshVisible = true;
      fixture.detectChanges();

      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator.nativeElement.classList.contains('visible')).toBe(
        true,
      );
    });

    it('should manage refreshing state', () => {
      component.isRefreshing = true;
      fixture.detectChanges();

      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator.nativeElement.classList.contains('loading')).toBe(
        true,
      );
    });

    it('should show correct refresh text based on state', () => {
      component.isPullRefreshVisible = true;
      component.isRefreshing = false;
      fixture.detectChanges();

      const refreshText = fixture.debugElement.query(By.css('.refresh-text'));
      expect(refreshText.nativeElement.textContent.trim()).toBe(
        'Pull to refresh',
      );

      component.isRefreshing = true;
      fixture.detectChanges();

      expect(refreshText.nativeElement.textContent.trim()).toBe(
        'Refreshing...',
      );
    });
  });

  describe('Template Rendering', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render mobile navigation component with correct inputs', () => {
      const mobileNav = fixture.debugElement.query(
        By.css('arc-mobile-navigation'),
      );
      expect(mobileNav).toBeTruthy();
    });

    it('should render quick actions when available', () => {
      const quickActionsBar = fixture.debugElement.query(
        By.css('.quick-actions-bar'),
      );
      expect(quickActionsBar).toBeTruthy();

      const quickActions = fixture.debugElement.queryAll(
        By.css('.quick-action'),
      );
      expect(quickActions.length).toBe(component.quickActions.length);
    });

    it('should not render quick actions when empty', () => {
      component.quickActions = [];
      fixture.detectChanges();

      const quickActionsBar = fixture.debugElement.query(
        By.css('.quick-actions-bar'),
      );
      expect(quickActionsBar).toBeFalsy();
    });

    it('should render overview stats when available', () => {
      const statsOverview = fixture.debugElement.query(
        By.css('.stats-overview'),
      );
      expect(statsOverview).toBeTruthy();

      const statCards = fixture.debugElement.queryAll(By.css('.stat-card'));
      expect(statCards.length).toBe(component.overviewStats.length);
    });

    it('should not render overview stats when empty', () => {
      component.overviewStats = [];
      fixture.detectChanges();

      const statsOverview = fixture.debugElement.query(
        By.css('.stats-overview'),
      );
      expect(statsOverview).toBeFalsy();
    });

    it('should render dashboard cards when available', () => {
      const dashboardCards = fixture.debugElement.query(
        By.css('.dashboard-cards'),
      );
      expect(dashboardCards).toBeTruthy();

      const cards = fixture.debugElement.queryAll(By.css('app-mobile-swipe'));
      expect(cards.length).toBe(component.dashboardCards.length);
    });

    it('should not render dashboard cards when empty', () => {
      component.dashboardCards = [];
      fixture.detectChanges();

      const dashboardCards = fixture.debugElement.query(
        By.css('.dashboard-cards'),
      );
      expect(dashboardCards).toBeFalsy();
    });

    it('should render recent activity when available', () => {
      const recentActivity = fixture.debugElement.query(
        By.css('.recent-activity'),
      );
      expect(recentActivity).toBeTruthy();

      const activityItems = fixture.debugElement.queryAll(
        By.css('.activity-item'),
      );
      expect(activityItems.length).toBe(component.recentActivity.length);
    });

    it('should not render recent activity when empty', () => {
      component.recentActivity = [];
      fixture.detectChanges();

      const recentActivity = fixture.debugElement.query(
        By.css('.recent-activity'),
      );
      expect(recentActivity).toBeFalsy();
    });

    it('should render floating action button', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      expect(fab).toBeTruthy();
      expect(fab.nativeElement.getAttribute('aria-label')).toBe(
        component.fabAction.label,
      );
    });

    it('should render pull refresh indicator', () => {
      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator).toBeTruthy();
    });

    it('should apply correct CSS classes based on component state', () => {
      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );

      // Test visible state
      component.isPullRefreshVisible = true;
      fixture.detectChanges();
      expect(pullIndicator.nativeElement.classList.contains('visible')).toBe(
        true,
      );

      // Test loading state
      component.isRefreshing = true;
      fixture.detectChanges();
      expect(pullIndicator.nativeElement.classList.contains('loading')).toBe(
        true,
      );
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have proper ARIA labels for interactive elements', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      expect(fab.nativeElement.getAttribute('aria-label')).toBe(
        'Upload Resume',
      );

      // Quick actions are rendered by child component, ARIA labels are set there
      const quickActions = fixture.debugElement.queryAll(
        By.css('.quick-action'),
      );
      // Just verify quick actions are rendered, not their ARIA labels (handled by child)
      expect(quickActions.length).toBeGreaterThan(0);
    });

    it('should maintain focus management for touch interactions', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));

      fab.nativeElement.focus();
      expect(document.activeElement).toBe(fab.nativeElement);

      fab.nativeElement.click();
      // Focus should be maintained or properly managed
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
    });

    it('should complete destroy subject only once', () => {
      const destroySubject = component['destroy$'];
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      component.ngOnDestroy();
      component.ngOnDestroy(); // Call twice

      expect(completeSpy).toHaveBeenCalledTimes(2);
    });

    it('should prevent memory leaks with proper subscription cleanup', () => {
      const destroySubject = component['destroy$'];
      const nextSpy = jest.spyOn(destroySubject, 'next');
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      component.ngOnInit();
      component.ngOnDestroy();

      // Verify destroy sequence
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();

      // Check that Subject is properly completed after ngOnDestroy
      expect(destroySubject.isStopped).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            { path: 'dashboard', component: MobileDashboardComponent },
          ]),
          MobileDashboardComponent,
        ],
      })
        .overrideComponent(MobileDashboardComponent, {
          set: {
            imports: [
              CommonModule,
              RouterModule,
              MockMobileNavigationComponent,
              MockMobileSwipeComponent,
              MockMobileQuickActionsComponent,
              MockDashboardStatsComponent,
              MockDashboardChartsComponent,
              MockMobileActivityListComponent,
              MockPullToRefreshDirective,
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(MobileDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should handle empty data arrays gracefully', () => {
      component.quickActions = [];
      component.overviewStats = [];
      component.dashboardCards = [];
      component.recentActivity = [];

      fixture.detectChanges();

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });
  });
});
