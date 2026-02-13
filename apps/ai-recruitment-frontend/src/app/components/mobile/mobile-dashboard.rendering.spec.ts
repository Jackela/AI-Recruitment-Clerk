import type {
  ComponentFixture,
} from '@angular/core/testing';
import {
  TestBed,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { MobileDashboardComponent } from './mobile-dashboard.component';
import {
  mockImports,
} from './test-helper';

describe('MobileDashboardComponent - Template Rendering', () => {
  let component: MobileDashboardComponent;
  let fixture: ComponentFixture<MobileDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: mockImports,
    })
      .overrideComponent(MobileDashboardComponent, {
        set: {
          imports: mockImports,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MobileDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    fixture.destroy();
  });

  describe('Component Structure', () => {
    it('should render mobile navigation component', () => {
      const mobileNav = fixture.debugElement.query(
        By.css('arc-mobile-navigation'),
      );
      expect(mobileNav).toBeTruthy();
    });

    it('should render pull refresh indicator', () => {
      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator).toBeTruthy();
    });

    it('should render floating action button', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      expect(fab).toBeTruthy();
      expect(fab.nativeElement.getAttribute('aria-label')).toBe(
        component.fabAction.label,
      );
    });

    it('should render dashboard content wrapper', () => {
      const content = fixture.debugElement.query(
        By.css('.mobile-dashboard-content'),
      );
      expect(content).toBeTruthy();
    });
  });

  describe('Quick Actions Rendering', () => {
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
  });

  describe('Stats Overview Rendering', () => {
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
  });

  describe('Dashboard Cards Rendering', () => {
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

    it('should render section title when cards exist', () => {
      component.dashboardCards = [
        {
          id: 'test',
          title: 'Test',
          value: '10',
          icon: 'test',
          color: 'primary',
          priority: 'high',
          size: 'medium',
        },
      ];
      fixture.detectChanges();

      const sectionTitle = fixture.debugElement.query(By.css('.section-title'));
      expect(sectionTitle).toBeTruthy();
      expect(sectionTitle.nativeElement.textContent).toContain('Dashboard');
    });
  });

  describe('Recent Activity Rendering', () => {
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
  });

  describe('Pull Refresh Indicator', () => {
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

    it('should render refresh spinner', () => {
      const spinner = fixture.debugElement.query(By.css('.refresh-spinner'));
      expect(spinner).toBeTruthy();
    });
  });

  describe('Floating Action Button', () => {
    it('should have proper ARIA label', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      expect(fab.nativeElement.getAttribute('aria-label')).toBe(
        'Upload Resume',
      );
    });

    it('should have correct icon path bound', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      const iconPath = fab.nativeElement.querySelector('path');

      expect(iconPath).toBeTruthy();
      expect(iconPath.getAttribute('d')).toBe(component.fabAction.icon);
    });
  });

  describe('Empty State Handling', () => {
    it('should handle all empty data arrays gracefully', () => {
      component.quickActions = [];
      component.overviewStats = [];
      component.dashboardCards = [];
      component.recentActivity = [];

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should render without errors when all sections are empty', () => {
      component.quickActions = [];
      component.overviewStats = [];
      component.dashboardCards = [];
      component.recentActivity = [];
      fixture.detectChanges();

      const content = fixture.debugElement.query(
        By.css('.mobile-dashboard-content'),
      );
      expect(content).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      expect(fab.nativeElement.getAttribute('aria-label')).toBe(
        'Upload Resume',
      );
    });

    it('should maintain focus management for touch interactions', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));

      fab.nativeElement.focus();
      expect(document.activeElement).toBe(fab.nativeElement);

      fab.nativeElement.click();
      expect(document.activeElement).toBeDefined();
    });

    it('should have proper ARIA label for FAB', () => {
      const fab = fixture.debugElement.query(By.css('.mobile-fab'));
      const ariaLabel = fab.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toBe(component.fabAction.label);
    });
  });

  describe('CSS Class Bindings', () => {
    it('should apply visible class to pull indicator when visible', () => {
      component.isPullRefreshVisible = true;
      fixture.detectChanges();

      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator.nativeElement.classList.contains('visible')).toBe(true);
    });

    it('should apply loading class to pull indicator when refreshing', () => {
      component.isRefreshing = true;
      fixture.detectChanges();

      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator.nativeElement.classList.contains('loading')).toBe(true);
    });

    it('should not apply visible class when indicator is not visible', () => {
      component.isPullRefreshVisible = false;
      fixture.detectChanges();

      const pullIndicator = fixture.debugElement.query(
        By.css('.pull-refresh-indicator'),
      );
      expect(pullIndicator.nativeElement.classList.contains('visible')).toBe(false);
    });
  });
});
