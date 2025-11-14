import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

// Import configuration
import {
  TIMESHEET_VIEW_CONFIGS,
  TIMESHEET_BREAKPOINTS,
  TimesheetColumn,
  getResponsiveColumns,
  getViewConfig,
} from '../../../../lib/config/table-config';

// Import base table interfaces
import {
  SortEvent,
  PageEvent,
} from '../data-table/data-table.component';

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
 * TimesheetTable component - fully configuration-driven table component
 * Uses TIMESHEET_COLUMNS from table-config.ts for all rendering decisions
 */
@Component({
  selector: 'arc-timesheet-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="timesheet-table-container" [class.loading]="tableOptions().loading">
      <!-- Dynamic Toolbar based on configuration -->
      <div
        class="table-toolbar"
        *ngIf="tableOptions().showFilter || tableOptions().showExport"
      >
        <div class="toolbar-left">
          <!-- Dynamic search functionality -->
          <div class="search-box" *ngIf="tableOptions().showFilter">
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
              placeholder="搜索工时记录..."
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

          <!-- View type selector -->
          <select
            [(ngModel)]="currentViewType"
            (ngModelChange)="onViewTypeChange()"
            class="view-selector"
          >
            <option value="full">完整视图</option>
            <option value="summary">摘要视图</option>
            <option value="mobile">移动视图</option>
            <option value="bulkEdit">批量编辑</option>
          </select>
        </div>

        <div class="toolbar-right">
          <!-- Dynamic export button -->
          <button
            *ngIf="tableOptions().showExport"
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
            导出工时表
          </button>

          <!-- Bulk action buttons for bulk edit view -->
          <div
            class="bulk-actions"
            *ngIf="currentViewType === 'bulkEdit' && selectedEntries().length > 0"
          >
            <button
              (click)="bulkEdit.emit(selectedEntries())"
              class="bulk-btn edit-bulk-btn"
              type="button"
            >
              批量编辑 ({{ selectedEntries().length }})
            </button>
            <button
              (click)="bulkDelete.emit(selectedEntries())"
              class="bulk-btn delete-bulk-btn"
              type="button"
            >
              批量删除
            </button>
          </div>
        </div>
      </div>

      <!-- Responsive table wrapper -->
      <div
        class="table-wrapper"
        [class.mobile-view]="isMobileView()"
        [class.tablet-view]="isTabletView()"
        [class.desktop-view]="isDesktopView()"
      >
        <!-- Configuration-driven table -->
        <table
          class="timesheet-table"
          [class.striped]="tableOptions().striped"
          [class.bordered]="tableOptions().bordered"
          [class.hoverable]="tableOptions().hoverable"
        >
          <!-- Dynamic header generation from TIMESHEET_COLUMNS -->
          <thead>
            <tr>
              <!-- Selection column based on configuration -->
              <th *ngIf="tableOptions().selectable" class="checkbox-column">
                <input
                  *ngIf="tableOptions().multiSelect"
                  type="checkbox"
                  [checked]="isAllSelected()"
                  [indeterminate]="isSomeSelected()"
                  (change)="toggleSelectAll()"
                />
              </th>
              
              <!-- Dynamic columns from configuration -->
              <th
                *ngFor="let column of displayedColumns()"
                [style.width]="column.width"
                [style.text-align]="column.align || 'left'"
                [class.sortable]="column.sortable"
                [class]="getColumnClasses(column)"
                (click)="column.sortable ? handleSort(column.key) : null"
              >
                <div class="th-content">
                  <span>{{ getColumnLabel(column) }}</span>
                  <!-- Dynamic sort indicator -->
                  <div class="sort-indicator" *ngIf="column.sortable">
                    <svg
                      class="sort-icon"
                      [class.active-asc]="
                        sortColumn() === column.key && sortDirection() === 'asc'
                      "
                      [class.active-desc]="
                        sortColumn() === column.key && sortDirection() === 'desc'
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
                          sortColumn() !== column.key || sortDirection() === 'desc'
                        "
                      ></path>
                      <path
                        d="m7 9 5-5 5 5"
                        *ngIf="
                          sortColumn() === column.key && sortDirection() === 'asc'
                        "
                      ></path>
                    </svg>
                  </div>
                </div>
              </th>
              
              <!-- Actions column when needed -->
              <th *ngIf="showActions" class="actions-column">操作</th>
            </tr>
          </thead>
          
          <!-- Dynamic body generation from configuration -->
          <tbody>
            <tr
              *ngFor="let entry of paginatedData(); let i = index"
              [class.selected]="isSelected(entry)"
              [class.draft]="entry.status === 'draft'"
              [class.submitted]="entry.status === 'submitted'"
              [class.approved]="entry.status === 'approved'"
              [class.rejected]="entry.status === 'rejected'"
            >
              <!-- Selection cell -->
              <td *ngIf="tableOptions().selectable" class="checkbox-column">
                <input
                  type="checkbox"
                  [checked]="isSelected(entry)"
                  (change)="toggleSelect(entry)"
                />
              </td>
              
              <!-- Dynamic cells based on column configuration -->
              <td
                *ngFor="let column of displayedColumns()"
                [style.text-align]="column.align || 'left'"
                [class]="getColumnClasses(column)"
                [title]="shouldShowTooltip(entry, column) ? getCellValue(entry, column.key) : null"
              >
                <!-- Dynamic cell content based on column type and timesheet-specific formatting -->
                <span [ngSwitch]="column.type">
                  <!-- Boolean display for billable status -->
                  <span *ngSwitchCase="'boolean'">
                    <span
                      class="badge"
                      [class.badge-success]="getCellValue(entry, column.key)"
                      [class.badge-danger]="!getCellValue(entry, column.key)"
                    >
                      {{ getCellValue(entry, column.key) ? '可计费' : '不计费' }}
                    </span>
                  </span>
                  
                  <!-- Date formatting -->
                  <span *ngSwitchCase="'date'">
                    {{ getCellValue(entry, column.key) | date: 'yyyy-MM-dd' }}
                  </span>
                  
                  <!-- Number formatting for duration -->
                  <span *ngSwitchCase="'number'">
                    <span *ngIf="column.key === 'duration'" class="duration-display">
                      {{ formatDuration(getCellValue(entry, column.key)) }}
                    </span>
                    <span *ngIf="column.key !== 'duration'">
                      {{ getCellValue(entry, column.key) | number: '1.0-2' }}
                    </span>
                  </span>
                  
                  <!-- Status display with badges -->
                  <span *ngSwitchCase="'text'" [ngSwitch]="column.key">
                    <span *ngSwitchCase="'status'">
                      <span
                        class="status-badge"
                        [class.status-draft]="getCellValue(entry, column.key) === 'draft'"
                        [class.status-submitted]="getCellValue(entry, column.key) === 'submitted'"
                        [class.status-approved]="getCellValue(entry, column.key) === 'approved'"
                        [class.status-rejected]="getCellValue(entry, column.key) === 'rejected'"
                      >
                        {{ getStatusLabel(getCellValue(entry, column.key)) }}
                      </span>
                    </span>
                    
                    <!-- Time formatting for start/end times -->
                    <span *ngSwitchCase="'startTime'">
                      {{ formatTime(getCellValue(entry, column.key), column.timeFormat) }}
                    </span>
                    <span *ngSwitchCase="'endTime'">
                      {{ formatTime(getCellValue(entry, column.key), column.timeFormat) }}
                    </span>
                    
                    <!-- Default text with truncation -->
                    <span *ngSwitchDefault>
                      {{ getTruncatedValue(entry, column) }}
                    </span>
                  </span>
                </span>
              </td>
              
              <!-- Actions cell -->
              <td *ngIf="showActions" class="actions-column">
                <div class="action-buttons">
                  <button
                    (click)="viewEntry.emit(entry)"
                    class="action-btn view-btn"
                    title="查看详情"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button
                    (click)="editEntry.emit(entry)"
                    class="action-btn edit-btn"
                    title="编辑"
                    type="button"
                    [disabled]="entry.status === 'approved'"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    (click)="deleteEntry.emit(entry)"
                    class="action-btn delete-btn"
                    title="删除"
                    type="button"
                    [disabled]="entry.status === 'approved'"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div
          class="empty-state"
          *ngIf="paginatedData().length === 0 && !tableOptions().loading"
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <p>{{ tableOptions().emptyMessage || '暂无工时记录' }}</p>
        </div>

        <!-- Loading overlay -->
        <div class="loading-overlay" *ngIf="tableOptions().loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>

      <!-- Dynamic pagination based on configuration -->
      <div
        class="table-pagination"
        *ngIf="tableOptions().showPagination && totalPages() > 1"
      >
        <div class="pagination-info">
          显示 {{ startIndex() + 1 }} - {{ endIndex() }} 条，共 {{ totalItems() }} 条工时记录
        </div>

        <div class="pagination-controls">
          <select
            [(ngModel)]="pageSize"
            (ngModelChange)="onPageSizeChange()"
            class="page-size-select"
          >
            <option *ngFor="let size of tableOptions().pageSizeOptions" [value]="size">
              {{ size }} 条/页
            </option>
          </select>

          <button (click)="goToPage(0)" [disabled]="currentPage() === 0" class="page-btn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="11,17 6,12 11,7"></polyline>
              <polyline points="18,17 13,12 18,7"></polyline>
            </svg>
          </button>

          <button (click)="previousPage()" [disabled]="currentPage() === 0" class="page-btn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

          <button (click)="nextPage()" [disabled]="currentPage() === totalPages() - 1" class="page-btn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>

          <button (click)="goToPage(totalPages() - 1)" [disabled]="currentPage() === totalPages() - 1" class="page-btn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="13,17 18,12 13,7"></polyline>
              <polyline points="6,17 11,12 6,7"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./timesheet-table.component.scss'],
})
export class TimesheetTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Inputs
  @Input() data: TimesheetEntry[] = [];
  @Input() viewType: TimesheetViewType = 'full';
  @Input() showActions = true;
  @Input() customColumns?: TimesheetColumn[];

  // Outputs - timesheet-specific events
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() selectionChange = new EventEmitter<TimesheetEntry[]>();
  @Output() viewEntry = new EventEmitter<TimesheetEntry>();
  @Output() editEntry = new EventEmitter<TimesheetEntry>();
  @Output() deleteEntry = new EventEmitter<TimesheetEntry>();
  @Output() exportRequested = new EventEmitter<void>();
  @Output() bulkEdit = new EventEmitter<TimesheetEntry[]>();
  @Output() bulkDelete = new EventEmitter<TimesheetEntry[]>();
  @Output() viewChange = new EventEmitter<TimesheetViewType>();

  // State management
  searchTerm = '';
  pageSize = 25;
  currentPage = signal(0);
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc' | null>(null);
  selectedEntries = signal<TimesheetEntry[]>([]);
  screenWidth = signal(window.innerWidth);
  currentViewType: TimesheetViewType = 'full';

  // Configuration-driven computed properties
  displayedColumns = computed(() => {
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

  tableOptions = computed(() => {
    const viewConfig = getViewConfig(this.currentViewType);
    return viewConfig ? viewConfig.options : TIMESHEET_VIEW_CONFIGS.full.options;
  });

  // Data processing computed properties
  filteredData = computed(() => {
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
    const activeColumn = this.sortColumn();
    const activeDirection = this.sortDirection();

    if (activeColumn && activeDirection) {
      filtered.sort((a, b) => {
        const aVal = this.getCellValue(a, activeColumn);
        const bVal = this.getCellValue(b, activeColumn);

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return activeDirection === 'asc' ? comparison : -comparison;
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
    Math.min(this.startIndex() + this.pageSize, this.totalItems())
  );

  ngOnInit() {
    // Set initial view type and configuration
    this.currentViewType = this.viewType;
    this.pageSize = this.tableOptions().pageSize || 25;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Window resize handler for responsive behavior
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.screenWidth.set((event.target as Window).innerWidth);
  }

  // Configuration-driven helper methods
  getCellValue(entry: TimesheetEntry, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = entry;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  getColumnClasses(column: TimesheetColumn): string {
    const classes: string[] = [];

    if (column.priority) {
      classes.push(`priority-${column.priority}`);
    }

    // Add responsive classes based on configuration
    if (column.priority === 'high') {
      classes.push('column-primary');
    } else {
      classes.push('column-secondary');
    }

    // Add timesheet-specific classes
    if (column.bulkEditable) {
      classes.push('bulk-editable');
    }

    return classes.join(' ');
  }

  getColumnLabel(column: TimesheetColumn): string {
    // Use mobile label on small screens if available from configuration
    if (this.isMobileView() && column.mobileLabel) {
      return column.mobileLabel;
    }
    return column.label;
  }

  getTruncatedValue(entry: TimesheetEntry, column: TimesheetColumn): string {
    const value = this.getCellValue(entry, column.key);
    const text = String(value || '');

    // Use truncation settings from configuration
    if (column.truncateLength && text.length > column.truncateLength) {
      return text.substring(0, column.truncateLength) + '...';
    }

    return text;
  }

  shouldShowTooltip(entry: TimesheetEntry, column: TimesheetColumn): boolean {
    if (!column.truncateLength) return false;

    const value = this.getCellValue(entry, column.key);
    const text = String(value || '');

    return text.length > column.truncateLength;
  }

  // Responsive helper methods using configuration breakpoints
  isMobileView(): boolean {
    return this.screenWidth() <= TIMESHEET_BREAKPOINTS.mobile;
  }

  isTabletView(): boolean {
    return (
      this.screenWidth() > TIMESHEET_BREAKPOINTS.mobile &&
      this.screenWidth() <= TIMESHEET_BREAKPOINTS.tablet
    );
  }

  isDesktopView(): boolean {
    return this.screenWidth() > TIMESHEET_BREAKPOINTS.tablet;
  }

  // Timesheet-specific formatting methods
  formatDuration(duration: unknown): string {
    const hours = Number(duration || 0);
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (minutes === 0) {
      return `${wholeHours}小时`;
    }
    return `${wholeHours}小时${minutes}分钟`;
  }

  formatTime(time: unknown, format?: '12h' | '24h' | 'decimal'): string {
    const timeStr = String(time || '');
    if (!timeStr || timeStr === '') return '';

    // Default to 24h format for timesheet
    if (format === '12h') {
      // Convert to 12h format if needed
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    }

    return timeStr; // Default 24h format
  }

  getStatusLabel(status: unknown): string {
    const statusLabels: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已批准',
      rejected: '已拒绝',
    };
    return statusLabels[String(status)] || String(status);
  }

  // Event handlers
  onSearch() {
    this.currentPage.set(0);
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearch();
  }

  onViewTypeChange() {
    this.viewChange.emit(this.currentViewType);
    this.pageSize = this.tableOptions().pageSize || 25;
    this.currentPage.set(0);
  }

  handleSort(column: string) {
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

    this.sortChange.emit({
      column: this.sortColumn() ?? column,
      direction: this.sortDirection(),
    });
  }

  // Selection methods
  isSelected(entry: TimesheetEntry): boolean {
    return this.selectedEntries().some(selected => selected.id === entry.id);
  }

  isAllSelected(): boolean {
    const pageData = this.paginatedData();
    return pageData.length > 0 && pageData.every((entry) => this.isSelected(entry));
  }

  isSomeSelected(): boolean {
    const pageData = this.paginatedData();
    return pageData.some((entry) => this.isSelected(entry)) && !this.isAllSelected();
  }

  toggleSelect(entry: TimesheetEntry) {
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

  toggleSelectAll() {
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
    this.onSelectionChange.emit(selected);
  }

  // Pagination methods
  previousPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.emitPageChange();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.emitPageChange();
    }
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.emitPageChange();
  }

  onPageSizeChange() {
    this.currentPage.set(0);
    this.emitPageChange();
  }

  emitPageChange() {
    this.onPageChange.emit({
      pageIndex: this.currentPage(),
      pageSize: this.pageSize,
    });
  }

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

  // Export functionality
  exportData() {
    this.onExport.emit();
    // Default CSV export implementation for timesheet data
    const csv = this.convertToCSV(this.filteredData());
    this.downloadCSV(csv, `timesheet-export-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private convertToCSV(data: TimesheetEntry[]): string {
    if (data.length === 0) return '';

    // Use displayed columns for export
    const headers = this.displayedColumns().map((col) => col.label);
    const csvHeaders = headers.join(',');

    // Convert data rows
    const csvRows = data.map((entry) => {
      return this.displayedColumns()
        .map((col) => {
          let value = this.getCellValue(entry, col.key);
          
          // Format values based on column type
          if (col.type === 'boolean') {
            value = value ? '是' : '否';
          } else if (col.type === 'date') {
            value = new Date(String(value)).toLocaleDateString('zh-CN');
          } else if (col.key === 'duration') {
            value = this.formatDuration(value);
          } else if (col.key === 'status') {
            value = this.getStatusLabel(value);
          }

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
}
