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
  template: `
    <div class="data-table-container" [class.loading]="options.loading">
      <!-- Toolbar -->
      <div
        class="table-toolbar"
        *ngIf="options.showFilter || options.showExport"
      >
        <div class="toolbar-left">
          <div class="search-box" *ngIf="options.showFilter">
            <svg
              class="search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              class="search-input"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch()"
              placeholder="搜索..."
            />
            <button
              *ngIf="searchTerm"
              (click)="clearSearch()"
              class="clear-btn"
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <button
            *ngIf="options.showExport"
            (click)="exportData()"
            class="export-btn"
            type="button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出
          </button>
        </div>
      </div>

      <!-- Table -->
      <div
        class="table-wrapper"
        #tableWrapper
        [class.has-horizontal-scroll]="hasHorizontalScroll"
      >
        <table
          class="data-table"
          [class.striped]="options.striped"
          [class.bordered]="options.bordered"
          [class.hoverable]="options.hoverable"
        >
          <thead>
            <tr>
              <th *ngIf="options.selectable" class="checkbox-column">
                <input
                  *ngIf="options.multiSelect"
                  type="checkbox"
                  [checked]="isAllSelected()"
                  [indeterminate]="isSomeSelected()"
                  (change)="toggleSelectAll()"
                />
              </th>
              <th
                *ngFor="let column of columns"
                [style.width]="column.width"
                [style.text-align]="column.align || 'left'"
                [class.sortable]="column.sortable"
                [class]="getColumnClasses(column)"
                (click)="
                  column.sortable
                    ? onSort.emit({
                        column: column.key,
                        direction: getNextSortDirection(column.key),
                      })
                    : null
                "
              >
                <div class="th-content">
                  <span>{{ getColumnLabel(column) }}</span>
                  <div class="sort-indicator" *ngIf="column.sortable">
                    <svg
                      class="sort-icon"
                      [class.active-asc]="
                        sortColumn() === column.key && sortDirection() === 'asc'
                      "
                      [class.active-desc]="
                        sortColumn() === column.key &&
                        sortDirection() === 'desc'
                      "
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="m7 15 5 5 5-5"
                        *ngIf="
                          sortColumn() !== column.key ||
                          sortDirection() === 'desc'
                        "
                      ></path>
                      <path
                        d="m7 9 5-5 5 5"
                        *ngIf="
                          sortColumn() === column.key &&
                          sortDirection() === 'asc'
                        "
                      ></path>
                    </svg>
                  </div>
                </div>
              </th>
              <th *ngIf="showActions" class="actions-column">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let row of paginatedData(); let i = index"
              [class.selected]="isSelected(row)"
            >
              <td *ngIf="options.selectable" class="checkbox-column">
                <input
                  type="checkbox"
                  [checked]="isSelected(row)"
                  (change)="toggleSelect(row)"
                />
              </td>
              <td
                *ngFor="let column of columns"
                [style.text-align]="column.align || 'left'"
                [class]="getColumnClasses(column)"
                [title]="
                  shouldShowTooltip(row, column)
                    ? getCellValue(row, column.key)
                    : null
                "
              >
                <span [ngSwitch]="column.type">
                  <span *ngSwitchCase="'boolean'">
                    <span
                      class="badge"
                      [class.badge-success]="getCellValue(row, column.key)"
                      [class.badge-danger]="!getCellValue(row, column.key)"
                    >
                      {{ getCellValue(row, column.key) ? '是' : '否' }}
                    </span>
                  </span>
                  <span *ngSwitchCase="'date'">
                    {{
                      getCellValue(row, column.key) | date: 'yyyy-MM-dd HH:mm'
                    }}
                  </span>
                  <span *ngSwitchCase="'number'">
                    {{ getCellValue(row, column.key) | number: '1.0-2' }}
                  </span>
                  <span *ngSwitchDefault>
                    {{ getTruncatedValue(row, column) }}
                  </span>
                </span>
              </td>
              <td *ngIf="showActions" class="actions-column">
                <div class="action-buttons">
                  <button
                    (click)="onView.emit(row)"
                    class="action-btn view-btn"
                    title="查看"
                    type="button"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      ></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button
                    (click)="onEdit.emit(row)"
                    class="action-btn edit-btn"
                    title="编辑"
                    type="button"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      ></path>
                      <path
                        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    (click)="onDelete.emit(row)"
                    class="action-btn delete-btn"
                    title="删除"
                    type="button"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      ></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div
          class="empty-state"
          *ngIf="paginatedData().length === 0 && !options.loading"
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 3h18v18H3z"></path>
            <path d="M3 9h18"></path>
            <path d="M9 3v18"></path>
          </svg>
          <p>{{ options.emptyMessage || '暂无数据' }}</p>
        </div>

        <!-- Loading Overlay -->
        <div class="loading-overlay" *ngIf="options.loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>

      <!-- Pagination -->
      <div
        class="table-pagination"
        *ngIf="options.showPagination && totalPages() > 1"
      >
        <div class="pagination-info">
          显示 {{ startIndex() + 1 }} - {{ endIndex() }} 条，共
          {{ totalItems() }} 条
        </div>

        <div class="pagination-controls">
          <select
            [(ngModel)]="pageSize"
            (ngModelChange)="onPageSizeChange()"
            class="page-size-select"
          >
            <option *ngFor="let size of options.pageSizeOptions" [value]="size">
              {{ size }} 条/页
            </option>
          </select>

          <button
            (click)="goToPage(0)"
            [disabled]="currentPage() === 0"
            class="page-btn"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="11,17 6,12 11,7"></polyline>
              <polyline points="18,17 13,12 18,7"></polyline>
            </svg>
          </button>

          <button
            (click)="previousPage()"
            [disabled]="currentPage() === 0"
            class="page-btn"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>

          <span class="page-numbers">
            <button
              *ngFor="let page of getPageNumbers()"
              (click)="goToPage(page)"
              [class.active]="currentPage() === page"
              class="page-number"
              type="button"
            >
              {{ page + 1 }}
            </button>
          </span>

          <button
            (click)="nextPage()"
            [disabled]="currentPage() === totalPages() - 1"
            class="page-btn"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>

          <button
            (click)="goToPage(totalPages() - 1)"
            [disabled]="currentPage() === totalPages() - 1"
            class="page-btn"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="13,17 18,12 13,7"></polyline>
              <polyline points="6,17 11,12 6,7"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent<T = Record<string, unknown>>
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('tableWrapper', { static: false })
  tableWrapper!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  @Input() columns: TableColumn[] = [];
  @Input() data: T[] = [];
  @Input() options: TableOptions = {};
  @Input() showActions = false;

  @Output() onSort = new EventEmitter<SortEvent>();
  @Output() onPageChange = new EventEmitter<PageEvent>();
  @Output() onSelectionChange = new EventEmitter<T[]>();
  @Output() onView = new EventEmitter<T>();
  @Output() onEdit = new EventEmitter<T>();
  @Output() onDelete = new EventEmitter<T>();
  @Output() onExport = new EventEmitter<void>();

  // State
  searchTerm = '';
  pageSize = 10;
  currentPage = signal(0);
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc' | null>(null);
  selectedRows = signal<T[]>([]);
  // Track horizontal scroll state (moved to private property below)

  // Computed values
  filteredData = computed(() => {
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
    if (this.sortColumn() && this.sortDirection()) {
      const col = this.sortColumn()!;
      const dir = this.sortDirection()!;

      filtered.sort((a, b) => {
        const aVal = this.getCellValue(a, col);
        const bVal = this.getCellValue(b, col);

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return dir === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  });

  totalItems = computed(() => this.filteredData().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  paginatedData = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData().slice(start, end);
  });

  startIndex = computed(() => this.currentPage() * this.pageSize);
  endIndex = computed(() =>
    Math.min(this.startIndex() + this.pageSize, this.totalItems()),
  );

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  ngOnInit() {
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
   * @returns The result of the operation.
   */
  ngAfterViewInit() {
    this.setupScrollDetection();
    this.setupResizeObserver();
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  ngOnDestroy() {
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
  getCellValue(row: T, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = row;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  /**
   * Performs the on search operation.
   * @returns The result of the operation.
   */
  onSearch() {
    this.currentPage.set(0);
  }

  /**
   * Performs the clear search operation.
   * @returns The result of the operation.
   */
  clearSearch() {
    this.searchTerm = '';
    this.onSearch();
  }

  /**
   * Handles sort.
   * @param column - The column.
   * @returns The result of the operation.
   */
  handleSort(column: string) {
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

    this.onSort.emit({
      column: this.sortColumn()!,
      direction: this.sortDirection(),
    });
  }

  /**
   * Performs the previous page operation.
   * @returns The result of the operation.
   */
  previousPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.emitPageChange();
    }
  }

  /**
   * Performs the next page operation.
   * @returns The result of the operation.
   */
  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.emitPageChange();
    }
  }

  /**
   * Performs the go to page operation.
   * @param page - The page.
   * @returns The result of the operation.
   */
  goToPage(page: number) {
    this.currentPage.set(page);
    this.emitPageChange();
  }

  /**
   * Performs the on page size change operation.
   * @returns The result of the operation.
   */
  onPageSizeChange() {
    this.currentPage.set(0);
    this.emitPageChange();
  }

  /**
   * Performs the emit page change operation.
   * @returns The result of the operation.
   */
  emitPageChange() {
    this.onPageChange.emit({
      pageIndex: this.currentPage(),
      pageSize: this.pageSize,
    });
  }

  /**
   * Retrieves page numbers.
   * @returns The an array of number value.
   */
  getPageNumbers(): number[] {
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
  isSelected(row: T): boolean {
    return this.selectedRows().includes(row);
  }

  /**
   * Performs the is all selected operation.
   * @returns The boolean value.
   */
  isAllSelected(): boolean {
    const pageData = this.paginatedData();
    return pageData.length > 0 && pageData.every((row) => this.isSelected(row));
  }

  /**
   * Performs the is some selected operation.
   * @returns The boolean value.
   */
  isSomeSelected(): boolean {
    const pageData = this.paginatedData();
    return (
      pageData.some((row) => this.isSelected(row)) && !this.isAllSelected()
    );
  }

  /**
   * Performs the toggle select operation.
   * @param row - The row.
   * @returns The result of the operation.
   */
  toggleSelect(row: T) {
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
   * @returns The result of the operation.
   */
  toggleSelectAll() {
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
   * @returns The result of the operation.
   */
  exportData() {
    this.onExport.emit();
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

  private downloadCSV(csv: string, filename: string) {
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
  getNextSortDirection(column: string): 'asc' | 'desc' | null {
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
  getColumnClasses(column: TableColumn): string {
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
  getColumnLabel(column: TableColumn): string {
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
  getTruncatedValue(row: T, column: TableColumn): string {
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
  shouldShowTooltip(row: T, column: TableColumn): boolean {
    if (!column.truncateLength) return false;

    const value = this.getCellValue(row, column.key);
    const text = String(value || '');

    return text.length > column.truncateLength;
  }

  // Horizontal scroll detection
  hasHorizontalScroll = false;

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
