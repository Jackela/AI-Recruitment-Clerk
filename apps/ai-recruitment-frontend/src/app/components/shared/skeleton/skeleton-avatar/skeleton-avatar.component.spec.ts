import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkeletonAvatarComponent } from './skeleton-avatar.component';

describe('SkeletonAvatarComponent', () => {
  let component: SkeletonAvatarComponent;
  let fixture: ComponentFixture<SkeletonAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonAvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonAvatarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render skeleton avatar element', () => {
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar).toBeTruthy();
    });

    it('should have circle shape', () => {
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      const styles = window.getComputedStyle(avatar);
      expect(styles.borderRadius).toBe('50%');
    });

    it('should have aria-hidden attribute', () => {
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default size', () => {
      expect(component.size).toBe(48);
    });

    it('should bind size input correctly', () => {
      component.size = 64;
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar.style.width).toBe('64px');
      expect(avatar.style.height).toBe('64px');
    });

    it('should handle different sizes', () => {
      const sizes = [32, 48, 64, 96, 128];

      sizes.forEach((size) => {
        component.size = size;
        fixture.detectChanges();

        const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
        expect(avatar.style.width).toBe(`${size}px`);
        expect(avatar.style.height).toBe(`${size}px`);
      });
    });
  });

  describe('Shimmer Effect Tests', () => {
    it('should apply shimmer class by default', () => {
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar.classList.contains('shimmer')).toBe(true);
    });
  });

  describe('Accessibility Tests', () => {
    it('should be hidden from screen readers', () => {
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should maintain aspect ratio with different sizes', () => {
      component.size = 100;
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      const width = parseInt(avatar.style.width);
      const height = parseInt(avatar.style.height);

      expect(width).toBe(height);
    });
  });
});
