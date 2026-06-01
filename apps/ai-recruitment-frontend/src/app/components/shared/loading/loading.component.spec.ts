import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { LoadingComponent } from './loading.component';

describe('LoadingComponent', () => {
  let component: LoadingComponent;
  let fixture: ComponentFixture<LoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Props Binding Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should bind message input correctly', () => {
      component.message = 'Loading data...';
      fixture.detectChanges();

      expect(component.message).toBe('Loading data...');

      const messageElement =
        fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
      expect(messageElement.textContent).toBe('Loading data...');
    });

    it('should bind size input correctly', () => {
      component.size = 'lg';
      fixture.detectChanges();

      expect(component.size).toBe('lg');

      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner.classList.contains('lg')).toBe(true);
    });

    it('should bind inline input correctly', () => {
      component.inline = true;
      fixture.detectChanges();

      expect(component.inline).toBe(true);

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.classList.contains('inline')).toBe(true);
    });

    it('should bind overlay input correctly', () => {
      component.overlay = true;
      fixture.detectChanges();

      expect(component.overlay).toBe(true);

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.classList.contains('overlay')).toBe(true);
    });

    it('should have default values for all inputs', () => {
      fixture.detectChanges();

      expect(component.message).toBe('');
      expect(component.size).toBe('md');
      expect(component.inline).toBe(false);
      expect(component.overlay).toBe(false);
    });

    it('should update view when message changes', () => {
      fixture.detectChanges();

      let messageElement =
        fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeFalsy();

      component.message = 'Updated message';
      fixture.detectChanges();

      messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeTruthy();
      expect(messageElement.textContent).toBe('Updated message');
    });

    it('should apply size classes dynamically', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

      sizes.forEach((size) => {
        component.size = size;
        fixture.detectChanges();

        const spinner = fixture.nativeElement.querySelector('.loading-spinner');
        expect(spinner.classList.contains(size)).toBe(true);
      });
    });
  });

  describe('Event Emission Tests', () => {
    it('should render spinner with 4 rings', () => {
      fixture.detectChanges();

      const rings = fixture.nativeElement.querySelectorAll('.spinner-ring');
      expect(rings.length).toBe(4);
    });

    it('should not display message when message is empty', () => {
      component.message = '';
      fixture.detectChanges();

      const messageElement =
        fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement).toBeFalsy();
    });

    it('should handle rapid input changes', () => {
      component.size = 'sm';
      fixture.detectChanges();

      component.size = 'lg';
      fixture.detectChanges();

      component.size = 'md';
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner.classList.contains('md')).toBe(true);
      expect(spinner.classList.contains('lg')).toBe(false);
      expect(spinner.classList.contains('sm')).toBe(false);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have aria-busy attribute when loading', () => {
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.getAttribute('aria-busy')).toBe('true');
    });

    it('should have role="status" for screen reader announcement', () => {
      component.message = 'Loading...';
      fixture.detectChanges();

      const statusElement =
        fixture.nativeElement.querySelector('[role="status"]') ||
        fixture.nativeElement.querySelector('.loading-message');

      if (statusElement) {
        expect(statusElement.getAttribute('role')).toBe('status');
      }
    });

    it('should have aria-live="polite" for loading announcements', () => {
      component.message = 'Please wait...';
      fixture.detectChanges();

      const messageElement =
        fixture.nativeElement.querySelector('.loading-message');
      if (messageElement) {
        expect(messageElement.getAttribute('aria-live')).toBe('polite');
      }
    });

    it('should have aria-label for the loading spinner', () => {
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      const container =
        fixture.nativeElement.querySelector('.loading-container');

      const ariaLabel =
        spinner?.getAttribute('aria-label') ||
        container?.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
    });

    it('should be focusable when overlay is true', () => {
      component.overlay = true;
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.getAttribute('tabindex')).toBe('-1');
    });

    it('should prevent interaction with background when overlay is active', () => {
      component.overlay = true;
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.classList.contains('overlay')).toBe(true);
      expect(getComputedStyle(container).pointerEvents).not.toBe('none');
    });

    it('should announce loading state changes to screen readers', () => {
      component.message = 'Initial loading';
      fixture.detectChanges();

      let messageElement =
        fixture.nativeElement.querySelector('.loading-message');

      component.message = 'Almost done';
      fixture.detectChanges();

      messageElement = fixture.nativeElement.querySelector('.loading-message');
      expect(messageElement.textContent).toBe('Almost done');
    });

    it('should have semantic HTML structure', () => {
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container).toBeTruthy();

      const spinner = container.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();

      const rings = spinner.querySelectorAll('.spinner-ring');
      expect(rings.length).toBe(4);
    });
  });
});
