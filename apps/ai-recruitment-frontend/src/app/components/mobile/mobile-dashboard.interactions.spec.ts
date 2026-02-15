import type {
  ComponentFixture,
} from '@angular/core/testing';
import {
  TestBed,
} from '@angular/core/testing';

import type {
  SwipeEvent,
} from './mobile-swipe.component';
import type {
  ActivityItem,
} from '../../services/mobile/mobile-dashboard.service';
import { MobileDashboardComponent } from './mobile-dashboard.component';
import {
  mockImports,
} from './test-helper';

describe('MobileDashboardComponent - User Interactions', () => {
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
    const createSwipeEvent = (id: string): SwipeEvent => ({
      action: {
        id,
        label: 'Test Action',
        icon: 'test-icon',
        color: 'primary',
        width: 80,
      },
      item: { id: 'test-item' },
    });

    it('should handle view action', () => {
      expect(() => {
        component.onCardSwipe(createSwipeEvent('view'));
      }).not.toThrow();
    });

    it('should handle process action', () => {
      expect(() => {
        component.onCardSwipe(createSwipeEvent('process'));
      }).not.toThrow();
    });

    it('should handle review action', () => {
      expect(() => {
        component.onCardSwipe(createSwipeEvent('review'));
      }).not.toThrow();
    });

    it('should handle shortlist action', () => {
      expect(() => {
        component.onCardSwipe(createSwipeEvent('shortlist'));
      }).not.toThrow();
    });

    it('should handle unknown swipe actions', () => {
      expect(() => {
        component.onCardSwipe(createSwipeEvent('unknown-action'));
      }).not.toThrow();
    });
  });

  describe('onActivityClick', () => {
    const createActivity = (type: string): ActivityItem => ({
      id: Math.random().toString(),
      title: 'Test Activity',
      subtitle: 'Test subtitle',
      timeAgo: '5 minutes ago',
      type: type as never,
      icon: 'test-icon',
    });

    it('should handle success activity type', () => {
      expect(() => {
        component.onActivityClick(createActivity('success'));
      }).not.toThrow();
    });

    it('should handle info activity type', () => {
      expect(() => {
        component.onActivityClick(createActivity('info'));
      }).not.toThrow();
    });

    it('should handle warning activity type', () => {
      expect(() => {
        component.onActivityClick(createActivity('warning'));
      }).not.toThrow();
    });

    it('should handle unknown activity types', () => {
      expect(() => {
        component.onActivityClick(createActivity('unknown'));
      }).not.toThrow();
    });
  });

  describe('onFabClick', () => {
    it('should handle FAB click without errors', () => {
      expect(() => {
        component.onFabClick();
      }).not.toThrow();
    });

    it('should have FAB action configured', () => {
      expect(component.fabAction).toBeDefined();
      expect(component.fabAction.label).toBeTruthy();
      expect(component.fabAction.icon).toBeTruthy();
    });
  });

  describe('Pull-to-Refresh', () => {
    it('should handle indicator visibility from directive', () => {
      expect(component.isPullRefreshVisible).toBe(false);

      component.onIndicatorVisible(true);
      expect(component.isPullRefreshVisible).toBe(true);

      component.onIndicatorVisible(false);
      expect(component.isPullRefreshVisible).toBe(false);
    });

    it('should trigger refresh when not already refreshing', () => {
      const refreshSpy = jest.spyOn(
        component['_dashboardService'],
        'refreshDashboard',
      );
      component.isRefreshing = false;

      component.onRefresh();

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should prevent multiple simultaneous refreshes', () => {
      const refreshSpy = jest.spyOn(
        component['_dashboardService'],
        'refreshDashboard',
      );
      component.isRefreshing = true;

      component.onRefresh();

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  describe('Quick Actions', () => {
    it('should have quick actions configured', () => {
      expect(component.quickActions).toBeDefined();
      expect(component.quickActions.length).toBeGreaterThan(0);
    });

    it('should have expected quick action IDs', () => {
      const actionIds = component.quickActions.map((a) => a.id);
      const expectedIds = ['upload', 'create-job', 'candidates', 'analytics'];

      expect(actionIds).toEqual(expect.arrayContaining(expectedIds));
    });
  });

  describe('State Updates', () => {
    it('should update isPullRefreshVisible state', () => {
      expect(component.isPullRefreshVisible).toBe(false);

      component.onIndicatorVisible(true);
      expect(component.isPullRefreshVisible).toBe(true);
    });

    it('should maintain isRefreshing state from service', () => {
      // isRefreshing is set by service subscription
      expect(typeof component.isRefreshing).toBe('boolean');
    });
  });
});
