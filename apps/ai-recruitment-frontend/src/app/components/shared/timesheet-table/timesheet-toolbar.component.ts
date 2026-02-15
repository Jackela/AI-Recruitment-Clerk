import { Component, Input, Output, EventEmitter, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { TimesheetViewType } from './timesheet-table.component';

/**
 * TimesheetToolbarComponent - Handles toolbar with search, view selector, and export
 */
@Component({
  selector: 'arc-timesheet-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-toolbar" *ngIf="showFilter || showExport">
      <div class="toolbar-left">
        <!-- Dynamic search functionality -->
        <div class="search-box" *ngIf="showFilter">
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
            (ngModelChange)="search.emit(searchTerm)"
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
          [(ngModel)]="viewType"
          (ngModelChange)="viewTypeChange.emit(viewType)"
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
          *ngIf="showExport"
          (click)="export.emit()"
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
        <div class="bulk-actions" *ngIf="viewType === 'bulkEdit' && selectedCount > 0">
          <button
            (click)="bulkEdit.emit()"
            class="bulk-btn edit-bulk-btn"
            type="button"
          >
            批量编辑 ({{ selectedCount }})
          </button>
          <button
            (click)="bulkDelete.emit()"
            class="bulk-btn delete-bulk-btn"
            type="button"
          >
            批量删除
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./timesheet-toolbar.component.scss'],
})
export class TimesheetToolbarComponent {
  @Input() public showFilter = false;
  @Input() public showExport = false;
  @Input() public selectedCount = 0;
  public viewType = model<TimesheetViewType>('full');
  public searchTerm = model('');

  @Output() public search = new EventEmitter<string>();
  @Output() public clearSearchClick = new EventEmitter<void>();
  @Output() public viewTypeChange = new EventEmitter<TimesheetViewType>();
  @Output() public export = new EventEmitter<void>();
  @Output() public bulkEdit = new EventEmitter<void>();
  @Output() public bulkDelete = new EventEmitter<void>();

  public clearSearch(): void {
    this.searchTerm.set('');
    this.search.emit('');
  }
}
