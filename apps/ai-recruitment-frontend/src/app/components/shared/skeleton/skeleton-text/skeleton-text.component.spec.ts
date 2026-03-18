import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkeletonTextComponent } from './skeleton-text.component';

describe('SkeletonTextComponent', () => {
  let component: SkeletonTextComponent;
  let fixture: ComponentFixture<SkeletonTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonTextComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render skeleton text container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.skeleton-text');
      expect(container).toBeTruthy();
    });

    it('should render default number of lines', () => {
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(3);
    });

    it('should have aria-hidden attribute', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.skeleton-text');
      expect(container.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default input values', () => {
      expect(component.lines).toBe(3);
      expect(component.width).toEqual(['100%', '100%', '100%']);
    });

    it('should bind lines input correctly', () => {
      component.lines = 5;
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(5);
    });

    it('should bind width input as array correctly', () => {
      component.lines = 2;
      component.width = ['80%', '60%'];
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines[0].style.width).toBe('80%');
      expect(lines[1].style.width).toBe('60%');
    });

    it('should bind width input as string correctly', () => {
      component.lines = 2;
      component.width = '70%';
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines[0].style.width).toBe('70%');
      expect(lines[1].style.width).toBe('70%');
    });
  });

  describe('Line Generation Tests', () => {
    it('should generate correct line widths array from string', () => {
      component.lines = 3;
      component.width = '50%';

      const widths = component.lineWidths;
      expect(widths).toEqual(['50%', '50%', '50%']);
    });

    it('should generate correct line widths array from array', () => {
      component.lines = 3;
      component.width = ['100%', '80%', '60%'];

      const widths = component.lineWidths;
      expect(widths).toEqual(['100%', '80%', '60%']);
    });

    it('should pad widths array if shorter than lines', () => {
      component.lines = 5;
      component.width = ['100%', '80%'];

      const widths = component.lineWidths;
      expect(widths).toEqual(['100%', '80%', '100%', '100%', '100%']);
    });

    it('should truncate widths array if longer than lines', () => {
      component.lines = 2;
      component.width = ['100%', '80%', '60%', '40%'];

      const widths = component.lineWidths;
      expect(widths).toEqual(['100%', '80%']);
    });
  });

  describe('Shimmer Effect Tests', () => {
    it('should apply shimmer class to lines by default', () => {
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      lines.forEach((line: HTMLElement) => {
        expect(line.classList.contains('shimmer')).toBe(true);
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should be hidden from screen readers', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.skeleton-text');
      expect(container.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Line Structure Tests', () => {
    it('should render lines array correctly', () => {
      component.lines = 4;
      fixture.detectChanges();

      const linesArray = component.linesArray;
      expect(linesArray).toEqual([0, 1, 2, 3]);
    });

    it('should handle single line', () => {
      component.lines = 1;
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(1);
    });

    it('should handle many lines', () => {
      component.lines = 10;
      fixture.detectChanges();

      const lines = fixture.nativeElement.querySelectorAll('.skeleton-line');
      expect(lines.length).toBe(10);
    });
  });
});
