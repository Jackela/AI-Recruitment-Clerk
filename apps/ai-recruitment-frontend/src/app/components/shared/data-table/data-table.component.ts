import type {
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  HostListener,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import type { PageEvent } from './data-table-pagination.component';
import { DataTablePaginationComponent } from './data-table-pagination.component';
import {
  DataTableExportUtil,
  DataTableDisplayUtil,
} from './data-table-export.util';
import {
  DataTableSortingUtil,
  type SortState,
} from './data-table-sorting.util';
import { DataTableSelectionUtil } from './data-table-selection.util';
import { DataTableScrollUtil } from './data-table-scroll.util';

// Re-export PageEvent for consumers
export type { PageEvent } from './data-table-pagination.component';

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
  imports: [
    CommonModule,
    FormsModule,
    DataTablePaginationComponent,
    TranslatePipe,
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],

  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @Input() public tableTitle?: string;

  // Unique IDs for accessibility
  public readonly searchId = `search-${Math.random().toString(36).substr(2, 9)}`;

  @Output() public sortChange = new EventEmitter<SortEvent>();
  @Output() public pageChange = new EventEmitter<PageEvent>();
  @Output() public selectionChange = new EventEmitter<T[]>();
  @Output() public viewItem = new EventEmitter<T>();
  @Output() public editItem = new EventEmitter<T>();
  @Output() public deleteItem = new EventEmitter<T>();
  @Output() public exportData = new EventEmitter<void>();

  // Deprecated outputs for backwards compatibility
  /** @deprecated Use sortChange instead */ @Output() public onSort =
    this.sortChange;
  /** @deprecated Use pageChange instead */ @Output() public onPageChange =
    this.pageChange;
  /** @deprecated Use selectionChange instead */ @Output()
  public onSelectionChange = this.selectionChange;
  /** @deprecated Use viewItem instead */ @Output() public onView =
    this.viewItem;
  /** @deprecated Use editItem instead */ @Output() public onEdit =
    this.editItem;
  /** @deprecated Use deleteItem instead */ @Output() public onDelete =
    this.deleteItem;
  /** @deprecated Use exportData instead */ @Output() public onExport =
    this.exportData;

  // State
  public searchTerm = '';
  public pageSize = 10;
  public currentPage = signal(0);
  public sortColumn = signal<string | null>(null);
  public sortDirection = signal<'asc' | 'desc' | null>(null);
  public selectedRows = signal<T[]>([]);
  public hasHorizontalScroll = false;

  // Keyboard Navigation State
  public focusedRowIndex = signal<number>(-1);
  public focusedColumnIndex = signal<number>(-1);
  public isKeyboardActive = signal<boolean>(false);

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
    this.columns = this.columns.map((col) => ({
      ...col,
      priority: col.priority || 'medium',
    }));
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
      this.sortChange.emit(sortEvent);
    }
  }

  public getAriaSort(
    column: TableColumn,
  ): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortable) return null;
    if (this.sortColumn() !== column.key) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
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
    return DataTableSelectionUtil.isAllSelected(
      this.paginatedData(),
      this.selectedRows(),
    );
  }

  public isSomeSelected(): boolean {
    return DataTableSelectionUtil.isSomeSelected(
      this.paginatedData(),
      this.selectedRows(),
    );
  }

  public toggleSelect(row: T): void {
    const selected = DataTableSelectionUtil.toggleSelect(
      row,
      this.selectedRows(),
      this.options.multiSelect ?? false,
    );
    this.selectedRows.set(selected);
    this.onSelectionChange.emit(selected);
  }

  public toggleSelectAll(): void {
    const selected = DataTableSelectionUtil.toggleSelectAll(
      this.paginatedData(),
      this.selectedRows(),
    );
    this.selectedRows.set(selected);
    this.onSelectionChange.emit(selected);
  }

  public exportTableData(): void {
    this.exportData.emit();
    DataTableExportUtil.exportTableData(
      this.filteredData(),
      this.columns,
      (row, key) => this.getCellValue(row, key),
    );
  }

  public getNextSortDirection(column: string): 'asc' | 'desc' | null {
    return DataTableSortingUtil.getNextSortDirection(
      this.sortColumn(),
      this.sortDirection(),
      column,
    );
  }

  // Mobile responsiveness methods - delegated to utility classes
  public getColumnClasses = DataTableDisplayUtil.getColumnClasses;
  public getColumnLabel = DataTableDisplayUtil.getColumnLabel;

  public getTruncatedValue(row: T, column: TableColumn): string {
    return DataTableDisplayUtil.getTruncatedValue(
      this.getCellValue(row, column.key),
      column.truncateLength,
    );
  }

  public shouldShowTooltip(row: T, column: TableColumn): boolean {
    return DataTableDisplayUtil.shouldShowTooltip(
      this.getCellValue(row, column.key),
      column.truncateLength,
    );
  }

  // Keyboard Navigation Methods
  public onTableFocus(): void {
    this.isKeyboardActive.set(true);
    if (this.focusedRowIndex() === -1 && this.paginatedData().length > 0) {
      this.focusedRowIndex.set(0);
      this.focusedColumnIndex.set(this.options.selectable ? -1 : 0);
    }
  }

  public onTableBlur(): void {
    this.isKeyboardActive.set(false);
    this.focusedRowIndex.set(-1);
    this.focusedColumnIndex.set(-1);
  }

  public isCellFocused(rowIndex: number, colIndex: number): boolean {
    return (
      this.isKeyboardActive() &&
      this.focusedRowIndex() === rowIndex &&
      this.focusedColumnIndex() === colIndex
    );
  }

  public isRowFocused(rowIndex: number): boolean {
    return this.isKeyboardActive() && this.focusedRowIndex() === rowIndex;
  }

  @HostListener('keydown', ['$event'])
  public handleTableKeyboardEvent(event: KeyboardEvent): void {
    const paginatedData = this.paginatedData();
    const totalCols =
      this.columns.length +
      (this.options.selectable ? 1 : 0) +
      (this.showActions ? 1 : 0);
    const currentRow = this.focusedRowIndex();
    const currentCol = this.focusedColumnIndex();

    switch (event.key) {
      case 'ArrowDown':
        if (currentRow < paginatedData.length - 1) {
          this.focusedRowIndex.set(currentRow + 1);
          event.preventDefault();
        }
        break;

      case 'ArrowUp':
        if (currentRow > 0) {
          this.focusedRowIndex.set(currentRow - 1);
          event.preventDefault();
        }
        break;

      case 'ArrowRight':
        if (currentCol < totalCols - 1) {
          this.focusedColumnIndex.set(currentCol + 1);
          event.preventDefault();
        }
        break;

      case 'ArrowLeft':
        if (currentCol > (this.options.selectable ? -1 : 0)) {
          this.focusedColumnIndex.set(currentCol - 1);
          event.preventDefault();
        }
        break;

      case 'Tab':
        // Tab navigation - move to next/previous cell
        if (event.shiftKey) {
          // Shift+Tab - move backward
          if (currentCol > (this.options.selectable ? -1 : 0)) {
            this.focusedColumnIndex.set(currentCol - 1);
          } else if (currentRow > 0) {
            this.focusedRowIndex.set(currentRow - 1);
            this.focusedColumnIndex.set(totalCols - 1);
          }
        } else {
          // Tab - move forward
          if (currentCol < totalCols - 1) {
            this.focusedColumnIndex.set(currentCol + 1);
          } else if (currentRow < paginatedData.length - 1) {
            this.focusedRowIndex.set(currentRow + 1);
            this.focusedColumnIndex.set(this.options.selectable ? -1 : 0);
          }
        }
        event.preventDefault();
        break;

      case 'Enter':
        this.handleEnterKey(currentRow, currentCol);
        event.preventDefault();
        break;

      case ' ':
      case 'Spacebar':
        this.handleSpaceKey(currentRow, currentCol, paginatedData);
        event.preventDefault();
        break;

      case 'Home':
        this.focusedColumnIndex.set(this.options.selectable ? -1 : 0);
        event.preventDefault();
        break;

      case 'End':
        this.focusedColumnIndex.set(totalCols - 1);
        event.preventDefault();
        break;

      case 'PageDown':
        if (
          this.options.showPagination &&
          currentRow < paginatedData.length - 1
        ) {
          const nextPage = Math.min(
            this.currentPage() + 1,
            Math.ceil(this.totalItems() / this.pageSize) - 1,
          );
          if (nextPage !== this.currentPage()) {
            this.currentPage.set(nextPage);
            this.focusedRowIndex.set(0);
            this.handlePageChange({
              pageIndex: nextPage,
              pageSize: this.pageSize,
              length: this.totalItems(),
            });
          }
        }
        event.preventDefault();
        break;

      case 'PageUp':
        if (this.options.showPagination && this.currentPage() > 0) {
          const prevPage = this.currentPage() - 1;
          this.currentPage.set(prevPage);
          this.focusedRowIndex.set(this.pageSize - 1);
          this.handlePageChange({
            pageIndex: prevPage,
            pageSize: this.pageSize,
            length: this.totalItems(),
          });
        }
        event.preventDefault();
        break;

      case 'Delete':
      case 'Backspace':
        if (currentRow >= 0 && currentRow < paginatedData.length) {
          this.deleteItem.emit(paginatedData[currentRow]);
          event.preventDefault();
        }
        break;

      case 'Escape':
        this.onTableBlur();
        event.preventDefault();
        break;
    }
  }

  private handleEnterKey(rowIndex: number, colIndex: number): void {
    const paginatedData = this.paginatedData();
    if (rowIndex < 0 || rowIndex >= paginatedData.length) return;

    const row = paginatedData[rowIndex];
    const checkboxOffset = this.options.selectable ? 1 : 0;

    // Check if it's the checkbox column
    if (this.options.selectable && colIndex === -1) {
      this.toggleSelect(row);
      return;
    }

    // Check if it's the actions column
    const actionColIndex = this.columns.length + checkboxOffset;
    if (
      this.showActions &&
      colIndex === actionColIndex - (this.options.selectable ? 0 : 0)
    ) {
      // View action is triggered by Enter on actions column
      this.viewItem.emit(row);
      return;
    }

    // Regular cell - trigger view action
    if (colIndex >= 0 && colIndex < this.columns.length) {
      this.viewItem.emit(row);
    }
  }

  private handleSpaceKey(
    rowIndex: number,
    colIndex: number,
    paginatedData: T[],
  ): void {
    if (rowIndex < 0 || rowIndex >= paginatedData.length) return;

    const row = paginatedData[rowIndex];

    // Space selects the row if selectable is enabled
    if (
      this.options.selectable &&
      (colIndex === -1 || this.options.multiSelect)
    ) {
      this.toggleSelect(row);
    }
  }

  public getCellTabindex(rowIndex: number, colIndex: number): number {
    return this.isCellFocused(rowIndex, colIndex) ? 0 : -1;
  }
}
