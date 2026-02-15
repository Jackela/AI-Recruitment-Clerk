import type {
  OnInit,
  OnDestroy} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

// Import configuration
import type {
  TimesheetColumn} from '../../../../lib/config/table-config';
import {
  TIMESHEET_VIEW_CONFIGS,
  TIMESHEET_BREAKPOINTS,
  getResponsiveColumns,
  getViewConfig,
} from '../../../../lib/config/table-config';

// Import base table interfaces
import type {
  SortEvent,
  PageEvent,
} from '../data-table/data-table.component';

// Import extracted components
import { TimesheetRowComponent } from './timesheet-row.component';
import { TimesheetToolbarComponent } from './timesheet-toolbar.component';
import { TimesheetPaginationComponent } from './timesheet-pagination.component';
import { TimesheetExportUtil } from './timesheet-export.util';

/**
 * Timesheet-specific data interface
 */
export interface TimesheetEntry {
  id?: string;
  date: string;
  project: string;
  task: string;
  startTime: string;
  endTime: string;
  duration: number;
  category: string;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
  [key: string]: unknown;
}

/**
 * Timesheet table view types
 */
export type TimesheetViewType = keyof typeof TIMESHEET_VIEW_CONFIGS;

/**
 * TimesheetTable component - configuration-driven table component
 * Uses TIMESHEET_COLUMNS from table-config.ts for all rendering decisions
 */
@Component({
  selector: 'arc-timesheet-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TimesheetRowComponent,
    TimesheetToolbarComponent,
    TimesheetPaginationComponent,
  ],
  templateUrl: './timesheet-table.component.html',
  styleUrls: ['./timesheet-table.component.scss'],
})
export class TimesheetTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Inputs
  @Input() public data: TimesheetEntry[] = [];
  @Input() public viewType: TimesheetViewType = 'full';
  @Input() public showActions = true;
  @Input() public customColumns?: TimesheetColumn[];

  // Outputs - timesheet-specific events
  @Output() public sortChange = new EventEmitter<SortEvent>();
  @Output() public pageChange = new EventEmitter<PageEvent>();
  @Output() public selectionChange = new EventEmitter<TimesheetEntry[]>();
  @Output() public viewEntry = new EventEmitter<TimesheetEntry>();
  @Output() public editEntry = new EventEmitter<TimesheetEntry>();
  @Output() public deleteEntry = new EventEmitter<TimesheetEntry>();
  @Output() public exportData = new EventEmitter<void>();
  @Output() public bulkEdit = new EventEmitter<TimesheetEntry[]>();
  @Output() public bulkDelete = new EventEmitter<TimesheetEntry[]>();
  @Output() public viewChange = new EventEmitter<TimesheetViewType>();

  /** @deprecated Use sortChange instead */ @Output() public onSort = this.sortChange;
  /** @deprecated Use pageChange instead */ @Output() public onPageChangeDeprecated = this.pageChange;
  /** @deprecated Use selectionChange instead */ @Output() public onSelectionChange = this.selectionChange;
  /** @deprecated Use viewEntry instead */ @Output() public onView = this.viewEntry;
  /** @deprecated Use editEntry instead */ @Output() public onEdit = this.editEntry;
  /** @deprecated Use deleteEntry instead */ @Output() public onDelete = this.deleteEntry;
  /** @deprecated Use exportData instead */ @Output() public onExport = this.exportData;
  /** @deprecated Use bulkEdit instead */ @Output() public onBulkEdit = this.bulkEdit;
  /** @deprecated Use bulkDelete instead */ @Output() public onBulkDelete = this.bulkDelete;
  /** @deprecated Use viewChange instead */ @Output() public onViewChange = this.viewChange;

  // State management
  public searchTerm = '';
  public pageSize = 25;
  public currentPage = signal(0);
  public sortColumn = signal<string | null>(null);
  public sortDirection = signal<'asc' | 'desc' | null>(null);
  public selectedEntries = signal<TimesheetEntry[]>([]);
  public screenWidth = signal(window.innerWidth);
  public currentViewType: TimesheetViewType = 'full';

  // Configuration-driven computed properties
  public displayedColumns = computed(() => {
    // Use custom columns if provided, otherwise use responsive columns from configuration
    if (this.customColumns) {
      return this.customColumns;
    }

    // Use view-specific columns or responsive columns
    const viewConfig = getViewConfig(this.currentViewType);
    if (viewConfig) {
      return viewConfig.columns as TimesheetColumn[];
    }

    // Fallback to responsive columns based on screen width
    return getResponsiveColumns(this.screenWidth());
  });

  public tableOptions = computed(() => {
    const viewConfig = getViewConfig(this.currentViewType);
    return viewConfig ? viewConfig.options : TIMESHEET_VIEW_CONFIGS.full.options;
  });

  // Data processing computed properties
  public filteredData = computed(() => {
    let filtered = [...this.data];

    // Apply search filter based on filterable columns from configuration
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((entry) => {
        return this.displayedColumns().some((col) => {
          if (col.filterable !== false) {
            const value = this.getCellValue(entry, col.key);
            return value?.toString().toLowerCase().includes(term);
          }
          return false;
        });
      });
    }

    // Apply sorting based on sortable configuration
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

  public ngOnInit(): void {
    // Set initial view type and configuration
    this.currentViewType = this.viewType;
    this.pageSize = this.tableOptions().pageSize || 25;
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Window resize handler for responsive behavior
  @HostListener('window:resize', ['$event'])
  public onResize(event: Event): void {
    this.screenWidth.set((event.target as Window).innerWidth);
  }

  // Configuration-driven helper methods
  public getCellValue(entry: TimesheetEntry, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = entry;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  public getColumnHeaderClasses(column: TimesheetColumn): string {
    const classes: string[] = [];

    if (column.priority) {
      classes.push(`priority-${column.priority}`);
    }

    if (column.priority === 'high') {
      classes.push('column-primary');
    } else {
      classes.push('column-secondary');
    }

    return classes.join(' ');
  }

  public getColumnHeaderLabel(column: TimesheetColumn): string {
    // Use mobile label on small screens if available from configuration
    if (this.isMobileView() && column.mobileLabel) {
      return column.mobileLabel;
    }
    return column.label;
  }

  // Responsive helper methods using configuration breakpoints
  public isMobileView(): boolean {
    return this.screenWidth() <= TIMESHEET_BREAKPOINTS.mobile;
  }

  public isTabletView(): boolean {
    return (
      this.screenWidth() > TIMESHEET_BREAKPOINTS.mobile &&
      this.screenWidth() <= TIMESHEET_BREAKPOINTS.tablet
    );
  }

  public isDesktopView(): boolean {
    return this.screenWidth() > TIMESHEET_BREAKPOINTS.tablet;
  }

  // Event handlers
  public onSearch(): void {
    this.currentPage.set(0);
  }

  public onViewTypeChange(): void {
    this.viewChange.emit(this.currentViewType);
    this.pageSize = this.tableOptions().pageSize || 25;
    this.currentPage.set(0);
  }

  public handleSort(column: string): void {
    // Find column configuration to check if sortable
    const columnConfig = this.displayedColumns().find(col => col.key === column);
    if (!columnConfig?.sortable) return;

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
      this.sortChange.emit({
        column: currentSortColumn,
        direction: this.sortDirection(),
      });
    }
  }

  // Selection methods
  public isSelected(entry: TimesheetEntry): boolean {
    return this.selectedEntries().some(selected => selected.id === entry.id);
  }

  public isAllSelected(): boolean {
    const pageData = this.paginatedData();
    return pageData.length > 0 && pageData.every((entry) => this.isSelected(entry));
  }

  public isSomeSelected(): boolean {
    const pageData = this.paginatedData();
    return pageData.some((entry) => this.isSelected(entry)) && !this.isAllSelected();
  }

  public toggleSelect(entry: TimesheetEntry): void {
    if (!this.tableOptions().selectable) return;

    const selected = [...this.selectedEntries()];
    const index = selected.findIndex(s => s.id === entry.id);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      if (this.tableOptions().multiSelect) {
        selected.push(entry);
      } else {
        selected.length = 0;
        selected.push(entry);
      }
    }

    this.selectedEntries.set(selected);
    this.selectionChange.emit(selected);
  }

  public toggleSelectAll(): void {
    if (!this.tableOptions().selectable) return;

    const pageData = this.paginatedData();
    const selected = [...this.selectedEntries()];

    if (this.isAllSelected()) {
      // Deselect all on current page
      pageData.forEach((entry) => {
        const index = selected.findIndex(s => s.id === entry.id);
        if (index > -1) {
          selected.splice(index, 1);
        }
      });
    } else {
      // Select all on current page
      pageData.forEach((entry) => {
        if (!selected.some(s => s.id === entry.id)) {
          selected.push(entry);
        }
      });
    }

    this.selectedEntries.set(selected);
    this.selectionChange.emit(selected);
  }

  // Pagination methods
  public handlePageChange(event: { pageIndex: number; pageSize: number }): void {
    this.currentPage.set(event.pageIndex);
    if (event.pageSize !== this.pageSize) {
      this.pageSize = event.pageSize;
      this.currentPage.set(0);
    }
    this.pageChange.emit(event);
  }

  public handlePageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage.set(0);
    this.pageChange.emit({
      pageIndex: 0,
      pageSize: this.pageSize,
    });
  }

  // Export functionality
  public exportDataCsv(): void {
    this.exportData.emit();
    TimesheetExportUtil.exportData(this.filteredData(), this.displayedColumns());
  }
}
