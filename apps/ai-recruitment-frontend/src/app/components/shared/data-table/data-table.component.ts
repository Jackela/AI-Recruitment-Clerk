import type {
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

/**
 * Defines the shape of the table column.
 */
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  customTemplate?: unknown; // Template reference - can be any template type
  // Mobile responsiveness features
  priority?: 'high' | 'medium' | 'low'; // Column priority for mobile display
  mobileLabel?: string; // Shorter label for mobile
  truncateLength?: number; // Character limit for text truncation
}

/**
 * Defines the shape of the table options.
 */
export interface TableOptions {
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  showFilter?: boolean;
  showExport?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Defines the shape of the sort event.
 */
export interface SortEvent {
  column: string;
  direction: 'asc' | 'desc' | null;
}

/**
 * Defines the shape of the page event.
 */
export interface PageEvent {
  pageIndex: number;
  pageSize: number;
}

/**
 * Represents the data table component.
 */
@Component({
  selector: 'arc-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent<T = Record<string, unknown>>
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('tableWrapper', { static: false })
  public tableWrapper!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  @Input() public columns: TableColumn[] = [];
  @Input() public data: T[] = [];
  @Input() public options: TableOptions = {};
  @Input() public showActions = false;

  @Output() public sortChange = new EventEmitter<SortEvent>();
  @Output() public pageChange = new EventEmitter<PageEvent>();
  @Output() public selectionChange = new EventEmitter<T[]>();
  @Output() public viewItem = new EventEmitter<T>();
  @Output() public editItem = new EventEmitter<T>();
  @Output() public deleteItem = new EventEmitter<T>();
  @Output() public exportData = new EventEmitter<void>();

  // Deprecated: keep for backwards compatibility
  /** @deprecated Use sortChange instead */ @Output() public onSort = this.sortChange;
  /** @deprecated Use pageChange instead */ @Output() public onPageChange = this.pageChange;
  /** @deprecated Use selectionChange instead */ @Output() public onSelectionChange = this.selectionChange;
  /** @deprecated Use viewItem instead */ @Output() public onView = this.viewItem;
  /** @deprecated Use editItem instead */ @Output() public onEdit = this.editItem;
  /** @deprecated Use deleteItem instead */ @Output() public onDelete = this.deleteItem;
  /** @deprecated Use exportData instead */ @Output() public onExport = this.exportData;

  // State
  public searchTerm = '';
  public pageSize = 10;
  public currentPage = signal(0);
  public sortColumn = signal<string | null>(null);
  public sortDirection = signal<'asc' | 'desc' | null>(null);
  public selectedRows = signal<T[]>([]);
  // Track horizontal scroll state (moved to private property below)

  // Computed values
  public filteredData = computed(() => {
    let filtered = [...this.data];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((row) => {
        return this.columns.some((col) => {
          if (col.filterable !== false) {
            const value = this.getCellValue(row, col.key);
            return value?.toString().toLowerCase().includes(term);
          }
          return false;
        });
      });
    }

    // Apply sorting
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol && sortDir) {
      filtered.sort((a, b) => {
        const aVal = this.getCellValue(a, sortCol);
        const bVal = this.getCellValue(b, sortCol);

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  });

  public totalItems = computed(() => this.filteredData().length);
  public totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  public paginatedData = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData().slice(start, end);
  });

  public startIndex = computed(() => this.currentPage() * this.pageSize);
  public endIndex = computed(() =>
    Math.min(this.startIndex() + this.pageSize, this.totalItems()),
  );

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Set default options
    this.options = {
      pageSize: 10,
      pageSizeOptions: [10, 25, 50, 100],
      showPagination: true,
      showFilter: true,
      showExport: false,
      selectable: false,
      multiSelect: false,
      striped: true,
      bordered: true,
      hoverable: true,
      loading: false,
      emptyMessage: '暂无数据',
      ...this.options,
    };

    this.pageSize = this.options.pageSize || 10;

    // Set default column priorities if not specified
    this.columns = this.columns.map((col) => ({
      ...col,
      priority: col.priority || 'medium',
    }));
  }

  /**
   * Performs the ng after view init operation.
   */
  public ngAfterViewInit(): void {
    this.setupScrollDetection();
    this.setupResizeObserver();
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Retrieves cell value.
   * @param row - The row.
   * @param key - The key.
   * @returns The unknown.
   */
  public getCellValue(row: T, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = row;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  /**
   * Performs the on search operation.
   */
  public onSearch(): void {
    this.currentPage.set(0);
  }

  /**
   * Performs the clear search operation.
   */
  public clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  /**
   * Handles sort.
   * @param column - The column.
   */
  public handleSort(column: string): void {
    if (this.sortColumn() === column) {
      // Toggle direction
      if (this.sortDirection() === 'asc') {
        this.sortDirection.set('desc');
      } else if (this.sortDirection() === 'desc') {
        this.sortColumn.set(null);
        this.sortDirection.set(null);
      } else {
        this.sortDirection.set('asc');
      }
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }

    const currentSortColumn = this.sortColumn();
    if (currentSortColumn) {
      this.onSort.emit({
        column: currentSortColumn,
        direction: this.sortDirection(),
      });
    }
  }

  /**
   * Performs the previous page operation.
   */
  public previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.emitPageChange();
    }
  }

  /**
   * Performs the next page operation.
   */
  public nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.emitPageChange();
    }
  }

  /**
   * Performs the go to page operation.
   * @param page - The page.
   */
  public goToPage(page: number): void {
    this.currentPage.set(page);
    this.emitPageChange();
  }

  /**
   * Performs the on page size change operation.
   */
  public onPageSizeChange(): void {
    this.currentPage.set(0);
    this.emitPageChange();
  }

  /**
   * Performs the emit page change operation.
   */
  public emitPageChange(): void {
    this.onPageChange.emit({
      pageIndex: this.currentPage(),
      pageSize: this.pageSize,
    });
  }

  /**
   * Retrieves page numbers.
   * @returns The an array of number value.
   */
  public getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    const maxVisible = 5;
    let start = Math.max(0, current - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible);

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Performs the is selected operation.
   * @param row - The row.
   * @returns The boolean value.
   */
  public isSelected(row: T): boolean {
    return this.selectedRows().includes(row);
  }

  /**
   * Performs the is all selected operation.
   * @returns The boolean value.
   */
  public isAllSelected(): boolean {
    const pageData = this.paginatedData();
    return pageData.length > 0 && pageData.every((row) => this.isSelected(row));
  }

  /**
   * Performs the is some selected operation.
   * @returns The boolean value.
   */
  public isSomeSelected(): boolean {
    const pageData = this.paginatedData();
    return (
      pageData.some((row) => this.isSelected(row)) && !this.isAllSelected()
    );
  }

  /**
   * Performs the toggle select operation.
   * @param row - The row.
   */
  public toggleSelect(row: T): void {
    const selected = [...this.selectedRows()];
    const index = selected.indexOf(row);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      if (this.options.multiSelect) {
        selected.push(row);
      } else {
        selected.length = 0;
        selected.push(row);
      }
    }

    this.selectedRows.set(selected);
    this.onSelectionChange.emit(selected);
  }

  /**
   * Performs the toggle select all operation.
   */
  public toggleSelectAll(): void {
    const pageData = this.paginatedData();
    const selected = [...this.selectedRows()];

    if (this.isAllSelected()) {
      // Deselect all on current page
      pageData.forEach((row) => {
        const index = selected.indexOf(row);
        if (index > -1) {
          selected.splice(index, 1);
        }
      });
    } else {
      // Select all on current page
      pageData.forEach((row) => {
        if (!selected.includes(row)) {
          selected.push(row);
        }
      });
    }

    this.selectedRows.set(selected);
    this.onSelectionChange.emit(selected);
  }

  /**
   * Performs the export data operation.
   */
  public exportTableData(): void {
    this.exportData.emit();
    // Default CSV export implementation
    const csv = this.convertToCSV(this.filteredData());
    this.downloadCSV(csv, 'data-export.csv');
  }

  private convertToCSV(data: T[]): string {
    if (data.length === 0) return '';

    // Headers
    const headers = this.columns.map((col) => col.label);
    const csvHeaders = headers.join(',');

    // Rows
    const csvRows = data.map((row) => {
      return this.columns
        .map((col) => {
          const value = this.getCellValue(row, col.key);
          // Escape commas and quotes
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Retrieves next sort direction.
   * @param column - The column.
   * @returns The 'asc' | 'desc' | null.
   */
  public getNextSortDirection(column: string): 'asc' | 'desc' | null {
    const currentColumn = this.sortColumn();
    const currentDirection = this.sortDirection();

    if (currentColumn !== column) {
      return 'asc';
    }

    if (currentDirection === 'asc') {
      return 'desc';
    } else if (currentDirection === 'desc') {
      return null;
    } else {
      return 'asc';
    }
  }

  // Mobile responsiveness methods
  /**
   * Retrieves column classes.
   * @param column - The column.
   * @returns The string value.
   */
  public getColumnClasses(column: TableColumn): string {
    const classes: string[] = [];

    if (column.priority) {
      classes.push(`priority-${column.priority}`);
    }

    // Add responsive column classes
    if (column.priority === 'high') {
      classes.push('column-primary');
    } else if (column.priority === 'medium') {
      classes.push('column-secondary');
    } else {
      classes.push('column-secondary');
    }

    return classes.join(' ');
  }

  /**
   * Retrieves column label.
   * @param column - The column.
   * @returns The string value.
   */
  public getColumnLabel(column: TableColumn): string {
    // Use mobile label on small screens if available
    if (window.innerWidth <= 768 && column.mobileLabel) {
      return column.mobileLabel;
    }
    return column.label;
  }

  /**
   * Retrieves truncated value.
   * @param row - The row.
   * @param column - The column.
   * @returns The string value.
   */
  public getTruncatedValue(row: T, column: TableColumn): string {
    const value = this.getCellValue(row, column.key);
    const text = String(value || '');

    if (column.truncateLength && text.length > column.truncateLength) {
      return text.substring(0, column.truncateLength) + '...';
    }

    return text;
  }

  /**
   * Performs the should show tooltip operation.
   * @param row - The row.
   * @param column - The column.
   * @returns The boolean value.
   */
  public shouldShowTooltip(row: T, column: TableColumn): boolean {
    if (!column.truncateLength) return false;

    const value = this.getCellValue(row, column.key);
    const text = String(value || '');

    return text.length > column.truncateLength;
  }

  // Horizontal scroll detection
  public hasHorizontalScroll = false;

  private setupScrollDetection(): void {
    if (!this.tableWrapper) return;

    const scrollElement = this.tableWrapper.nativeElement;

    fromEvent(scrollElement, 'scroll')
      .pipe(debounceTime(50), takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateScrollIndicator();
      });
  }

  private setupResizeObserver(): void {
    if (!this.tableWrapper || !('ResizeObserver' in window)) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateScrollIndicator();
    });

    this.resizeObserver.observe(this.tableWrapper.nativeElement);
  }

  private updateScrollIndicator(): void {
    if (!this.tableWrapper) return;

    const element = this.tableWrapper.nativeElement;
    const table = element.querySelector('.data-table') as HTMLElement;

    if (table) {
      this.hasHorizontalScroll = table.scrollWidth > element.clientWidth;
    }
  }
}
