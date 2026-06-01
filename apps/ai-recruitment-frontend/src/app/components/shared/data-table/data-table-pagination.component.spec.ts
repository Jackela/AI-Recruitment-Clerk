import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import {
  DataTablePaginationComponent,
  type PageEvent,
} from './data-table-pagination.component';

describe('DataTablePaginationComponent', () => {
  let component: DataTablePaginationComponent;
  let fixture: ComponentFixture<DataTablePaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTablePaginationComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTablePaginationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should not render pagination when only one page', () => {
      component.totalItems = 5;
      component.pageSize = 10;
      fixture.detectChanges();

      const pagination =
        fixture.nativeElement.querySelector('.table-pagination');
      expect(pagination).toBeFalsy();
    });

    it('should render pagination when more than one page', () => {
      component.totalItems = 50;
      component.pageSize = 10;
      fixture.detectChanges();

      const pagination =
        fixture.nativeElement.querySelector('.table-pagination');
      expect(pagination).toBeTruthy();
    });

    it('should render pagination info', () => {
      component.totalItems = 50;
      component.pageSize = 10;
      component.currentPage = 0;
      fixture.detectChanges();

      const info = fixture.nativeElement.querySelector('.pagination-info');
      expect(info).toBeTruthy();
      expect(info.textContent).toContain('显示 1 - 10 条，共 50 条');
    });

    it('should render page size selector', () => {
      component.totalItems = 50;
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('.page-size-select');
      expect(select).toBeTruthy();
    });

    it('should render navigation buttons', () => {
      component.totalItems = 50;
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.page-btn');
      expect(buttons.length).toBe(4);
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default input values', () => {
      expect(component.totalItems).toBe(0);
      expect(component.pageSize).toBe(10);
      expect(component.currentPage).toBe(0);
      expect(component.pageSizeOptions).toEqual([10, 25, 50, 100]);
    });

    it('should bind totalItems input correctly', () => {
      component.totalItems = 100;
      fixture.detectChanges();

      expect(component.totalItems).toBe(100);
      expect(component.totalPages).toBe(10);
    });

    it('should bind pageSize input correctly', () => {
      component.totalItems = 100;
      component.pageSize = 25;
      fixture.detectChanges();

      expect(component.pageSize).toBe(25);
      expect(component.totalPages).toBe(4);
    });

    it('should bind currentPage input correctly', () => {
      component.currentPage = 2;
      fixture.detectChanges();

      expect(component.currentPage).toBe(2);
    });

    it('should bind pageSizeOptions input correctly', () => {
      component.pageSizeOptions = [5, 10, 20];
      fixture.detectChanges();

      const options = fixture.nativeElement.querySelectorAll(
        '.page-size-select option',
      );
      expect(options.length).toBe(3);
    });
  });

  describe('Computed Properties Tests', () => {
    it('should calculate totalPages correctly', () => {
      component.totalItems = 45;
      component.pageSize = 10;

      expect(component.totalPages).toBe(5);
    });

    it('should calculate startIndex correctly', () => {
      component.currentPage = 2;
      component.pageSize = 10;

      expect(component.startIndex).toBe(20);
    });

    it('should calculate endIndex correctly', () => {
      component.totalItems = 45;
      component.currentPage = 0;
      component.pageSize = 10;

      expect(component.endIndex).toBe(10);
    });

    it('should calculate endIndex correctly on last page', () => {
      component.totalItems = 45;
      component.currentPage = 4;
      component.pageSize = 10;

      expect(component.endIndex).toBe(45);
    });

    it('should generate correct page numbers', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 0;

      expect(component.pageNumbers).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle middle page numbers correctly', () => {
      component.totalItems = 200;
      component.pageSize = 10;
      component.currentPage = 10;

      expect(component.pageNumbers).toEqual([8, 9, 10, 11, 12]);
    });
  });

  describe('Event Trigger Tests', () => {
    it('should emit pageChange when going to next page', () => {
      const emitSpy = jest.spyOn(component.pageChange, 'emit');
      component.totalItems = 50;
      component.currentPage = 0;
      component.pageSize = 10;

      component.nextPage();

      expect(emitSpy).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    });

    it('should emit pageChange when going to previous page', () => {
      const emitSpy = jest.spyOn(component.pageChange, 'emit');
      component.totalItems = 50;
      component.currentPage = 2;
      component.pageSize = 10;

      component.previousPage();

      expect(emitSpy).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    });

    it('should emit pageChange when going to specific page', () => {
      const emitSpy = jest.spyOn(component.pageChange, 'emit');
      component.totalItems = 50;
      component.pageSize = 10;

      component.goToPage(3);

      expect(emitSpy).toHaveBeenCalledWith({ pageIndex: 3, pageSize: 10 });
    });

    it('should emit pageChange with reset to page 0 when page size changes', () => {
      const emitSpy = jest.spyOn(component.pageChange, 'emit');
      component.totalItems = 100;
      component.currentPage = 5;
      component.pageSize = 10;

      component.pageSize = 25;
      component.onPageSizeChange();

      expect(emitSpy).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 25 });
    });

    it('should not go to next page when on last page', () => {
      const emitSpy = jest.spyOn(component.pageChange, 'emit');
      component.totalItems = 30;
      component.currentPage = 2;
      component.pageSize = 10;

      component.nextPage();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not go to previous page when on first page', () => {
      const emitSpy = jest.spyOn(component.pageChange, 'emit');
      component.totalItems = 30;
      component.currentPage = 0;
      component.pageSize = 10;

      component.previousPage();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Button State Tests', () => {
    it('should disable previous buttons on first page', () => {
      component.totalItems = 50;
      component.currentPage = 0;
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.page-btn');
      expect(buttons[0].disabled).toBe(true);
      expect(buttons[1].disabled).toBe(true);
    });

    it('should disable next buttons on last page', () => {
      component.totalItems = 30;
      component.currentPage = 2;
      component.pageSize = 10;
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.page-btn');
      expect(buttons[2].disabled).toBe(true);
      expect(buttons[3].disabled).toBe(true);
    });

    it('should enable all navigation buttons on middle pages', () => {
      component.totalItems = 50;
      component.currentPage = 2;
      component.pageSize = 10;
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.page-btn');
      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.disabled).toBe(false);
      });
    });
  });

  describe('Page Number Button Tests', () => {
    it('should highlight current page button', () => {
      component.totalItems = 50;
      component.currentPage = 2;
      component.pageSize = 10;
      fixture.detectChanges();

      const pageButtons =
        fixture.nativeElement.querySelectorAll('.page-number');
      expect(pageButtons[2].classList.contains('active')).toBe(true);
    });

    it('should not highlight non-current page buttons', () => {
      component.totalItems = 50;
      component.currentPage = 2;
      component.pageSize = 10;
      fixture.detectChanges();

      const pageButtons =
        fixture.nativeElement.querySelectorAll('.page-number');
      expect(pageButtons[0].classList.contains('active')).toBe(false);
      expect(pageButtons[1].classList.contains('active')).toBe(false);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have button type on all buttons', () => {
      component.totalItems = 50;
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.getAttribute('type')).toBe('button');
      });
    });
  });
});
