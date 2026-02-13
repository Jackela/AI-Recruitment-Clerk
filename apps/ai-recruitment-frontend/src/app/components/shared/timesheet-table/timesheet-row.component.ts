import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TimesheetEntry } from './timesheet-table.component';
import { TimesheetCellComponent } from './timesheet-cell.component';

/**
 * TimesheetRowComponent - Handles individual row rendering
 */
@Component({
  selector: 'tr[arc-timesheet-row]',
  standalone: true,
  imports: [CommonModule, TimesheetCellComponent],
  template: `
    <!-- Selection cell -->
    <td *ngIf="selectable" class="checkbox-column">
      <input
        type="checkbox"
        [checked]="selected"
        (change)="toggleSelect.emit()"
      />
    </td>

    <!-- Dynamic cells based on column configuration -->
    <td
      *ngFor="let column of columns"
      arc-timesheet-cell
      [entry]="entry"
      [column]="column"
    ></td>

    <!-- Actions cell -->
    <td *ngIf="showActions" class="actions-column">
      <div class="action-buttons">
        <button
          (click)="view.emit(entry)"
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
          (click)="edit.emit(entry)"
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
          (click)="delete.emit(entry)"
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
  `,
  styleUrls: ['./timesheet-row.component.scss'],
})
export class TimesheetRowComponent {
  @Input({ required: true }) public entry!: TimesheetEntry;
  @Input({ required: true }) public columns!: unknown[];
  @Input() public selectable = false;
  @Input() public selected = false;
  @Input() public showActions = true;

  @Output() public toggleSelect = new EventEmitter<void>();
  @Output() public view = new EventEmitter<TimesheetEntry>();
  @Output() public edit = new EventEmitter<TimesheetEntry>();
  @Output() public delete = new EventEmitter<TimesheetEntry>();

  @HostBinding('class.selected') public get selectedClass(): boolean {
    return this.selected;
  }

  @HostBinding('class.draft') public get draftClass(): boolean {
    return this.entry.status === 'draft';
  }

  @HostBinding('class.submitted') public get submittedClass(): boolean {
    return this.entry.status === 'submitted';
  }

  @HostBinding('class.approved') public get approvedClass(): boolean {
    return this.entry.status === 'approved';
  }

  @HostBinding('class.rejected') public get rejectedClass(): boolean {
    return this.entry.status === 'rejected';
  }
}
