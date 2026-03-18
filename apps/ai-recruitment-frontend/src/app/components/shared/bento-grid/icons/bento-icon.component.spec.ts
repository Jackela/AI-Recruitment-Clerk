import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoIconComponent } from './bento-icon.component';
import type { BentoIconName } from '../types/bento-card.types';

describe('BentoIconComponent', () => {
  let component: BentoIconComponent;
  let fixture: ComponentFixture<BentoIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoIconComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render icon container', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-icon');
      expect(container).toBeTruthy();
    });

    it('should render SVG element', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default size', () => {
      expect(component.size).toBe(24);
    });

    it('should bind icon input correctly', () => {
      const icons: BentoIconName[] = [
        'users',
        'chart',
        'document',
        'settings',
        'check',
        'warning',
        'info',
      ];

      icons.forEach((icon) => {
        component.icon = icon;
        fixture.detectChanges();

        expect(component.icon).toBe(icon);
      });
    });

    it('should bind size input correctly', () => {
      component.size = 32;
      fixture.detectChanges();

      expect(component.size).toBe(32);
    });

    it('should set correct SVG dimensions', () => {
      component.icon = 'users';
      component.size = 48;
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg.getAttribute('width')).toBe('48');
      expect(svg.getAttribute('height')).toBe('48');
    });
  });

  describe('Icon Rendering Tests', () => {
    it('should render users icon', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render chart icon', () => {
      component.icon = 'chart';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render document icon', () => {
      component.icon = 'document';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render settings icon', () => {
      component.icon = 'settings';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render check icon', () => {
      component.icon = 'check';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render warning icon', () => {
      component.icon = 'warning';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render info icon', () => {
      component.icon = 'info';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have aria-hidden attribute', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-icon');
      expect(container.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have viewBox attribute', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    });
  });
});
