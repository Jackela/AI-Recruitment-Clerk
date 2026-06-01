import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkeletonButtonComponent } from './skeleton-button.component';

describe('SkeletonButtonComponent', () => {
  let component: SkeletonButtonComponent;
  let fixture: ComponentFixture<SkeletonButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonButtonComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render skeleton button element', () => {
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button).toBeTruthy();
    });

    it('should have aria-hidden attribute', () => {
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default input values', () => {
      expect(component.width).toBe('120px');
      expect(component.height).toBe('40px');
    });

    it('should bind width input correctly', () => {
      component.width = '200px';
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.style.width).toBe('200px');
    });

    it('should bind height input correctly', () => {
      component.height = '50px';
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.style.height).toBe('50px');
    });

    it('should handle numeric width values', () => {
      component.width = '100%';
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.style.width).toBe('100%');
    });
  });

  describe('Shimmer Effect Tests', () => {
    it('should apply shimmer class by default', () => {
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.classList.contains('shimmer')).toBe(true);
    });
  });

  describe('Accessibility Tests', () => {
    it('should be hidden from screen readers', () => {
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should render with various dimensions', () => {
      const testCases = [
        { width: '80px', height: '32px' },
        { width: '150px', height: '45px' },
        { width: '100%', height: '50px' },
      ];

      testCases.forEach(({ width, height }) => {
        component.width = width;
        component.height = height;
        fixture.detectChanges();

        const button = fixture.nativeElement.querySelector('.skeleton-button');
        expect(button.style.width).toBe(width);
        expect(button.style.height).toBe(height);
      });
    });
  });
});
