import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  ErrorDisplayComponent,
  type ErrorDisplayData,
} from './error-display.component';

describe('ErrorDisplayComponent', () => {
  let component: ErrorDisplayComponent;
  let fixture: ComponentFixture<ErrorDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorDisplayComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render error boundary container', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test error',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.error-boundary-container',
      );
      expect(container).toBeTruthy();
    });

    it('should render error content', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test error',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const content = fixture.nativeElement.querySelector('.error-content');
      expect(content).toBeTruthy();
    });

    it('should render error icon', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test error',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.error-icon');
      expect(icon).toBeTruthy();
    });

    it('should render error title', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test error',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.error-title');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBe('哎呀，出错了！');
    });

    it('should render error message', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Something went wrong',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.error-message');
      expect(message).toBeTruthy();
      expect(message.textContent.trim()).toBe('Something went wrong');
    });
  });

  describe('Input Tests', () => {
    it('should bind errorData input correctly', () => {
      const errorData: ErrorDisplayData = {
        message: 'Test error',
        timestamp: new Date('2024-01-01'),
        url: '/test-url',
        componentName: 'TestComponent',
      };
      fixture.componentRef.setInput('errorData', errorData);
      fixture.detectChanges();

      expect(component.errorData()).toEqual(errorData);
    });

    it('should bind showDetails input correctly', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.detectChanges();

      expect(component.showDetails()).toBe(true);
    });

    it('should bind errorHistory input correctly', () => {
      const history: ErrorDisplayData[] = [
        { message: 'Error 1', timestamp: new Date() },
        { message: 'Error 2', timestamp: new Date() },
      ];
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('errorHistory', history);
      fixture.detectChanges();

      expect(component.errorHistory()).toEqual(history);
    });

    it('should bind isDevMode input correctly', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('isDevMode', true);
      fixture.detectChanges();

      expect(component.isDevMode()).toBe(true);
    });
  });

  describe('Error Details Tests', () => {
    it('should render error details when showDetails is true', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test error',
        timestamp: new Date('2024-01-01'),
        url: '/test',
        componentName: 'TestComponent',
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details).toBeTruthy();
    });

    it('should not render error details when showDetails is false', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test error',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('showDetails', false);
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details).toBeFalsy();
    });

    it('should render timestamp in details', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date('2024-01-15T10:30:00'),
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details.textContent).toContain('时间');
    });

    it('should render component name when provided', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
        componentName: 'TestComponent',
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details.textContent).toContain('组件');
      expect(details.textContent).toContain('TestComponent');
    });

    it('should render URL in details', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
        url: '/test-path',
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details.textContent).toContain('URL');
      expect(details.textContent).toContain('/test-path');
    });
  });

  describe('Stack Trace Tests', () => {
    it('should render stack trace in dev mode', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
        stack: 'Error: Test\n  at line 1\n  at line 2',
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.componentRef.setInput('isDevMode', true);
      fixture.detectChanges();

      const stack = fixture.nativeElement.querySelector('.error-stack');
      expect(stack).toBeTruthy();
    });

    it('should not render stack trace when not in dev mode', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
        stack: 'Error: Test',
      });
      fixture.componentRef.setInput('showDetails', true);
      fixture.componentRef.setInput('isDevMode', false);
      fixture.detectChanges();

      const stack = fixture.nativeElement.querySelector('.error-stack');
      expect(stack).toBeFalsy();
    });
  });

  describe('Event Trigger Tests', () => {
    it('should emit reload event when reload button clicked', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.reload, 'emit');
      const reloadBtn = fixture.nativeElement.querySelector('.btn-primary');
      reloadBtn.click();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit goHome event when home button clicked', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.goHome, 'emit');
      const homeBtn = fixture.nativeElement.querySelector('.btn-secondary');
      homeBtn.click();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit toggleDetails event when toggle button clicked', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Test',
        timestamp: new Date(),
      });
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.toggleDetails, 'emit');
      const toggleBtn = fixture.nativeElement.querySelector('.btn-link');
      toggleBtn.click();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Error History Tests', () => {
    it('should render error history when multiple errors', () => {
      const history: ErrorDisplayData[] = [
        { message: 'Error 1', timestamp: new Date('2024-01-01') },
        { message: 'Error 2', timestamp: new Date('2024-01-02') },
      ];
      fixture.componentRef.setInput('errorData', {
        message: 'Current Error',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('errorHistory', history);
      fixture.detectChanges();

      const historySection =
        fixture.nativeElement.querySelector('.error-history');
      expect(historySection).toBeTruthy();
    });

    it('should not render error history when only one error', () => {
      fixture.componentRef.setInput('errorData', {
        message: 'Error',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('errorHistory', [
        { message: 'Error', timestamp: new Date() },
      ]);
      fixture.detectChanges();

      const historySection =
        fixture.nativeElement.querySelector('.error-history');
      expect(historySection).toBeFalsy();
    });

    it('should list all errors in history', () => {
      const history: ErrorDisplayData[] = [
        { message: 'First Error', timestamp: new Date('2024-01-01') },
        { message: 'Second Error', timestamp: new Date('2024-01-02') },
      ];
      fixture.componentRef.setInput('errorData', {
        message: 'Current Error',
        timestamp: new Date(),
      });
      fixture.componentRef.setInput('errorHistory', history);
      fixture.detectChanges();

      const historyItems =
        fixture.nativeElement.querySelectorAll('.error-history li');
      expect(historyItems.length).toBe(2);
    });
  });

  describe('Development Mode Tests', () => {
    it('should return true for isDevelopment when isDevMode is true', () => {
      fixture.componentRef.setInput('isDevMode', true);

      expect(component.isDevelopment()).toBe(true);
    });

    it('should return false for isDevelopment when isDevMode is false', () => {
      fixture.componentRef.setInput('isDevMode', false);

      expect(component.isDevelopment()).toBe(false);
    });
  });
});
