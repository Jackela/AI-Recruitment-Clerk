import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoProgressBarComponent } from './bento-progress-bar.component';

describe('BentoProgressBarComponent', () => {
  let component: BentoProgressBarComponent;
  let fixture: ComponentFixture<BentoProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoProgressBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoProgressBarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render progress bar container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.progress-bar');
      expect(container).toBeTruthy();
    });

    it('should render progress fill', () => {
      component.progress = 50;
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill).toBeTruthy();
    });

    it('should render progress text when showText is true', () => {
      component.progress = 75;
      component.showText = true;
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('.progress-text');
      expect(text).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default progress value', () => {
      expect(component.progress).toBe(0);
    });

    it('should have default showText value', () => {
      expect(component.showText).toBe(false);
    });

    it('should bind progress input correctly', () => {
      component.progress = 50;
      fixture.detectChanges();

      expect(component.progress).toBe(50);
    });

    it('should bind showText input correctly', () => {
      component.showText = true;
      fixture.detectChanges();

      expect(component.showText).toBe(true);
    });
  });

  describe('Progress Calculation Tests', () => {
    it('should set correct width percentage', () => {
      component.progress = 75;
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill.style.width).toBe('75%');
    });

    it('should cap progress at 100%', () => {
      component.progress = 150;
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill.style.width).toBe('100%');
    });

    it('should floor progress at 0%', () => {
      component.progress = -20;
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill.style.width).toBe('0%');
    });

    it('should handle zero progress', () => {
      component.progress = 0;
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill.style.width).toBe('0%');
    });

    it('should handle full progress', () => {
      component.progress = 100;
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill.style.width).toBe('100%');
    });
  });

  describe('Accessibility Tests', () => {
    it('should have role progressbar', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.progress-bar');
      expect(container.getAttribute('role')).toBe('progressbar');
    });

    it('should have aria-valuenow attribute', () => {
      component.progress = 65;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.progress-bar');
      expect(container.getAttribute('aria-valuenow')).toBe('65');
    });

    it('should have aria-valuemin attribute', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.progress-bar');
      expect(container.getAttribute('aria-valuemin')).toBe('0');
    });

    it('should have aria-valuemax attribute', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.progress-bar');
      expect(container.getAttribute('aria-valuemax')).toBe('100');
    });
  });

  describe('Conditional Rendering Tests', () => {
    it('should not render progress text when showText is false', () => {
      component.progress = 50;
      component.showText = false;
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('.progress-text');
      expect(text).toBeFalsy();
    });

    it('should render progress text when showText is true', () => {
      component.progress = 50;
      component.showText = true;
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('.progress-text');
      expect(text).toBeTruthy();
      expect(text.textContent).toContain('50');
    });
  });
});
