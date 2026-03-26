import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
  ErrorBoundaryComponent,
  type ErrorInfo,
} from './error-boundary.component';
import { ToastService } from '../../../services/toast.service';

describe('ErrorBoundaryComponent', () => {
  let component: ErrorBoundaryComponent;
  let fixture: ComponentFixture<ErrorBoundaryComponent>;
  let router: jest.Mocked<Router>;
  let toastService: jest.Mocked<ToastService>;

  beforeEach(async () => {
    const mockRouter = {
      events: new Subject(),
      navigate: jest.fn(),
    };

    const mockToastService = {
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ErrorBoundaryComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router) as jest.Mocked<Router>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;

    fixture = TestBed.createComponent(ErrorBoundaryComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.clear();
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render ng-content when no error', () => {
      component.hasError.set(false);
      fixture.detectChanges();

      const content = fixture.nativeElement.querySelector('ng-content');
      expect(component.hasError()).toBe(false);
    });

    it('should render error display when has error', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        timestamp: new Date(),
      };
      component.displayError(errorInfo);
      fixture.detectChanges();

      expect(component.hasError()).toBe(true);
    });
  });

  describe('Error State Tests', () => {
    it('should set hasError to true when displayError is called', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        timestamp: new Date(),
      };

      component.displayError(errorInfo);

      expect(component.hasError()).toBe(true);
      expect(component.errorMessage()).toBe('Test error');
    });

    it('should set error details correctly', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        stack: 'Error stack trace',
        timestamp: new Date('2024-01-01'),
        url: '/test-url',
        componentName: 'TestComponent',
      };

      component.displayError(errorInfo);

      expect(component.errorStack()).toBe('Error stack trace');
      expect(component.errorUrl()).toBe('/test-url');
      expect(component.componentName()).toBe('TestComponent');
    });

    it('should reset error state when resetError is called', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        timestamp: new Date(),
      };
      component.displayError(errorInfo);

      component.resetError();

      expect(component.hasError()).toBe(false);
      expect(component.showDetails()).toBe(false);
    });

    it('should update errorDisplayData signal when error is displayed', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        stack: 'Stack trace',
        timestamp: new Date('2024-01-01'),
        url: '/test',
        componentName: 'TestComponent',
        correlationId: 'abc123',
        severity: 'high',
        category: 'runtime',
        recoverable: true,
      };

      component.displayError(errorInfo);

      const displayData = component.errorDisplayData();
      expect(displayData.message).toBe('Test error');
      expect(displayData.stack).toBe('Stack trace');
      expect(displayData.url).toBe('/test');
      expect(displayData.componentName).toBe('TestComponent');
      expect(displayData.correlationId).toBe('abc123');
      expect(displayData.severity).toBe('high');
      expect(displayData.category).toBe('runtime');
      expect(displayData.recoverable).toBe(true);
    });
  });

  describe('Action Tests', () => {
    it('should call window.location.reload when reload is called', () => {
      const reloadSpy = jest
        .spyOn(window.location, 'reload')
        .mockImplementation(() => {
  // Intentionally empty
});

      component.reload();

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should navigate to home when goHome is called', () => {
      component.goHome();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(component.hasError()).toBe(false);
    });

    it('should toggle showDetails when toggleDetails is called', () => {
      expect(component.showDetails()).toBe(false);

      component.toggleDetails();
      expect(component.showDetails()).toBe(true);

      component.toggleDetails();
      expect(component.showDetails()).toBe(false);
    });

    it('should clear error history', () => {
      sessionStorage.setItem(
        'app-errors',
        JSON.stringify([{ message: 'Old error', timestamp: new Date() }]),
      );
      component.errorHistory.set([
        { message: 'Old error', timestamp: new Date() },
      ]);

      component.clearHistory();

      expect(sessionStorage.getItem('app-errors')).toBeNull();
      expect(component.errorHistory()).toEqual([]);
      expect(toastService.info).toHaveBeenCalledWith('错误历史已清除');
    });
  });

  describe('Service Integration Tests', () => {
    it('should load error history from session storage on init', () => {
      const errorHistory: ErrorInfo[] = [
        {
          message: 'Previous error',
          timestamp: new Date('2024-01-01'),
        },
      ];
      sessionStorage.setItem('app-errors', JSON.stringify(errorHistory));

      component.ngOnInit();

      expect(component.errorHistory()).toHaveLength(1);
      expect(component.errorHistory()[0].message).toBe('Previous error');
    });

    it('should display latest error from history on init', () => {
      const errorHistory: ErrorInfo[] = [
        {
          message: 'First error',
          timestamp: new Date('2024-01-01'),
        },
        {
          message: 'Latest error',
          timestamp: new Date('2024-01-02'),
        },
      ];
      sessionStorage.setItem('app-errors', JSON.stringify(errorHistory));

      component.ngOnInit();

      expect(component.hasError()).toBe(true);
      expect(component.errorMessage()).toBe('Latest error');
    });

    it('should handle invalid session storage data', () => {
      sessionStorage.setItem('app-errors', 'invalid json');

      component.ngOnInit();

      expect(component.errorHistory()).toEqual([]);
      expect(sessionStorage.getItem('app-errors')).toBeNull();
    });

    it('should reset error on navigation end', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        timestamp: new Date(),
      };
      component.displayError(errorInfo);

      (router.events as Subject<unknown>).next({
        constructor: { name: 'NavigationEnd' },
      });

      expect(component.hasError()).toBe(false);
    });
  });

  describe('Development Mode Tests', () => {
    it('should return true for localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true,
      });

      expect(component.isDevelopment()).toBe(true);
    });

    it('should return true for 127.0.0.1', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '127.0.0.1' },
        writable: true,
      });

      expect(component.isDevelopment()).toBe(true);
    });

    it('should return true for local network IP', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '192.168.1.1' },
        writable: true,
      });

      expect(component.isDevelopment()).toBe(true);
    });

    it('should return false for production domain', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com' },
        writable: true,
      });

      expect(component.isDevelopment()).toBe(false);
    });
  });

  describe('Lifecycle Tests', () => {
    it('should complete destroy$ on destroy', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
