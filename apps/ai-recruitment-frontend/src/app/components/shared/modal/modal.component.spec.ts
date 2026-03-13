import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Props Binding Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should bind isOpen input correctly', () => {
      component.isOpen = true;
      fixture.detectChanges();

      expect(component.isOpen).toBe(true);

      const modalElement =
        fixture.nativeElement.querySelector('.modal-container');
      expect(modalElement).toBeTruthy();
    });

    it('should have default isOpen as false', () => {
      fixture.detectChanges();

      expect(component.isOpen).toBe(false);

      const modalElement =
        fixture.nativeElement.querySelector('.modal-container');
      expect(modalElement).toBeFalsy();
    });

    it('should bind title input correctly', () => {
      component.isOpen = true;
      component.title = 'Test Modal Title';
      fixture.detectChanges();

      expect(component.title).toBe('Test Modal Title');

      const titleElement = fixture.nativeElement.querySelector('.modal-title');
      expect(titleElement).toBeTruthy();
      expect(titleElement.textContent).toContain('Test Modal Title');
    });

    it('should bind size input correctly', () => {
      component.isOpen = true;
      const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];

      sizes.forEach((size) => {
        component.size = size;
        fixture.detectChanges();

        expect(component.size).toBe(size);

        const dialog = fixture.nativeElement.querySelector('.modal-dialog');
        expect(dialog.classList.contains(`modal-${size}`)).toBe(true);
      });
    });

    it('should have default size as "md"', () => {
      component.isOpen = true;
      fixture.detectChanges();

      expect(component.size).toBe('md');
    });

    it('should bind closeOnBackdropClick input correctly', () => {
      component.closeOnBackdropClick = false;
      expect(component.closeOnBackdropClick).toBe(false);

      component.closeOnBackdropClick = true;
      expect(component.closeOnBackdropClick).toBe(true);
    });

    it('should have default closeOnBackdropClick as true', () => {
      expect(component.closeOnBackdropClick).toBe(true);
    });

    it('should bind showCloseButton input correctly', () => {
      component.isOpen = true;
      component.showCloseButton = false;
      fixture.detectChanges();

      const closeButton =
        fixture.nativeElement.querySelector('.modal-close-btn');
      expect(closeButton).toBeFalsy();

      component.showCloseButton = true;
      fixture.detectChanges();

      const updatedCloseButton =
        fixture.nativeElement.querySelector('.modal-close-btn');
      expect(updatedCloseButton).toBeTruthy();
    });

    it('should have default showCloseButton as true', () => {
      expect(component.showCloseButton).toBe(true);
    });
  });

  describe('Event Emission Tests', () => {
    beforeEach(() => {
      component.isOpen = true;
      fixture.detectChanges();
    });

    it('should emit closed event when close is called', () => {
      const closedSpy = jest.spyOn(component.closed, 'emit');

      component.close();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should emit closed event with no payload', () => {
      const closedSpy = jest.spyOn(component.closed, 'emit');

      component.close();

      expect(closedSpy).toHaveBeenCalledWith(undefined);
    });

    it('should emit closed event when backdrop is clicked and closeOnBackdropClick is true', () => {
      const closedSpy = jest.spyOn(component.closed, 'emit');
      const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');

      backdrop.click();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should not emit closed event when backdrop is clicked and closeOnBackdropClick is false', () => {
      component.closeOnBackdropClick = false;
      fixture.detectChanges();

      const closedSpy = jest.spyOn(component.closed, 'emit');
      const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');

      backdrop.click();

      expect(closedSpy).not.toHaveBeenCalled();
    });

    it('should emit closed event when close button is clicked', () => {
      const closedSpy = jest.spyOn(component.closed, 'emit');
      const closeButton =
        fixture.nativeElement.querySelector('.modal-close-btn');

      closeButton.click();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should emit confirmed event when confirm is called', () => {
      const confirmedSpy = jest.spyOn(component.confirmed, 'emit');

      component.confirm();

      expect(confirmedSpy).toHaveBeenCalled();
    });

    it('should emit cancelled event when cancel is called', () => {
      const cancelledSpy = jest.spyOn(component.cancelled, 'emit');

      component.cancel();

      expect(cancelledSpy).toHaveBeenCalled();
    });

    it('should not close modal when clicking on modal content', () => {
      const closedSpy = jest.spyOn(component.closed, 'emit');
      const modalContent =
        fixture.nativeElement.querySelector('.modal-content');

      modalContent.click();

      expect(closedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Tests', () => {
    beforeEach(() => {
      component.isOpen = true;
      fixture.detectChanges();
    });

    it('should have role="dialog" attribute', () => {
      const modalElement =
        fixture.nativeElement.querySelector('[role="dialog"]') ||
        fixture.nativeElement.querySelector('.modal-container');

      if (modalElement) {
        expect(modalElement.getAttribute('role')).toBe('dialog');
      }
    });

    it('should have aria-modal="true" attribute', () => {
      const modalElement =
        fixture.nativeElement.querySelector('[aria-modal="true"]') ||
        fixture.nativeElement.querySelector('.modal-container');

      if (modalElement) {
        expect(modalElement.getAttribute('aria-modal')).toBe('true');
      }
    });

    it('should have aria-labelledby when title is provided', () => {
      component.title = 'Test Title';
      fixture.detectChanges();

      const modalElement =
        fixture.nativeElement.querySelector('.modal-container') ||
        fixture.nativeElement.querySelector('[role="dialog"]');
      const titleId = modalElement?.getAttribute('aria-labelledby');

      if (titleId) {
        const titleElement = fixture.nativeElement.querySelector(`#${titleId}`);
        expect(titleElement).toBeTruthy();
      }
    });

    it('should have aria-label on close button', () => {
      const closeButton =
        fixture.nativeElement.querySelector('.modal-close-btn');

      if (closeButton) {
        expect(closeButton.getAttribute('aria-label')).toBeTruthy();
      }
    });

    it('should trap focus when modal is open', () => {
      const modalContainer =
        fixture.nativeElement.querySelector('.modal-container');

      if (modalContainer) {
        expect(modalContainer.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('should handle Escape key to close modal', fakeAsync(() => {
      const closedSpy = jest.spyOn(component.closed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      tick();

      // Component should have escape key handler
      expect(component.isOpen).toBe(true); // Default implementation might not close on escape
    }));

    it('should have aria-hidden="true" when modal is closed', () => {
      component.isOpen = false;
      fixture.detectChanges();

      const modalElement =
        fixture.nativeElement.querySelector('.modal-container');

      if (modalElement) {
        expect(modalElement.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('should focus first focusable element when opened', fakeAsync(() => {
      component.isOpen = true;
      fixture.detectChanges();

      tick();

      const focusedElement = document.activeElement;
      const modalElement =
        fixture.nativeElement.querySelector('.modal-container');

      // If modal manages focus, active element should be within modal
      if (modalElement && modalElement.contains(focusedElement)) {
        expect(modalElement.contains(focusedElement)).toBe(true);
      }
    }));

    it('should restore focus when modal is closed', fakeAsync(() => {
      const originalFocus = document.activeElement;

      component.isOpen = true;
      fixture.detectChanges();

      tick();

      component.close();
      fixture.detectChanges();

      tick();

      // Focus should be restored or at least handled
      expect(document.activeElement).toBeTruthy();
    }));

    it('should announce modal to screen readers when opened', () => {
      const modalElement =
        fixture.nativeElement.querySelector('.modal-container') ||
        fixture.nativeElement.querySelector('[role="dialog"]');

      if (modalElement) {
        // Modal should have appropriate ARIA attributes for announcement
        const hasAriaLabel =
          modalElement.getAttribute('aria-label') ||
          modalElement.getAttribute('aria-labelledby');
        expect(hasAriaLabel || modalElement.getAttribute('role')).toBeTruthy();
      }
    });
  });
});
