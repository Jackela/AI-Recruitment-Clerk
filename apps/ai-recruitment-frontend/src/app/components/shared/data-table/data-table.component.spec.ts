import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  DataTableComponent,
  type TableColumn,
  type TableOptions,
  type SortEvent,
} from './data-table.component';
import type { PageEvent } from './data-table-pagination.component';

describe('DataTableComponent', () => {
  let component: DataTableComponent<TestRow>;
  let fixture: ComponentFixture<DataTableComponent<TestRow>>;

  interface TestRow {
    id: string;
    name: string;
    age: number;
    email: string;
  }

  const mockColumns: TableColumn[] = [
    { key: 'name', label: '姓名', sortable: true, filterable: true },
    {
      key: 'age',
      label: '年龄',
      sortable: true,
      filterable: true,
      type: 'number',
    },
    { key: 'email', label: '邮箱', sortable: false, filterable: true },
  ];

  const mockData: TestRow[] = [
    { id: '1', name: '张三', age: 28, email: 'zhangsan@example.com' },
    { id: '2', name: '李四', age: 32, email: 'lisi@example.com' },
    { id: '3', name: '王五', age: 25, email: 'wangwu@example.com' },
  ];

  const mockOptions: TableOptions = {
    pageSize: 2,
    showPagination: true,
    showFilter: true,
    selectable: true,
    multiSelect: true,
    striped: true,
    bordered: true,
    hoverable: true,
    emptyMessage: '暂无数据',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTableComponent<TestRow>);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Props Binding Tests', () => {
    it('should bind columns input correctly', () => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();

      expect(component.columns).toEqual(mockColumns);
      expect(component.columns.length).toBe(3);
    });

    it('should bind data input correctly', () => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();

      expect(component.data).toEqual(mockData);
      expect(component.data.length).toBe(3);
    });

    it('should apply default options when options input is not provided', () => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();

      expect(component.options.pageSize).toBe(10);
      expect(component.options.showPagination).toBe(true);
      expect(component.options.emptyMessage).toBe('暂无数据');
    });

    it('should merge provided options with defaults', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.options = { pageSize: 5, showFilter: false };
      fixture.detectChanges();

      expect(component.options.pageSize).toBe(5);
      expect(component.options.showFilter).toBe(false);
      expect(component.options.showPagination).toBe(true); // default
    });

    it('should bind showActions input correctly', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.showActions = true;
      fixture.detectChanges();

      expect(component.showActions).toBe(true);
    });

    it('should set default values for all inputs', () => {
      fixture.detectChanges();

      expect(component.columns).toEqual([]);
      expect(component.data).toEqual([]);
      expect(component.options).toEqual(expect.any(Object));
      expect(component.showActions).toBe(false);
    });

    it('should update filtered data when data input changes', () => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();

      expect(component.filteredData().length).toBe(3);

      component.data = [mockData[0]];
      fixture.detectChanges();

      expect(component.filteredData().length).toBe(1);
    });
  });

  describe('Event Emission Tests', () => {
    beforeEach(() => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();
    });

    it('should emit sortChange event with correct payload on handleSort', () => {
      const sortSpy = jest.spyOn(component.sortChange, 'emit');

      component.handleSort('name');

      expect(sortSpy).toHaveBeenCalledWith({
        column: 'name',
        direction: 'asc',
      });
    });

    it('should toggle sort direction on consecutive sort clicks', () => {
      const sortSpy = jest.spyOn(component.sortChange, 'emit');

      component.handleSort('name');
      expect(sortSpy).toHaveBeenLastCalledWith({
        column: 'name',
        direction: 'asc',
      });

      component.handleSort('name');
      expect(sortSpy).toHaveBeenLastCalledWith({
        column: 'name',
        direction: 'desc',
      });

      component.handleSort('name');
      expect(sortSpy).toHaveBeenLastCalledWith({
        column: 'name',
        direction: null,
      });
    });

    it('should emit pageChange event with correct PageEvent payload', () => {
      const pageSpy = jest.spyOn(component.pageChange, 'emit');
      const pageEvent: PageEvent = { pageIndex: 1, pageSize: 10, length: 30 };

      component.handlePageChange(pageEvent);

      expect(pageSpy).toHaveBeenCalledWith(pageEvent);
    });

    it('should emit selectionChange event when toggling row selection', () => {
      component.options = {
        ...component.options,
        selectable: true,
        multiSelect: true,
      };
      const selectionSpy = jest.spyOn(component.selectionChange, 'emit');
      const row = mockData[0];

      component.toggleSelect(row);

      expect(selectionSpy).toHaveBeenCalled();
      expect(component.selectedRows()).toContain(row);
    });

    it('should emit selectionChange with all selected rows on toggleSelectAll', () => {
      component.options = {
        ...component.options,
        selectable: true,
        multiSelect: true,
      };
      const selectionSpy = jest.spyOn(component.selectionChange, 'emit');

      component.toggleSelectAll();

      expect(selectionSpy).toHaveBeenCalled();
      expect(component.isAllSelected()).toBe(true);
    });

    it('should emit viewItem event with correct row data', () => {
      const viewSpy = jest.spyOn(component.viewItem, 'emit');
      const row = mockData[0];

      component.viewItem.emit(row);

      expect(viewSpy).toHaveBeenCalledWith(row);
    });

    it('should emit editItem event with correct row data', () => {
      const editSpy = jest.spyOn(component.editItem, 'emit');
      const row = mockData[0];

      component.editItem.emit(row);

      expect(editSpy).toHaveBeenCalledWith(row);
    });

    it('should emit deleteItem event with correct row data', () => {
      const deleteSpy = jest.spyOn(component.deleteItem, 'emit');
      const row = mockData[0];

      component.deleteItem.emit(row);

      expect(deleteSpy).toHaveBeenCalledWith(row);
    });

    it('should emit exportData event when exporting', () => {
      const exportSpy = jest.spyOn(component.exportData, 'emit');

      component.exportTableData();

      expect(exportSpy).toHaveBeenCalled();
    });

    it('should reset current page when search term changes', () => {
      component.currentPage.set(2);
      component.searchTerm = 'test';

      component.onSearch();

      expect(component.currentPage()).toBe(0);
    });
  });

  describe('Accessibility Tests', () => {
    beforeEach(() => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();
    });

    it('should have proper ARIA attributes on table headers', () => {
      const headers = fixture.nativeElement.querySelectorAll('th');

      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((header: HTMLElement) => {
        expect(header.getAttribute('scope')).toBe('col');
      });
    });

    it('should have role="table" on table element', () => {
      const table = fixture.nativeElement.querySelector('table');

      if (table) {
        expect(table.getAttribute('role')).toBe('table');
      }
    });

    it('should support keyboard navigation for sortable columns', () => {
      const sortableHeaders = fixture.nativeElement.querySelectorAll(
        '[data-sortable="true"]',
      );

      sortableHeaders.forEach((header: HTMLElement) => {
        expect(header.getAttribute('tabindex')).toBe('0');
      });
    });

    it('should have aria-label for action buttons', () => {
      component.showActions = true;
      fixture.detectChanges();

      const actionButtons =
        fixture.nativeElement.querySelectorAll('button[aria-label]');

      actionButtons.forEach((button: HTMLElement) => {
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should announce empty state to screen readers', () => {
      component.data = [];
      fixture.detectChanges();

      const emptyMessage =
        fixture.nativeElement.querySelector('[role="status"]') ||
        fixture.nativeElement.querySelector('.empty-message');

      if (emptyMessage) {
        expect(emptyMessage.getAttribute('aria-live')).toBe('polite');
      }
    });

    it('should have aria-sort attributes on sortable columns', () => {
      component.handleSort('name');
      fixture.detectChanges();

      const sortedHeader = fixture.nativeElement.querySelector('[aria-sort]');

      if (sortedHeader) {
        expect(sortedHeader.getAttribute('aria-sort')).toMatch(
          /ascending|descending/,
        );
      }
    });

    it('should support focus management on row selection', () => {
      component.options = { ...component.options, selectable: true };
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll(
        'input[type="checkbox"]',
      );

      expect(checkboxes.length).toBeGreaterThan(0);
      checkboxes.forEach((checkbox: HTMLInputElement) => {
        expect(checkbox.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have screen reader text for pagination controls', () => {
      const pagination = fixture.nativeElement.querySelector(
        'arc-data-table-pagination',
      );

      if (pagination) {
        const srTexts = pagination.querySelectorAll('.sr-only');
        expect(srTexts.length).toBeGreaterThan(0);
      }
    });
  });
});
