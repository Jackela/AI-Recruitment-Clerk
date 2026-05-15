import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkeletonTableComponent } from './skeleton-table.component';

describe('SkeletonTableComponent', () => {
  let component: SkeletonTableComponent;
  let fixture: ComponentFixture<SkeletonTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonTableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render skeleton table container', () => {
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.skeleton-table');
      expect(table).toBeTruthy();
    });

    it('should render table header', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.skeleton-header');
      expect(header).toBeTruthy();
    });

    it('should render table rows', () => {
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should have role status attribute', () => {
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.skeleton-table');
      expect(table.getAttribute('role')).toBe('status');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default input values', () => {
      expect(component.rows).toBe(5);
      expect(component.columns).toBe(4);
    });

    it('should bind rows input correctly', () => {
      component.rows = 3;
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
      expect(rows.length).toBe(3);
    });

    it('should bind columns input correctly', () => {
      component.columns = 3;
      fixture.detectChanges();

      const firstRow = fixture.nativeElement.querySelector('.skeleton-row');
      const cells = firstRow.querySelectorAll('.skeleton-cell');
      expect(cells.length).toBe(3);
    });

    it('should handle different row counts', () => {
      component.rows = 10;
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
      expect(rows.length).toBe(10);
    });

    it('should handle different column counts', () => {
      component.columns = 6;
      fixture.detectChanges();

      const firstRow = fixture.nativeElement.querySelector('.skeleton-row');
      const cells = firstRow.querySelectorAll('.skeleton-cell');
      expect(cells.length).toBe(6);
    });
  });

  describe('Row Generation Tests', () => {
    it('should generate correct row array', () => {
      component.rows = 3;

      const array = component.rowsArray;
      expect(array).toEqual([0, 1, 2]);
    });

    it('should update array when rows change', () => {
      component.rows = 5;

      const array = component.rowsArray;
      expect(array.length).toBe(5);
      expect(array).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('Column Generation Tests', () => {
    it('should generate correct column array', () => {
      component.columns = 4;

      const array = component.columnsArray;
      expect(array).toEqual([0, 1, 2, 3]);
    });

    it('should update array when columns change', () => {
      component.columns = 2;

      const array = component.columnsArray;
      expect(array).toEqual([0, 1]);
    });
  });

  describe('Shimmer Effect Tests', () => {
    it('should apply shimmer class to cells', () => {
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('.skeleton-cell');
      cells.forEach((cell: HTMLElement) => {
        expect(cell.classList.contains('shimmer')).toBe(true);
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should have role status for screen readers', () => {
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.skeleton-table');
      expect(table.getAttribute('role')).toBe('status');
    });

    it('should have aria-label attribute', () => {
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.skeleton-table');
      expect(table.getAttribute('aria-label')).toContain('table');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should render small table', () => {
      component.rows = 2;
      component.columns = 2;
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll('.skeleton-cell');

      expect(rows.length).toBe(2);
      expect(cells.length).toBe(2);
    });

    it('should render large table', () => {
      component.rows = 10;
      component.columns = 8;
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll('.skeleton-cell');

      expect(rows.length).toBe(10);
      expect(cells.length).toBe(8);
    });
  });
});
