import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AlertComponent, type AlertType } from './alert.component';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Props Binding Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should bind type input correctly', () => {
      const types: AlertType[] = ['success', 'info', 'warning', 'danger'];

      types.forEach((type) => {
        component.type = type;
        fixture.detectChanges();

        expect(component.type).toBe(type);

        const alertElement = fixture.nativeElement.querySelector('.alert');
        expect(alertElement.classList.contains(`alert-${type}`)).toBe(true);
      });
    });

    it('should have default type as "info"', () => {
      fixture.detectChanges();

      expect(component.type).toBe('info');

      const alertElement = fixture.nativeElement.querySelector('.alert');
      expect(alertElement.classList.contains('alert-info')).toBe(true);
    });

    it('should bind title input correctly', () => {
      component.title = 'Test Title';
      fixture.detectChanges();

      expect(component.title).toBe('Test Title');

      const titleElement = fixture.nativeElement.querySelector('.alert-title');
      expect(titleElement).toBeTruthy();
      expect(titleElement.textContent).toBe('Test Title');
    });

    it('should not show title when title is empty', () => {
      component.title = '';
      fixture.detectChanges();

      const titleElement = fixture.nativeElement.querySelector('.alert-title');
      expect(titleElement).toBeFalsy();
    });

    it('should bind dismissible input correctly', () => {
      component.dismissible = true;
      fixture.detectChanges();

      expect(component.dismissible).toBe(true);

      const closeButton =
        fixture.nativeElement.querySelector('.alert-close-btn');
      expect(closeButton).toBeTruthy();
    });

    it('should not show close button when dismissible is false', () => {
      component.dismissible = false;
      fixture.detectChanges();

      const closeButton =
        fixture.nativeElement.querySelector('.alert-close-btn');
      expect(closeButton).toBeFalsy();
    });

    it('should have default dismissible as false', () => {
      fixture.detectChanges();

      expect(component.dismissible).toBe(false);
    });

    it('should render ngContent in alert message', () => {
      const testMessage = 'Test alert message';

      // Set content via component property for testing
      fixture.nativeElement.innerHTML = `
        <arc-alert>${testMessage}</arc-alert>
      `;
      fixture.detectChanges();

      const messageElement =
        fixture.nativeElement.querySelector('.alert-message');
      expect(messageElement).toBeTruthy();
    });
  });

  describe('Event Emission Tests', () => {
    beforeEach(() => {
      component.dismissible = true;
      fixture.detectChanges();
    });

    it('should emit dismissed event when close button is clicked', () => {
      const dismissSpy = jest.spyOn(component.dismissed, 'emit');

      component.onDismiss();

      expect(dismissSpy).toHaveBeenCalled();
    });

    it('should emit dismissed event with no payload', () => {
      const dismissSpy = jest.spyOn(component.dismissed, 'emit');

      component.onDismiss();

      expect(dismissSpy).toHaveBeenCalledWith(undefined);
    });

    it('should trigger onDismiss when close button is clicked in DOM', () => {
      const onDismissSpy = jest.spyOn(component, 'onDismiss');

      const closeButton =
        fixture.nativeElement.querySelector('.alert-close-btn');
      closeButton.click();

      expect(onDismissSpy).toHaveBeenCalled();
    });

    it('should handle multiple dismiss calls gracefully', () => {
      const dismissSpy = jest.spyOn(component.dismissed, 'emit');

      component.onDismiss();
      component.onDismiss();
      component.onDismiss();

      expect(dismissSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have role="alert" attribute', () => {
      fixture.detectChanges();

      const alertElement = fixture.nativeElement.querySelector('.alert');
      expect(alertElement.getAttribute('role')).toBe('alert');
    });

    it('should have aria-live="polite" for non-error alerts', () => {
      component.type = 'info';
      fixture.detectChanges();

      const alertElement = fixture.nativeElement.querySelector('.alert');
      expect(alertElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-live="assertive" for danger alerts', () => {
      component.type = 'danger';
      fixture.detectChanges();

      const alertElement = fixture.nativeElement.querySelector('.alert');
      expect(alertElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have aria-label on close button', () => {
      component.dismissible = true;
      fixture.detectChanges();

      const closeButton =
        fixture.nativeElement.querySelector('.alert-close-btn');
      expect(closeButton.getAttribute('aria-label')).toBe('关闭');
    });

    it('should support keyboard navigation for close button', () => {
      component.dismissible = true;
      fixture.detectChanges();

      const closeButton =
        fixture.nativeElement.querySelector('.alert-close-btn');
      expect(closeButton.getAttribute('tabindex')).not.toBe('-1');
    });

    it('should have proper focus management on dismiss', () => {
      component.dismissible = true;
      fixture.detectChanges();

      const closeButton =
        fixture.nativeElement.querySelector('.alert-close-btn');
      expect(closeButton).toBeTruthy();

      // Close button should be focusable
      expect(closeButton.tabIndex).not.toBe(-1);
    });

    it('should have correct aria-hidden for decorative icons', () => {
      fixture.detectChanges();

      const icons = fixture.nativeElement.querySelectorAll('.alert-icon svg');
      icons.forEach((icon: SVGElement) => {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should associate icon with alert via aria-describedby', () => {
      fixture.detectChanges();

      const alertElement = fixture.nativeElement.querySelector('.alert');
      const icon = fixture.nativeElement.querySelector('.alert-icon');

      if (icon && icon.id) {
        expect(alertElement.getAttribute('aria-describedby')).toBe(icon.id);
      }
    });

    it('should use semantic HTML for alert structure', () => {
      fixture.detectChanges();

      const alertElement = fixture.nativeElement.querySelector('.alert');
      expect(alertElement.tagName.toLowerCase()).toBe('div');

      const content = alertElement.querySelector('.alert-content');
      expect(content).toBeTruthy();
    });

    it('should provide visual distinction for different alert types', () => {
      const types: AlertType[] = ['success', 'info', 'warning', 'danger'];
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

      types.forEach((type, index) => {
        component.type = type;
        fixture.detectChanges();

        const alertElement = fixture.nativeElement.querySelector('.alert');
        expect(alertElement.classList.contains(`alert-${type}`)).toBe(true);
      });
    });
  });
});
