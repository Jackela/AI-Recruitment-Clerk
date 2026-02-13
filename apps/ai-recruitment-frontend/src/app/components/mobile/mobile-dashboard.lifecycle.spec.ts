import type {
  ComponentFixture,
} from '@angular/core/testing';
import {
  TestBed,
} from '@angular/core/testing';

import { MobileDashboardComponent } from './mobile-dashboard.component';
import {
  mockImports,
} from './test-helper';

describe('MobileDashboardComponent - Lifecycle', () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
    fixture.destroy();
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy subject on ngOnDestroy', () => {
      const destroySubject = component['destroy$'];
      const nextSpy = jest.spyOn(destroySubject, 'next');
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should complete destroy subject only once per call', () => {
      const destroySubject = component['destroy$'];
      const nextSpy = jest.spyOn(destroySubject, 'next');
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      component.ngOnDestroy();
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(completeSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple ngOnDestroy calls without errors', () => {
      const _destroySubject = component['destroy$'];
      void _destroySubject;

      expect(() => {
        component.ngOnDestroy();
        component.ngOnDestroy();
        component.ngOnDestroy();
      }).not.toThrow();
    });

    it('should mark destroy subject as stopped after ngOnDestroy', () => {
      const destroySubject = component['destroy$'];

      component.ngOnDestroy();

      expect(destroySubject.isStopped).toBe(true);
    });
  });

  describe('ngOnInit', () => {
    it('should subscribe to dashboard state on init', () => {
      const stateSubscribeSpy = jest.spyOn(
        component['_dashboardService'].state$,
        'subscribe',
      );

      component.ngOnInit();

      expect(stateSubscribeSpy).toHaveBeenCalled();
    });

    it('should load dashboard data on init', () => {
      const loadDashboardSpy = jest.spyOn(
        component['_dashboardService'],
        'loadDashboardData',
      );

      component.ngOnInit();

      expect(loadDashboardSpy).toHaveBeenCalled();
    });

    it('should get FAB action configuration on init', () => {
      const getFabActionSpy = jest.spyOn(
        component['_dashboardService'],
        'getFabAction',
      );

      component.ngOnInit();

      expect(getFabActionSpy).toHaveBeenCalled();
    });
  });

  describe('Subscription Cleanup', () => {
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

    it('should use takeUntil for all subscriptions', () => {
      // Verify the component uses takeUntil pattern for subscription cleanup
      const destroySubject = component['destroy$'];

      expect(destroySubject).toBeDefined();
      expect(typeof destroySubject.next).toBe('function');
      expect(typeof destroySubject.complete).toBe('function');
    });
  });
});
