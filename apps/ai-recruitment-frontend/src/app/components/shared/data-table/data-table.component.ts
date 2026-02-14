import type { OnInit, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { Component, Input, Output, EventEmitter, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import type { PageEvent } from './data-table-pagination.component';
import { DataTablePaginationComponent } from './data-table-pagination.component';
import { DataTableExportUtil, DataTableDisplayUtil } from './data-table-export.util';
import { DataTableSortingUtil, type SortState } from './data-table-sorting.util';
import { DataTableSelectionUtil } from './data-table-selection.util';
import { DataTableScrollUtil } from './data-table-scroll.util';

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
  customTemplate?: unknown;
  priority?: 'high' | 'medium' | 'low';
  mobileLabel?: string;
  truncateLength?: number;
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
 * Represents the data table component.
 */
@Component({
  selector: 'arc-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablePaginationComponent],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent<T = Record<string, unknown>> implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tableWrapper', { static: false }) public tableWrapper!: ElementRef<HTMLDivElement>;

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

  // Deprecated outputs for backwards compatibility
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
  public hasHorizontalScroll = false;

  // Computed values
  public filteredData = computed(() => {
    let filtered = [...this.data];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((row) =>
        this.columns.some((col) => {
          if (col.filterable !== false) {
            const value = this.getCellValue(row, col.key);
            return value?.toString().toLowerCase().includes(term);
          }
          return false;
        }),
      );
    }

    return DataTableSortingUtil.sortData(
      filtered,
      this.sortColumn(),
      this.sortDirection(),
      (row, key) => this.getCellValue(row, key),
    );
  });

  public totalItems = computed(() => this.filteredData().length);

  public paginatedData = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData().slice(start, end);
  });

  public ngOnInit(): void {
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
    this.columns = this.columns.map((col) => ({ ...col, priority: col.priority || 'medium' }));
  }

  public ngAfterViewInit(): void {
    DataTableScrollUtil.setupScrollDetection({
      tableWrapper: this.tableWrapper,
      destroy$: this.destroy$,
      onScrollChange: (hasScroll) => (this.hasHorizontalScroll = hasScroll),
    });

    this.resizeObserver = DataTableScrollUtil.setupResizeObserver({
      tableWrapper: this.tableWrapper,
      destroy$: this.destroy$,
      onScrollChange: (hasScroll) => (this.hasHorizontalScroll = hasScroll),
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
  }

  public getCellValue(row: T, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = row;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  }

  public onSearch(): void {
    this.currentPage.set(0);
  }

  public clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  public handleSort(column: string): void {
    const currentState: SortState = {
      column: this.sortColumn(),
      direction: this.sortDirection(),
    };
    const newState = DataTableSortingUtil.handleSortClick(currentState, column);
    this.sortColumn.set(newState.column);
    this.sortDirection.set(newState.direction);

    const sortEvent = DataTableSortingUtil.createSortEvent(newState);
    if (sortEvent) {
      this.onSort.emit(sortEvent);
    }
  }

  public handlePageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize = event.pageSize;
    this.pageChange.emit(event);
  }

  public isSelected(row: T): boolean {
    return DataTableSelectionUtil.isSelected(row, this.selectedRows());
  }

  public isAllSelected(): boolean {
    return DataTableSelectionUtil.isAllSelected(this.paginatedData(), this.selectedRows());
  }

  public isSomeSelected(): boolean {
    return DataTableSelectionUtil.isSomeSelected(this.paginatedData(), this.selectedRows());
  }

  public toggleSelect(row: T): void {
    const selected = DataTableSelectionUtil.toggleSelect(row, this.selectedRows(), this.options.multiSelect ?? false);
    this.selectedRows.set(selected);
    this.onSelectionChange.emit(selected);
  }

  public toggleSelectAll(): void {
    const selected = DataTableSelectionUtil.toggleSelectAll(this.paginatedData(), this.selectedRows());
    this.selectedRows.set(selected);
    this.onSelectionChange.emit(selected);
  }

  public exportTableData(): void {
    this.exportData.emit();
    DataTableExportUtil.exportTableData(this.filteredData(), this.columns, (row, key) => this.getCellValue(row, key));
  }

  public getNextSortDirection(column: string): 'asc' | 'desc' | null {
    return DataTableSortingUtil.getNextSortDirection(this.sortColumn(), this.sortDirection(), column);
  }

  // Mobile responsiveness methods - delegated to utility classes
  public getColumnClasses = DataTableDisplayUtil.getColumnClasses;
  public getColumnLabel = DataTableDisplayUtil.getColumnLabel;

  public getTruncatedValue(row: T, column: TableColumn): string {
    return DataTableDisplayUtil.getTruncatedValue(this.getCellValue(row, column.key), column.truncateLength);
  }

  public shouldShowTooltip(row: T, column: TableColumn): boolean {
    return DataTableDisplayUtil.shouldShowTooltip(this.getCellValue(row, column.key), column.truncateLength);
  }
}
