import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoGridComponent } from './bento-grid.component';

describe('BentoGridComponent', () => {
  let component: BentoGridComponent;
  let fixture: ComponentFixture<BentoGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoGridComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render bento grid container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default columns value', () => {
      expect(component.columns).toBe(3);
    });

    it('should have default gap value', () => {
      expect(component.gap).toBe(16);
    });

    it('should bind columns input correctly', () => {
      component.columns = 4;
      fixture.detectChanges();

      expect(component.columns).toBe(4);
    });

    it('should bind gap input correctly', () => {
      component.gap = 24;
      fixture.detectChanges();

      expect(component.gap).toBe(24);
    });
  });

  describe('Grid Style Tests', () => {
    it('should set grid template columns style', () => {
      component.columns = 3;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    });

    it('should set grid gap style', () => {
      component.gap = 20;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container.style.gap).toBe('20px');
    });

    it('should update columns dynamically', () => {
      component.columns = 2;
      fixture.detectChanges();

      let container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container.style.gridTemplateColumns).toBe('repeat(2, 1fr)');

      component.columns = 4;
      fixture.detectChanges();

      container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
    });
  });

  describe('Responsive Tests', () => {
    it('should handle single column', () => {
      component.columns = 1;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container.style.gridTemplateColumns).toBe('repeat(1, 1fr)');
    });

    it('should handle many columns', () => {
      component.columns = 6;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.bento-grid');
      expect(container.style.gridTemplateColumns).toBe('repeat(6, 1fr)');
    });
  });
});
